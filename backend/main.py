# main.py - extended with WebSockets, ChatMessage, UserPoints, leaderboard, placeholders
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, func
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from sqlalchemy.sql import func as sqlfunc
from sqlalchemy.exc import IntegrityError
from sqlalchemy import cast, Date
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from fastapi.encoders import jsonable_encoder

# ---------------------
# Database setup
# ---------------------
DB_FILE = "hackjam.db"
engine = create_engine(f"sqlite:///./{DB_FILE}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

# ---------------------
# Models
# ---------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String)

    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")

    # Notifications
    received_notifications = relationship(
        "Notification",
        foreign_keys="[Notification.recipient_id]",
        back_populates="recipient",
        cascade="all, delete-orphan"
    )
    sent_notifications = relationship(
        "Notification",
        foreign_keys="[Notification.actor_id]",
        back_populates="actor",
        cascade="all, delete-orphan"
    )

    # chat messages sent/received (via ChatMessage model)
    sent_messages = relationship("ChatMessage", foreign_keys="[ChatMessage.sender_id]", back_populates="sender", cascade="all, delete-orphan")
    received_messages = relationship("ChatMessage", foreign_keys="[ChatMessage.recipient_id]", back_populates="recipient", cascade="all, delete-orphan")
    points = relationship("UserPoints", uselist=False, back_populates="user", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(String)
    category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())
    user_id = Column(Integer, ForeignKey("users.id"))
    author = relationship("User", back_populates="posts")
    post_likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

class PostLike(Base):
    __tablename__ = "post_likes"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())
    post = relationship("Post", back_populates="post_likes")
    user = relationship("User", back_populates="likes")
    __table_args__ = (UniqueConstraint('post_id', 'user_id', name='unique_user_like'),)

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())
    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    recipient_id = Column(Integer, ForeignKey("users.id"))  # Who receives it
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who triggered it
    notification_type = Column(String)  # e.g. "like", "comment", "share", "message", "forum"
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    message = Column(String)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())

    recipient = relationship("User", back_populates="received_notifications", foreign_keys=[recipient_id])
    actor = relationship("User", back_populates="sent_notifications", foreign_keys=[actor_id])

# ChatMessage (persistent)
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())
    is_read = Column(Integer, default=0)

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")

# ForumMessage (separate from posts)
class ForumMessage(Base):
    __tablename__ = "forum_messages"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())
    author = relationship("User")

# Points for gamification
class UserPoints(Base):
    __tablename__ = "user_points"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    points = Column(Integer, default=0)
    last_updated = Column(DateTime(timezone=True), server_default=sqlfunc.now(), onupdate=sqlfunc.now())

    user = relationship("User", back_populates="points")

# Create tables (idempotent)
Base.metadata.create_all(bind=engine)

# ---------------------
# Pydantic Schemas
# ---------------------
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    token: str
    user: UserOut

class TokenOut(BaseModel):
    access_token: str
    token_type: str

class FeedPostOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    likes: int
    comments: int
    author: UserOut
    created_at: datetime
    image_url: str
    class Config:
        from_attributes = True

class PostCreate(BaseModel):
    title: str
    content: str
    category: str

class PostOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    likes: int
    author: UserOut
    created_at: datetime
    image_url: str
    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    post_id: int
    content: str

class CommentOut(BaseModel):
    id: int
    post_id: int
    user_id: int
    content: str
    created_at: datetime
    author_display: str  # will be "Anonymous"
    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    notification_type: str
    message: str
    actor_id: Optional[int] = None
    post_id: Optional[int] = None
    comment_id: Optional[int] = None
    is_read: int
    created_at: datetime

class ChatMessageCreate(BaseModel):
    recipient_id: int
    content: str

