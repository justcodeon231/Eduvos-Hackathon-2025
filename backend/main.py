# main.py
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from enum import Enum as PyEnum
import os
import asyncio

from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, ForeignKey, func, UniqueConstraint
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session

from jose import jwt, JWTError
from passlib.context import CryptContext

# ---------------------
# DB & SQLAlchemy
# ---------------------
DB_FILE = "app.db"
engine = create_engine(f"sqlite:///./{DB_FILE}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

# ---------------------
# Models
# ---------------------
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String)
    role = Column(String, default="student")  # student | mentor | admin

    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("ChatMessage", foreign_keys="[ChatMessage.sender_id]", back_populates="sender", cascade="all, delete-orphan")
    received_messages = relationship("ChatMessage", foreign_keys="[ChatMessage.recipient_id]", back_populates="recipient", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    content = Column(String)
    category = Column(String, default="General")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"))
    author = relationship("User", back_populates="posts")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

class PostLike(Base):
    __tablename__ = "post_likes"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    post = relationship("Post", back_populates="likes")
    __table_args__ = (UniqueConstraint('post_id', 'user_id', name='unique_user_like'),)

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    recipient_id = Column(Integer, ForeignKey("users.id"))
    actor_id = Column(Integer, nullable=True)
    notification_type = Column(String)
    message = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Integer, default=0)
    recipient = relationship("User", back_populates="notifications")

# Create tables
Base.metadata.create_all(bind=engine)

# ---------------------
# Schemas
# ---------------------
class PostCategory(str, PyEnum):
    IDEAHUB = "IdeaHub"
    ACADEMIC = "Academic"
    EVENTS = "Events"
    GENERAL = "General"

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    class Config:
        from_attributes = True

class PostCreate(BaseModel):
    title: str
    content: str
    category: Optional[PostCategory] = PostCategory.GENERAL

class PostOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    likes: int
    comments: int
    author: UserOut
    created_at: str
    class Config:
        from_attributes = True

class PostDetailOut(PostOut):
    # same as PostOut for now; kept for clarity
    pass

class CommentCreate(BaseModel):
    post_id: int
    content: str

class CommentOut(BaseModel):
    id: int
    post_id: int
    user_id: int
    content: str
    created_at: str

class ChatMessageCreate(BaseModel):
    recipient_id: int
    content: str

class ChatMessageOut(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content: str
    created_at: str

class NotificationOut(BaseModel):
    id: int
    notification_type: str
    message: str
    actor_id: Optional[int]
    is_read: int
    created_at: str

class SharePostCreate(BaseModel):
    recipient_id: int
    post_id: int
    message: Optional[str] = None

# ---------------------
# Auth & security
# ---------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
SECRET_KEY = os.getenv("SECRET_KEY", "hackjam2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def truncate_password_for_bcrypt(pw: str) -> str:
    # bcrypt has 72-byte input limit. Truncate to be safe.
    if not pw:
        return ""
    return pw[:72]

def hash_password(pw: str) -> str:
    return pwd_context.hash(truncate_password_for_bcrypt(pw))

def verify_password(pw: str, hashed: str) -> bool:
    return pwd_context.verify(truncate_password_for_bcrypt(pw), hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def determine_role_from_email(email: str) -> str:
    """simple domain-based role assignment"""
    email = email.lower()
    if email.endswith("@eduvos.com"):
        return "mentor"  # treat eduvos.com as mentors/admins (admins can be set separately)
    if email.endswith("@vossie.net"):
        return "student"
    return "student"

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
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
# App & middleware
# ---------------------
app = FastAPI(title="Lean Social App - MVP")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ---------------------
# Real-time stores
# ---------------------
chat_connections: Dict[int, List[WebSocket]] = {}
notification_connections: Dict[int, List[WebSocket]] = {}

def add_connection(store: Dict[int, List[WebSocket]], user_id: int, ws: WebSocket):
    store.setdefault(user_id, []).append(ws)

def remove_connection(store: Dict[int, List[WebSocket]], user_id: int, ws: WebSocket):
    conns = store.get(user_id)
    if conns and ws in conns:
        conns.remove(ws)
    if conns == []:
        store.pop(user_id, None)

# ---------------------
# Notifications helper (creates DB row + pushes WS)
# ---------------------
async def _push_notification_ws(recipient_id: int, payload: dict):
    conns = list(notification_connections.get(recipient_id, []))
    if not conns:
        return
    async def _send(ws: WebSocket):
        try:
            await ws.send_json(payload)
        except Exception:
            pass
    await asyncio.gather(*[_send(ws) for ws in conns], return_exceptions=True)

async def create_notification(db: Session, recipient_id: int, actor_id: Optional[int], ntype: str, message: str) -> Notification:
    if recipient_id == actor_id:
        # don't notify self
        return None
    n = Notification(recipient_id=recipient_id, actor_id=actor_id, notification_type=ntype, message=message)
    db.add(n)
    db.commit()
    db.refresh(n)
    payload = {
        "event": "new_notification",
        "notif_id": n.id,
        "notification_type": ntype,
        "message": message,
        "actor_id": actor_id,
        "created_at": n.created_at.isoformat()
    }
    # push asynchronously
    asyncio.create_task(_push_notification_ws(recipient_id, payload))
    return n

# ---------------------
# Auth routes
# ---------------------
@app.post("/register", response_model=UserOut)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # simple domain validation: require vossie or eduvos
    email_lower = user.email.lower()
    if not (email_lower.endswith("@vossie.net") or email_lower.endswith("@eduvos.com")):
        raise HTTPException(status_code=400, detail="Registration requires a VOSSIE or EDUVOS email.")
    if db.query(User).filter(User.email == email_lower).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    role = determine_role_from_email(email_lower)
    # If edu-vos domain should be admin/mentor; you can promote specific emails to admin manually later
    hashed = hash_password(user.password)
    u = User(email=email_lower, name=user.name.strip(), password_hash=hashed, role=role)
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role}

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

@app.post("/login")
async def login(login: LoginSchema, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == login.email.lower()).first()
    if not u or not verify_password(login.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": u.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": u.id, "email": u.email, "name": u.name, "role": u.role}}

# ---------------------
# Users & Mentors
# ---------------------
@app.get("/profile", response_model=UserOut)
async def read_profile(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name, "role": current_user.role}

@app.put("/profile", response_model=UserOut)
async def update_profile(name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.name = name.strip()
    db.commit()
    db.refresh(current_user)
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name, "role": current_user.role}

@app.delete("/profile")
async def delete_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"detail": "User deleted"}

@app.get("/mentors", response_model=List[UserOut])
async def mentors_list(db: Session = Depends(get_db)):
    # mentors/admins are users with eduvos.com domain
    mentors = db.query(User).filter(User.email.ilike("%@eduvos.com")).all()
    return [{"id": m.id, "email": m.email, "name": m.name, "role": m.role} for m in mentors]

# ---------------------
# Posts
# ---------------------
@app.post("/post", response_model=PostOut)
async def create_post(p: PostCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cat = (p.category or PostCategory.GENERAL).value
    post = Post(title=p.title.strip(), content=p.content.strip(), category=cat, author=current_user)
    db.add(post)
    db.commit()
    db.refresh(post)
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "category": post.category,
        "likes": len(post.likes),
        "comments": len(post.comments),
        "author": {"id": current_user.id, "email": current_user.email, "name": current_user.name, "role": current_user.role},
        "created_at": post.created_at.isoformat()
    }

@app.get("/posts", response_model=List[PostOut])
async def list_posts(category: Optional[PostCategory] = None, db: Session = Depends(get_db)):
    q = db.query(Post)
    if category:
        q = q.filter(Post.category == category.value)
    posts = q.order_by(Post.created_at.desc()).all()
    out = []
    for p in posts:
        out.append({
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "category": p.category,
            "likes": len(p.likes),
            "comments": len(p.comments),
            "author": {"id": p.author.id, "email": p.author.email, "name": p.author.name, "role": p.author.role},
            "created_at": p.created_at.isoformat()
        })
    return out