class ChatMessageOut(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content: str
    created_at: datetime

class ForumMessageCreate(BaseModel):
    content: str

class ForumMessageOut(BaseModel):
    id: int
    content: str
    author: UserOut
    created_at: datetime
    class Config:
        from_attributes = True

# ---------------------
# Auth setup
# ---------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
SECRET_KEY = os.getenv("SECRET_KEY", "hackjam2025")  # set in env for prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ---------------------
# App and Middleware
# ---------------------
app = FastAPI(title="HackJam API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------
# Helpers & dependencies
# ---------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ---------------------
# Small profanity list (can expand)
# ---------------------
PROFANITY = {
    "fuck", "shit", "bitch", "asshole", "bastard", "nigger", "cunt", "damn"
}
def contains_profanity(text: str) -> bool:
    if not text:
        return False
    lowered = text.lower()
    words = [w for w in ''.join([c if c.isalpha() else ' ' for c in lowered]).split()]
    return any(w in PROFANITY for w in words)

# ---------------------
# Notification helper
# ---------------------
def create_notification_for(db: Session, recipient_id: int, actor_id: Optional[int], ntype: str, message: str, post_id: Optional[int]=None, comment_id: Optional[int]=None):
    # avoid creating notification for self-action
    if recipient_id == actor_id:
        return
    n = Notification(
        recipient_id=recipient_id,
        actor_id=actor_id,
        notification_type=ntype,
        post_id=post_id,
        comment_id=comment_id,
        message=message,
        is_read=0
    )
    db.add(n)
    db.commit()

# ---------------------
# Placeholder image helper
# ---------------------
def placeholder_for_category(category: Optional[str]) -> str:
    # deterministic placeholder using picsum seed - replace with your own CDN if desired
    seed = (category or "default").replace(" ", "_").lower()
    return f"https://picsum.photos/seed/{seed}/800/450"

# ---------------------
# Real-time connection stores (in-memory)
# ---------------------
# user_id -> list[WebSocket]
notification_connections: Dict[int, List[WebSocket]] = {}
chat_connections: Dict[int, List[WebSocket]] = {}
# forum room name -> list[WebSocket]
forum_rooms: Dict[str, List[WebSocket]] = {}

def add_connection(store: Dict[int, List[WebSocket]], user_id: int, ws: WebSocket):
    store.setdefault(user_id, []).append(ws)

def remove_connection(store: Dict[int, List[WebSocket]], user_id: int, ws: WebSocket):
    conns = store.get(user_id)
    if not conns:
        return
    try:
        conns.remove(ws)
    except ValueError:
        pass
    if not conns:
        store.pop(user_id, None)

# ---------------------
# AUTH Routes (public)
# ---------------------
@app.get("/")
def read_root():
    return {"message": "Welcome to HackJam 2025!"}

@app.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if len(user.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = pwd_context.hash(user.password)
    u = User(email=user.email, name=user.name, password_hash=hashed)
    db.add(u)
    db.commit()
    db.refresh(u)
    # ensure points row exists
    if not db.query(UserPoints).filter(UserPoints.user_id == u.id).first():
        db.add(UserPoints(user_id=u.id, points=0))
        db.commit()
    return u

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

@app.post("/login", response_model=AuthResponse)
def login_json(login: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login.email).first()
    if not user or not pwd_context.verify(login.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user.email}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {
        "token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }

# ---------------------
# Authenticated endpoints
# ---------------------
@app.get("/posts", response_model=List[PostOut])
def get_posts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    posts = db.query(Post).order_by(Post.created_at.desc()).all()
    out = []
    for p in posts:
        likes_count = db.query(func.count(PostLike.id)).filter(PostLike.post_id == p.id).scalar() or 0
        out.append({
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "category": p.category,
            "likes": likes_count,
            "author": {"id": p.author.id, "email": p.author.email, "name": p.author.name},
            "created_at": p.created_at,
            "image_url": placeholder_for_category(p.category)
        })
    return out

@app.post("/post", response_model=PostOut)
def create_post(post: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = Post(**post.dict(), user_id=current_user.id)
    db.add(p)
    db.commit()
    db.refresh(p)
    # award points for creating post
    pts = db.query(UserPoints).filter(UserPoints.user_id == current_user.id).first()
    if not pts:
        pts = UserPoints(user_id=current_user.id, points=5)
        db.add(pts)
    else:
        pts.points = (pts.points or 0) + 5
    db.commit()
    return {
        "id": p.id,
        "title": p.title,
        "content": p.content,
        "category": p.category,
        "likes": 0,
        "author": {"id": current_user.id, "email": current_user.email, "name": current_user.name},
        "created_at": p.created_at,
        "image_url": placeholder_for_category(p.category)
    }

@app.get("/posts/highlights", response_model=List[PostOut])
def get_highlights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    posts_with_likes = (
        db.query(Post, func.count(PostLike.id).label("likes"))
          .outerjoin(PostLike, Post.id == PostLike.post_id)
          .group_by(Post.id)
          .order_by(func.count(PostLike.id).desc())
          .limit(4)
          .all()
    )
    out = []
    for p, likes_count in posts_with_likes:
        out.append({
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "category": p.category,
            "likes": likes_count or 0,
            "author": {"id": p.author.id, "email": p.author.email, "name": p.author.name},
            "created_at": p.created_at,
            "image_url": placeholder_for_category(p.category)
        })
    return out

# ------------------------------------
# Feed Endpoint + Category Filtering
# ------------------------------------
@app.get("/feed", response_model=List[FeedPostOut])
def get_feed(
    category: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        db.query(
            Post,
            func.count(PostLike.id).label("likes_count"),
            func.count(Comment.id).label("comments_count")
        )
        .outerjoin(PostLike, Post.id == PostLike.post_id)
        .outerjoin(Comment, Post.id == Comment.post_id)
        .group_by(Post.id)
        .order_by(Post.created_at.desc())
    )
    if category:
        query = query.filter(Post.category == category)
    posts_with_counts = query.limit(limit).offset(offset).all()

    feed = []
    for post, likes_count, comments_count in posts_with_counts:
        feed.append({
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "category": post.category,
            "likes": likes_count,
            "comments": comments_count,
            "author": {
                "id": post.author.id,
                "email": post.author.email,
                "name": post.author.name
            },
            "created_at": post.created_at,
            "image_url": placeholder_for_category(post.category)
        })
    return feed

# -----------------------
# Post & Like Endpoints
# -----------------------
@app.post("/posts/{post_id}/like")
def like_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    new_like = PostLike(post_id=post_id, user_id=current_user.id)
    db.add(new_like)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=403, detail="Already liked this post")

    # award points to post owner
    if post.user_id != current_user.id:
        pts = db.query(UserPoints).filter(UserPoints.user_id == post.user_id).first()
        if not pts:
            pts = UserPoints(user_id=post.user_id, points=2)
            db.add(pts)
        else:
            pts.points = (pts.points or 0) + 2
        db.commit()

    # create notification for post owner (if liker != owner)
    try:
        create_notification_for(db, recipient_id=post.user_id, actor_id=current_user.id, ntype="like",
                                message=f"{current_user.name} liked your post", post_id=post.id)
        # push via websocket if connected
        conns = notification_connections.get(post.user_id, [])
        payload = {
            "type": "notification",
            "notification": {
                "notification_type": "like",
                "message": f"{current_user.name} liked your post",
                "actor_id": current_user.id,
                "post_id": post.id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }
        for ws in list(conns):
            try:
                ws.send_json(payload)
            except Exception:
                # client may have disconnected; ignore
                pass
    except Exception:
        db.rollback()

    return {"message": "Post liked!"}

# -----------------------
# Comment Endpoints (with profanity filter + anonymous display)
# -----------------------
@app.post("/comments", response_model=CommentOut)
def create_comment(comment: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # profanity check
    if contains_profanity(comment.content):
        raise HTTPException(status_code=400, detail="Comment contains inappropriate language")

    c = Comment(post_id=comment.post_id, user_id=current_user.id, content=comment.content)
    db.add(c)
    db.commit()
    db.refresh(c)

    # award points to post owner for receiving comment
    if post.user_id != current_user.id:
        pts = db.query(UserPoints).filter(UserPoints.user_id == post.user_id).first()
        if not pts:
            pts = UserPoints(user_id=post.user_id, points=1)
            db.add(pts)
        else:
            pts.points = (pts.points or 0) + 1
        db.commit()

    # create notification for post owner (if commenter != owner)
    try:
        create_notification_for(db, recipient_id=post.user_id, actor_id=current_user.id, ntype="comment",
                                message=f"{current_user.name} commented on your post", post_id=post.id, comment_id=c.id)
        conns = notification_connections.get(post.user_id, [])
        payload = {
            "type": "notification",
            "notification": {
                "notification_type": "comment",
                "message": f"{current_user.name} commented on your post",
                "actor_id": current_user.id,
                "post_id": post.id,
                "comment_id": c.id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }
        for ws in list(conns):
            try:
                ws.send_json(payload)
            except Exception:
                pass
    except Exception:
        db.rollback()

    # Return anonymous author_display
    return {
        "id": c.id,
        "post_id": c.post_id,
        "user_id": c.user_id,
        "content": c.content,
        "created_at": c.created_at,
        "author_display": "Anonymous"
    }

@app.get("/posts/{post_id}/comments", response_model=List[CommentOut])
def get_comments(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.desc())
        .all()
    )
    out = []
    for c in comments:
        out.append({
            "id": c.id,
            "post_id": c.post_id,
            "user_id": c.user_id,
            "content": c.content,
            "created_at": c.created_at,
            "author_display": "Anonymous"
        })
    return out

@app.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this comment")
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}

# ---------------------
# Forum Endpoints (REST + WebSocket room)
# ---------------------
@app.get("/forum/messages", response_model=List[ForumMessageOut])
def get_forum_messages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    messages = db.query(ForumMessage).order_by(ForumMessage.created_at.desc()).all()
    out = []
    for m in messages:
        out.append({
            "id": m.id,
            "content": m.content,
            "author": {"id": m.author.id, "email": m.author.email, "name": m.author.name},
            "created_at": m.created_at
        })
    return out

@app.post("/forum/post", response_model=ForumMessageOut)
def post_forum_message(msg: ForumMessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if contains_profanity(msg.content):
        raise HTTPException(status_code=400, detail="Message contains inappropriate language")
    m = ForumMessage(content=msg.content, user_id=current_user.id)
    db.add(m)
    db.commit()
    db.refresh(m)

    # create notification for everyone? Usually not — instead broadcast to forum room
    # Broadcast to forum room (all connected)
    room = (m.content and "global") or "global"
    # choose a default room name; front-end should use specific category names for rooms if desired
    for conns in list(forum_rooms.values()):
        for ws in list(conns):
            try:
                ws.send_json({
                    "type": "forum_message",
                    "message": {
                        "id": m.id,
                        "content": m.content,
                        "author": {"id": current_user.id, "name": current_user.name},
                        "created_at": m.created_at.isoformat()
                    }
                })
            except Exception:
                pass

    return {
        "id": m.id,
        "content": m.content,
        "author": {"id": current_user.id, "email": current_user.email, "name": current_user.name},
        "created_at": m.created_at
    }

# ---------------------
# Chat endpoints (REST & WebSocket)
# ---------------------
@app.post("/chat/send", response_model=ChatMessageOut)
def send_chat_message(payload: ChatMessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recipient = db.query(User).filter(User.id == payload.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if contains_profanity(payload.content):
        raise HTTPException(status_code=400, detail="Message contains inappropriate language")
    m = ChatMessage(sender_id=current_user.id, recipient_id=payload.recipient_id, content=payload.content)
    db.add(m)
    db.commit()
    db.refresh(m)

    # create notification for recipient
    create_notification_for(db, recipient_id=payload.recipient_id, actor_id=current_user.id, ntype="message",
                            message=f"{current_user.name} sent you a message")

    # push over websocket if recipient connected
    conns = chat_connections.get(payload.recipient_id, [])
    for ws in list(conns):
        try:
            ws.send_json({
                "type": "chat_message",
                "message": {
                    "id": m.id,
                    "sender_id": current_user.id,
                    "recipient_id": payload.recipient_id,
                    "content": m.content,
                    "created_at": m.created_at.isoformat()
                }
            })
        except Exception:
            pass

    return {
        "id": m.id,
        "sender_id": m.sender_id,
        "recipient_id": m.recipient_id,
        "content": m.content,
        "created_at": m.created_at
    }

@app.get("/chat/history/{other_user_id}", response_model=List[ChatMessageOut])
def chat_history(other_user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msgs = db.query(ChatMessage).filter(
        ((ChatMessage.sender_id == current_user.id) & (ChatMessage.recipient_id == other_user_id)) |
        ((ChatMessage.sender_id == other_user_id) & (ChatMessage.recipient_id == current_user.id))
    ).order_by(ChatMessage.created_at.asc()).all()
    out = []
    for m in msgs:
        out.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "recipient_id": m.recipient_id,
            "content": m.content,
            "created_at": m.created_at
        })
    return out

# ---------------------
# Notifications API (pollable)
# ---------------------
@app.get("/notifications", response_model=List[NotificationOut])
def get_notifications(since: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Notification).filter(Notification.recipient_id == current_user.id).order_by(Notification.created_at.desc())
    if since:
        try:
            dt_since = datetime.fromisoformat(since)
            q = q.filter(Notification.created_at > dt_since)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid 'since' timestamp format. Use ISO format.")
    rows = q.limit(100).all()
    out = []
    for r in rows:
        out.append({
            "id": r.id,
            "notification_type": r.notification_type,
            "message": r.message,
            "actor_id": r.actor_id,
            "post_id": r.post_id,
            "comment_id": r.comment_id,
            "is_read": r.is_read,
            "created_at": r.created_at
        })
    return out

@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.recipient_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = 1
    db.commit()
    return {"message": "Marked as read"}

# ---------------------
# Leaderboard & Dashboard enhancements
# ---------------------
@app.get("/leaderboard")
def leaderboard(limit: int = 10, db: Session = Depends(get_db)):
    rows = (
        db.query(UserPoints.user_id, UserPoints.points, User.name)
        .join(User, User.id == UserPoints.user_id)
        .order_by(UserPoints.points.desc())
        .limit(limit)
        .all()
    )
    out = []
    for user_id, pts, name in rows:
        out.append({"user_id": user_id, "name": name, "points": pts})
    return out

@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_posts = db.query(func.count(Post.id)).filter(Post.user_id == current_user.id).scalar() or 0
    likes_received = (
        db.query(func.count(PostLike.id))
        .join(Post, Post.id == PostLike.post_id)
        .filter(Post.user_id == current_user.id)
        .scalar() or 0
    )
    comments_received = (
        db.query(func.count(Comment.id))
        .join(Post, Post.id == Comment.post_id)
        .filter(Post.user_id == current_user.id)
        .scalar() or 0
    )

    # engagement last 7 days (likes/comments)
    today = datetime.now(timezone.utc).date()
    seven_days_ago = today - timedelta(days=6)

    likes_per_day = (
        db.query(
            cast(PostLike.created_at, Date).label("date"),
            func.count(PostLike.id).label("count")
        )
        .join(Post, Post.id == PostLike.post_id)
        .filter(Post.user_id == current_user.id)
        .filter(cast(PostLike.created_at, Date) >= seven_days_ago)
        .group_by(cast(PostLike.created_at, Date))
        .order_by(cast(PostLike.created_at, Date))
        .all()
    )

    comments_per_day = (
        db.query(
            cast(Comment.created_at, Date).label("date"),
            func.count(Comment.id).label("count")
        )
        .join(Post, Post.id == Comment.post_id)
        .filter(Post.user_id == current_user.id)
        .filter(cast(Comment.created_at, Date) >= seven_days_ago)
        .group_by(cast(Comment.created_at, Date))
        .order_by(cast(Comment.created_at, Date))
        .all()
    )

    # points and rank
    pts_row = db.query(UserPoints).filter(UserPoints.user_id == current_user.id).first()
    my_points = pts_row.points if pts_row else 0
    # compute rank
    rank = (
        db.query(func.count(UserPoints.user_id))
        .filter(UserPoints.points > my_points)
        .scalar()
    )
    # rank is # of people with more points + 1
    rank = (rank or 0) + 1

    engagement_last_7_days = {
        "likes": [{"date": str(d), "count": c} for d, c in likes_per_day],
        "comments": [{"date": str(d), "count": c} for d, c in comments_per_day]
    }

    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name
        },
        "stats": {
            "total_posts": total_posts,
            "likes_received": likes_received,
            "comments_received": comments_received,
            "engagement_last_7_days": engagement_last_7_days,
            "points": my_points,
            "rank": rank
        }
    }

# ---------------------
# Profile Endpoints
# ---------------------
@app.get("/profile", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

@app.put("/profile", response_model=UserOut)
def update_profile(user_update: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if user_update.name:
        current_user.name = user_update.name
    if user_update.email:
        if db.query(User).filter(User.email == user_update.email, User.id != current_user.id).first():
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = user_update.email
    if user_update.password:
        current_user.password_hash = pwd_context.hash(user_update.password)
    db.commit()
    db.refresh(current_user)
    return current_user

# ---------------------
# WebSocket endpoints
# ---------------------
@app.websocket("/ws/notifications/{user_id}")
async def ws_notifications(websocket: WebSocket, user_id: int):
    await websocket.accept()
    add_connection(notification_connections, user_id, websocket)
    try:
        while True:
            # keep connection alive; receive pings from client optionally
            data = await websocket.receive_text()
            # client can send "mark_read:<id>" or "ping"
            if data.startswith("mark_read:"):
                try:
                    nid = int(data.split(":", 1)[1])
                    db = SessionLocal()
                    n = db.query(Notification).filter(Notification.id == nid, Notification.recipient_id == user_id).first()
                    if n:
                        n.is_read = 1
                        db.commit()
                    db.close()
                except Exception:
                    pass
            # ignore other client messages
    except WebSocketDisconnect:
        remove_connection(notification_connections, user_id, websocket)

@app.websocket("/ws/chat/{user_id}")
async def ws_chat(websocket: WebSocket, user_id: int):
    await websocket.accept()
    add_connection(chat_connections, user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # expect structure: {"recipient_id": X, "content": "hi"}
            recipient_id = data.get("recipient_id")
            content = data.get("content")
            if not recipient_id or not content:
                continue
            # persist message
            db = SessionLocal()
            if contains_profanity(content):
                await websocket.send_json({"type": "error", "message": "Profanity detected"})
                db.close()
                continue
            m = ChatMessage(sender_id=user_id, recipient_id=recipient_id, content=content)
            db.add(m)
            db.commit()
            db.refresh(m)
            # notification to recipient
            create_notification_for(db, recipient_id=recipient_id, actor_id=user_id, ntype="message",
                                    message=f"{m.sender.name if m.sender else 'Someone'} sent you a message")
            # push to recipient connections
            conns = chat_connections.get(recipient_id, [])
            payload = {
                "type": "chat_message",
                "message": {
                    "id": m.id,
                    "sender_id": m.sender_id,
                    "recipient_id": m.recipient_id,
                    "content": m.content,
                    "created_at": m.created_at.isoformat()
                }
            }
            for ws in list(conns):
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass
            # echo back to sender as ack
            await websocket.send_json(payload)
            db.close()
    except WebSocketDisconnect:
        remove_connection(chat_connections, user_id, websocket)

@app.websocket("/ws/forum/{category}")
async def ws_forum(websocket: WebSocket, category: str):
    await websocket.accept()
    room_name = category or "global"
    forum_rooms.setdefault(room_name, []).append(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # expected { "content": "hi" , "token": "..."} - token not validated here; client should POST to /forum/post for auth fallback
            content = data.get("content")
            token = data.get("token")
            # minimal token check to map to a user (optional)
            user = None
            if token:
                try:
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    email = payload.get("sub")
                    db = SessionLocal()
                    user = db.query(User).filter(User.email == email).first()
                    db.close()
                except Exception:
                    user = None
            # persist message to DB if user found
            db = SessionLocal()
            if contains_profanity(content):
                await websocket.send_json({"type": "error", "message": "Profanity detected"})
                db.close()
                continue
            if user:
                fm = ForumMessage(content=content, user_id=user.id)
                db.add(fm)
                db.commit()
                db.refresh(fm)
                author_payload = {"id": user.id, "name": user.name}
            else:
                # anonymous forum post
                fm = ForumMessage(content=content, user_id=None)
                db.add(fm)
                db.commit()
                db.refresh(fm)
                author_payload = {"id": None, "name": "Anonymous"}
            # broadcast to room
            payload = {
                "type": "forum_message",
                "message": {
                    "id": fm.id,
                    "content": fm.content,
                    "author": author_payload,
                    "created_at": fm.created_at.isoformat()
                }
            }
            for ws in list(forum_rooms.get(room_name, [])):
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass
            db.close()
    except WebSocketDisconnect:
        # remove from room
        conns = forum_rooms.get(room_name, [])
        try:
            conns.remove(websocket)
        except Exception:
            pass
        if not conns:
            forum_rooms.pop(room_name, None)

# ---------------------
# Local dev runner
# ---------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