@app.get("/posts/{post_id}", response_model=PostDetailOut)
async def get_post(post_id: int, db: Session = Depends(get_db)):
    p = db.query(Post).filter(Post.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    return {
        "id": p.id,
        "title": p.title,
        "content": p.content,
        "category": p.category,
        "likes": len(p.likes),
        "comments": len(p.comments),
        "author": {"id": p.author.id, "email": p.author.email, "name": p.author.name, "role": p.author.role},
        "created_at": p.created_at.isoformat()
    }

@app.post("/posts/{post_id}/like")
async def like_post(post_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if db.query(PostLike).filter_by(post_id=post.id, user_id=current_user.id).first():
        raise HTTPException(status_code=400, detail="Already liked")
    like = PostLike(post_id=post.id, user_id=current_user.id)
    db.add(like)
    db.commit()
    # create notification for post owner (async push)
    await create_notification(db, recipient_id=post.user_id, actor_id=current_user.id, ntype="like", message=f"{current_user.name} liked your post")
    return {"detail": "Liked"}

@app.get("/posts/search", response_model=List[PostOut])
async def search_posts(query: str, db: Session = Depends(get_db)):
    posts = db.query(Post).filter(
        (Post.title.ilike(f"%{query}%")) |
        (Post.content.ilike(f"%{query}%")) |
        (Post.category.ilike(f"%{query}%"))
    ).order_by(Post.created_at.desc()).all()
    out = []
    for p in posts:
        out.append({
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "category": p.category,
            "likes": len(p.likes),
            "comments": len(p.comments),
            "author": {"id": p.author.id, "email": p.author.email, "name": p.author.name, "role": p.author.role},
            "created_at": p.created_at.isoformat()
        })
    return out

@app.get("/posts/categories")
async def get_post_categories():
    return {"categories": [c.value for c in PostCategory]}

# ---------------------
# Comments
# ---------------------
@app.post("/comments")
async def create_comment(c: CommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == c.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = Comment(post_id=post.id, user_id=current_user.id, content=c.content.strip())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    await create_notification(db, recipient_id=post.user_id, actor_id=current_user.id, ntype="comment", message=f"{current_user.name} commented on your post")
    return {"detail": "Comment added", "comment_id": comment.id}

@app.get("/posts/{post_id}/comments", response_model=List[CommentOut])
async def get_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.asc()).all()
    return [{"id": c.id, "post_id": c.post_id, "user_id": c.user_id, "content": c.content, "created_at": c.created_at.isoformat()} for c in comments]

# ---------------------
# Chat (REST + WebSocket)
# ---------------------
@app.post("/chat/send", response_model=ChatMessageOut)
async def send_chat(msg: ChatMessageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    recipient = db.query(User).filter(User.id == msg.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    chat = ChatMessage(sender_id=current_user.id, recipient_id=recipient.id, content=msg.content.strip())
    db.add(chat)
    db.commit()
    db.refresh(chat)
    payload = {
        "event": "new_message",
        "message_id": chat.id,
        "sender_id": current_user.id,
        "recipient_id": recipient.id,
        "content": chat.content,
        "created_at": chat.created_at.isoformat()
    }
    # push to recipient sockets
    async def _push_to_recipient():
        conns = list(chat_connections.get(recipient.id, []))
        async def _send(ws):
            try:
                await ws.send_json(payload)
            except Exception:
                pass
        if conns:
            await asyncio.gather(*[_send(ws) for ws in conns], return_exceptions=True)
    asyncio.create_task(_push_to_recipient())
    # create persistent notification
    await create_notification(db, recipient_id=recipient.id, actor_id=current_user.id, ntype="dm", message=f"{current_user.name} sent you a message")
    return {"id": chat.id, "sender_id": chat.sender_id, "recipient_id": chat.recipient_id, "content": chat.content, "created_at": chat.created_at.isoformat()}

@app.get("/chat/history/{other_user_id}", response_model=List[ChatMessageOut])
async def chat_history(other_user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msgs = db.query(ChatMessage).filter(
        ((ChatMessage.sender_id == current_user.id) & (ChatMessage.recipient_id == other_user_id)) |
        ((ChatMessage.sender_id == other_user_id) & (ChatMessage.recipient_id == current_user.id))
    ).order_by(ChatMessage.created_at.asc()).all()
    return [{"id": m.id, "sender_id": m.sender_id, "recipient_id": m.recipient_id, "content": m.content, "created_at": m.created_at.isoformat()} for m in msgs]

@app.post("/chat/share-post", response_model=ChatMessageOut)
async def share_post_via_dm(data: SharePostCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    recipient = db.query(User).filter(User.id == data.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    post = db.query(Post).filter(Post.id == data.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    # craft clickable link (frontend should resolve /posts/{id})
    content = f"Shared post: '{post.title}' (post_id={post.id})\n{(data.message or '').strip()}"
    chat = ChatMessage(sender_id=current_user.id, recipient_id=recipient.id, content=content)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    payload = {
        "event": "new_message",
        "message_id": chat.id,
        "sender_id": current_user.id,
        "recipient_id": recipient.id,
        "content": chat.content,
        "post_id": post.id,
        "created_at": chat.created_at.isoformat()
    }
    # push
    async def _push():
        conns = list(chat_connections.get(recipient.id, []))
        async def _send(ws):
            try:
                await ws.send_json(payload)
            except Exception:
                pass
        if conns:
            await asyncio.gather(*[_send(ws) for ws in conns], return_exceptions=True)
    asyncio.create_task(_push())
    await create_notification(db, recipient_id=recipient.id, actor_id=current_user.id, ntype="share_post", message=f"{current_user.name} shared a post with you")
    return {"id": chat.id, "sender_id": chat.sender_id, "recipient_id": chat.recipient_id, "content": chat.content, "created_at": chat.created_at.isoformat()}

# ---------------------
# Notifications
# ---------------------
@app.get("/notifications", response_model=List[NotificationOut])
async def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Notification).filter(Notification.recipient_id == current_user.id).order_by(Notification.created_at.desc()).limit(200).all()
    return [{"id": r.id, "notification_type": r.notification_type, "message": r.message, "actor_id": r.actor_id, "is_read": r.is_read, "created_at": r.created_at.isoformat()} for r in rows]

@app.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.recipient_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = 1
    db.commit()
    payload = {"event": "notification_read", "notif_id": notif_id, "created_at": notif.created_at.isoformat()}
    # notify sockets
    async def _push():
        conns = list(notification_connections.get(current_user.id, []))
        async def _send(ws):
            try:
                await ws.send_json(payload)
            except Exception:
                pass
        if conns:
            await asyncio.gather(*[_send(ws) for ws in conns], return_exceptions=True)
    asyncio.create_task(_push())
    return {"detail": "Marked as read"}

# ---------------------
# Dashboard & Leaderboard
# ---------------------
@app.get("/dashboard")
async def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_posts = db.query(Post).filter(Post.user_id == current_user.id).count()
    total_likes_received = db.query(PostLike).join(Post).filter(Post.user_id == current_user.id).count()
    total_comments_received = db.query(Comment).join(Post).filter(Post.user_id == current_user.id).count()
    total_messages_sent = db.query(ChatMessage).filter(ChatMessage.sender_id == current_user.id).count()
    total_messages_received = db.query(ChatMessage).filter(ChatMessage.recipient_id == current_user.id).count()
    unread_notifications = db.query(Notification).filter(Notification.recipient_id == current_user.id, Notification.is_read == 0).count()

    recent_posts = db.query(Post).filter(Post.user_id == current_user.id).order_by(Post.created_at.desc()).limit(5).all()
    recent_posts_data = [{"id": p.id, "title": p.title, "likes": len(p.likes), "comments": len(p.comments), "created_at": p.created_at.isoformat()} for p in recent_posts]

    recent_messages = db.query(ChatMessage).filter((ChatMessage.sender_id == current_user.id) | (ChatMessage.recipient_id == current_user.id)).order_by(ChatMessage.created_at.desc()).limit(5).all()
    recent_messages_data = [{"id": m.id, "sender_id": m.sender_id, "recipient_id": m.recipient_id, "content": m.content, "created_at": m.created_at.isoformat()} for m in recent_messages]

    # likes & comments in last 30 days:
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    likes_last_30 = db.query(PostLike).join(Post).filter(Post.user_id == current_user.id, PostLike.created_at >= thirty_days_ago).count()
    comments_last_30 = db.query(Comment).join(Post).filter(Post.user_id == current_user.id, Comment.created_at >= thirty_days_ago).count()

    collaborations = db.query(ChatMessage.recipient_id).filter(ChatMessage.sender_id == current_user.id).distinct().count()

    return {
        "user": {"id": current_user.id, "email": current_user.email, "name": current_user.name, "role": current_user.role},
        "stats": {
            "total_posts": total_posts,
            "likes_received_30d": likes_last_30,
            "comments_received_30d": comments_last_30,
            "collaborations": collaborations,
            "total_messages_sent": total_messages_sent,
            "total_messages_received": total_messages_received,
            "unread_notifications": unread_notifications,
            "recent_posts": recent_posts_data,
            "recent_messages": recent_messages_data
        }
    }

@app.get("/leaderboard")
async def leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).all()
    data = []
    for u in users:
        total_posts = db.query(Post).filter(Post.user_id == u.id).count()
        total_likes = db.query(PostLike).join(Post).filter(Post.user_id == u.id).count()
        total_comments = db.query(Comment).join(Post).filter(Post.user_id == u.id).count()
        score = total_posts + total_likes + total_comments
        data.append({"id": u.id, "name": u.name, "email": u.email, "score": score, "total_posts": total_posts, "total_likes": total_likes, "total_comments": total_comments})
    sorted_ = sorted(data, key=lambda x: x["score"], reverse=True)
    return sorted_[:10]

# ---------------------
# Search users endpoint
# ---------------------
@app.get("/users/search", response_model=List[UserOut])
async def search_users(query: str, db: Session = Depends(get_db)):
    users = db.query(User).filter((User.name.ilike(f"%{query}%")) | (User.email.ilike(f"%{query}%"))).all()
    return [{"id": u.id, "email": u.email, "name": u.name, "role": u.role} for u in users]

# ---------------------
# WebSockets
# ---------------------
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(ws: WebSocket, user_id: int):
    await ws.accept()
    add_connection(chat_connections, user_id, ws)
    try:
        while True:
            # optional: accept client pings or commands like "typing"
            data = await ws.receive_text()
            # ignore for now
    except WebSocketDisconnect:
        remove_connection(chat_connections, user_id, ws)

@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(ws: WebSocket, user_id: int):
    await ws.accept()
    add_connection(notification_connections, user_id, ws)
    try:
        while True:
            # keep socket alive, optionally accept client pings
            data = await ws.receive_text()
    except WebSocketDisconnect:
        remove_connection(notification_connections, user_id, ws)

# ---------------------
# Dev runner
# ---------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
