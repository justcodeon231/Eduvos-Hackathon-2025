# main.py
# Lean one-on-one social app with admin/moderator roles, reporting, moderation, and async WS pushes.

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, ForeignKey, func, UniqueConstraint, Boolean
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from pydantic import BaseModel, EmailStr
from enum import Enum as PyEnum
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import List, Optional, Dict
from datetime import datetime, timedelta, timezone
import os
import asyncio

# ---------------------
# Config (change to fit)
# ---------------------
DB_FILE = os.getenv("DB_FILE", "app.db")
VOC_DOMAIN = os.getenv("VOC_DOMAIN", "vossie.net")      # students / regular users must have this domain
EDUVOS_DOMAIN = os.getenv("EDUVOS_DOMAIN", "eduvos.com")  # moderators/admins emails must end with this
SECRET_KEY = os.getenv("SECRET_KEY", "hackjam2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ---------------------
# Database setup
# ---------------------
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
    role = Column(String, default="user")   # user | moderator | admin
    is_banned = Column(Boolean, default=False)

    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("ChatMessage", foreign_keys="[ChatMessage.sender_id]", back_populates="sender", cascade="all, delete-orphan")
    received_messages = relationship("ChatMessage", foreign_keys="[ChatMessage.recipient_id]", back_populates="recipient", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")
    reports_made = relationship("Report", back_populates="reporter", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    content = Column(String)
    category = Column(String, default="general")
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

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True)
    reporter_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=True)
    reason = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reporter = relationship("User", back_populates="reports_made")

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
    role: Optional[str] = "user"
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
    created_at: datetime
    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    post_id: int
    content: str

class ChatMessageCreate(BaseModel):
    recipient_id: int
    content: str

class ChatMessageOut(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content: str
    created_at: datetime

class NotificationOut(BaseModel):
    id: int
    notification_type: str
    message: str
    actor_id: Optional[int]
    is_read: int
    created_at: datetime

class SharePostCreate(BaseModel):
    recipient_id: int
    post_id: int
    message: Optional[str] = None  # optional extra message

class ReportCreate(BaseModel):
    post_id: Optional[int] = None
    message_id: Optional[int] = None
    reason: str

# ---------------------
# Auth setup
# ---------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if not user or user.is_banned:
        raise HTTPException(status_code=401, detail="User not found or banned")
    return user

# ---------------------
# App & CORS
# ---------------------
app = FastAPI(title="Lean Social App - with Admin/Mod")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------
# WebSocket stores (in-memory)
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
# Role-based dependency
# ---------------------
def require_roles(allowed_roles: List[str]):
    def _inner(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission")
        return current_user
    return _inner

# ---------------------
# Async push helper (used by sync endpoints via create_task)
# ---------------------
async def _push_notification_ws(recipient_id: int, payload: dict):
    conns = list(notification_connections.get(recipient_id, []))
    if not conns:
        return
    async def _send(ws):
        try:
            await ws.send_json(payload)
        except Exception:
            pass
    await asyncio.gather(*[_send(ws) for ws in conns])

# ---------------------
# Notification creation (sync) - schedule async WS pushes
# ---------------------
def create_notification(db: Session, recipient_id: int, actor_id: Optional[int], ntype: str, message: str) -> Notification:
    if recipient_id == actor_id:
        return None
    notif = Notification(
        recipient_id=recipient_id,
        actor_id=actor_id,
        notification_type=ntype,
        message=message
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # schedule websocket push
    payload = {
        "event": "new_notification",
        "notification_type": ntype,
        "message": message,
        "actor_id": actor_id,
        "notif_id": notif.id,
        "timestamp": notif.created_at.isoformat()
    }
    try:
        asyncio.create_task(_push_notification_ws(recipient_id, payload))
    except RuntimeError:
        # running outside event loop (e.g., uvicorn auto-reload); best-effort
        pass
    return notif

# ---------------------
# Auth routes
# ---------------------
@app.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    email = user.email.lower().strip()

    # enforce domain rules
    if email.endswith("@" + VOC_DOMAIN):
        role = "user"
    elif email.endswith("@" + EDUVOS_DOMAIN):
        # edu-vos emails -> moderator by default (you may change logic)
        role = "moderator"
    else:
        raise HTTPException(status_code=400, detail=f"Registration requires @{VOC_DOMAIN} (users) or @{EDUVOS_DOMAIN} (staff) email")

    # simple password length guard (bcrypt limitation)
    if len(user.password) > 72:
        raise HTTPException(status_code=400, detail="Password too long; must be <= 72 characters")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = pwd_context.hash(user.password)
    u = User(email=email, name=user.name.strip(), password_hash=hashed, role=role)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

@app.post("/login")
def login(payload: LoginSchema, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    u = db.query(User).filter(User.email == email).first()
    if not u or not pwd_context.verify(payload.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if u.is_banned:
        raise HTTPException(status_code=403, detail="User is banned")
    token = create_access_token({"sub": u.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": u.id, "email": u.email, "name": u.name, "role": u.role}}

# ---------------------
# User endpoints
# ---------------------
@app.get("/profile", response_model=UserOut)
def read_profile(current_user: User = Depends(get_current_user)):
    return current_user

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

@app.put("/profile", response_model=UserOut)
def update_profile(update: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if update.name:
        current_user.name = update.name.strip()
    if update.email:
        # don't allow changing to invalid domain
        if not (update.email.lower().endswith("@" + VOC_DOMAIN) or update.email.lower().endswith("@" + EDUVOS_DOMAIN)):
            raise HTTPException(status_code=400, detail="Email must be VOC or EDUVOS domain")
        if db.query(User).filter(User.email == update.email.lower(), User.id != current_user.id).first():
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = update.email.lower()
    if update.password:
        if len(update.password) > 72:
            raise HTTPException(status_code=400, detail="Password too long; must be <= 72 characters")
        current_user.password_hash = pwd_context.hash(update.password)
    db.commit()
    db.refresh(current_user)
    return current_user

@app.delete("/profile")
def delete_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"detail": "User deleted"}

# ---------------------
# Posts routes
# ---------------------
@app.post("/post", response_model=PostOut)
def create_post(p: PostCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    category = p.category or PostCategory.GENERAL
    post = Post(title=p.title.strip(), content=p.content.strip(), category=category.value, author=current_user)
    db.add(post)
    db.commit()
    db.refresh(post)
    return PostOut(
        id=post.id,
        title=post.title,
        content=post.content,
        category=post.category,
        likes=len(post.likes),
        comments=len(post.comments),
        author=current_user,
        created_at=post.created_at
    )

@app.get("/posts", response_model=List[PostOut])
def list_posts(category: Optional[PostCategory] = None, db: Session = Depends(get_db)):
    query = db.query(Post)
    if category:
        query = query.filter(Post.category == category.value)
    posts = query.order_by(Post.created_at.desc()).all()
    return [
        PostOut(
            id=p.id,
            title=p.title,
            content=p.content,
            category=p.category,
            likes=len(p.likes),
            comments=len(p.comments),
            author=p.author,
            created_at=p.created_at
        ) for p in posts
    ]

@app.post("/posts/{post_id}/like")
def like_post(post_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if db.query(PostLike).filter_by(post_id=post.id, user_id=current_user.id).first():
        raise HTTPException(400, "Already liked")
    like = PostLike(post_id=post.id, user_id=current_user.id)
    db.add(like)
    db.commit()

    # create notification (non-blocking WS push)
    create_notification(db, recipient_id=post.user_id, actor_id=current_user.id, ntype="like", message=f"{current_user.name} liked your post")
    return {"detail": "Liked"}

@app.get("/posts/search", response_model=List[PostOut])
def search_posts(query: str, db: Session = Depends(get_db)):
    posts = db.query(Post).filter(
        (Post.title.ilike(f"%{query}%")) |
        (Post.content.ilike(f"%{query}%")) |
        (Post.category.ilike(f"%{query}%"))
    ).order_by(Post.created_at.desc()).all()
    return [
        PostOut(
            id=p.id,
            title=p.title,
            content=p.content,
            category=p.category,
            likes=len(p.likes),
            comments=len(p.comments),
            author=p.author,
            created_at=p.created_at
        ) for p in posts
    ]

@app.get("/posts/categories")
def get_post_categories():
    return {"categories": [c.value for c in PostCategory]}

# ---------------------
# Comments
# ---------------------
@app.post("/comments")
def create_comment(c: CommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == c.post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    comment = Comment(post_id=post.id, user_id=current_user.id, content=c.content.strip())
    db.add(comment)
    db.commit()
    create_notification(db, recipient_id=post.user_id, actor_id=current_user.id, ntype="comment", message=f"{current_user.name} commented on your post")
    return {"detail": "Comment added"}

# ---------------------
# Chat (REST)
# ---------------------
@app.post("/chat/send", response_model=ChatMessageOut)
def send_chat(msg: ChatMessageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    recipient = db.query(User).filter(User.id == msg.recipient_id).first()
    if not recipient:
        raise HTTPException(404, "Recipient not found")
    chat = ChatMessage(sender_id=current_user.id, recipient_id=recipient.id, content=msg.content.strip())
    db.add(chat)
    db.commit()
    db.refresh(chat)

    # push via websocket (async scheduled)
    payload = {
        "event": "new_message",
        "sender_id": current_user.id,
        "content": msg.content,
        "created_at": chat.created_at.isoformat()
    }
    try:
        asyncio.create_task(_push_notification_ws(recipient.id, payload))
    except RuntimeError:
        pass

    # create notification record and schedule WS push
    create_notification(db, recipient_id=recipient.id, actor_id=current_user.id, ntype="dm", message=f"{current_user.name} sent you a message")
    return chat

@app.get("/chat/history/{other_user_id}", response_model=List[ChatMessageOut])
def chat_history(other_user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msgs = db.query(ChatMessage).filter(
        ((ChatMessage.sender_id==current_user.id) & (ChatMessage.recipient_id==other_user_id)) |
        ((ChatMessage.sender_id==other_user_id) & (ChatMessage.recipient_id==current_user.id))
    ).order_by(ChatMessage.created_at).all()
    return msgs

@app.post("/chat/share-post", response_model=ChatMessageOut)
def share_post_via_dm(data: SharePostCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    recipient = db.query(User).filter(User.id == data.recipient_id).first()
    if not recipient:
        raise HTTPException(404, detail="Recipient not found")
    post = db.query(Post).filter(Post.id == data.post_id).first()
    if not post:
        raise HTTPException(404, detail="Post not found")

    # Build a clickable-like link payload (frontend should map /posts/{id})
    content = f"Shared a post: '{post.title}'\n{data.message or ''}\n/post/{post.id}"
    chat = ChatMessage(sender_id=current_user.id, recipient_id=recipient.id, content=content)
    db.add(chat)
    db.commit()
    db.refresh(chat)

    payload = {
        "event": "shared_post",
        "sender_id": current_user.id,
        "content": content,
        "created_at": chat.created_at.isoformat(),
        "post_id": post.id
    }
    try:
        asyncio.create_task(_push_notification_ws(recipient.id, payload))
    except RuntimeError:
        pass

    create_notification(db, recipient_id=recipient.id, actor_id=current_user.id, ntype="share_post", message=f"{current_user.name} shared a post with you")
    return chat

# ---------------------
# Notifications
# ---------------------
@app.get("/notifications", response_model=List[NotificationOut])
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Notification).filter_by(recipient_id=current_user.id).order_by(Notification.created_at.desc()).all()
    return rows

@app.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter_by(id=notif_id, recipient_id=current_user.id).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    notif.is_read = 1
    db.commit()

    # notify sockets
    payload = {"event": "notification_read", "notif_id": notif_id, "timestamp": notif.created_at.isoformat()}
    try:
        asyncio.create_task(_push_notification_ws(current_user.id, payload))
    except RuntimeError:
        pass

    return {"detail": "Marked as read"}

# ---------------------
# Dashboard & Leaderboard
# ---------------------
@app.get("/dashboard")
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_posts = db.query(Post).filter(Post.user_id == current_user.id).count()
    total_likes_received = db.query(PostLike).join(Post).filter(Post.user_id == current_user.id).count()
    total_comments_received = db.query(Comment).join(Post).filter(Post.user_id == current_user.id).count()
    total_messages_sent = db.query(ChatMessage).filter(ChatMessage.sender_id == current_user.id).count()
    total_messages_received = db.query(ChatMessage).filter(ChatMessage.recipient_id == current_user.id).count()
    unread_notifications = db.query(Notification).filter_by(recipient_id=current_user.id, is_read=0).count()

    recent_posts = db.query(Post).filter(Post.user_id == current_user.id).order_by(Post.created_at.desc()).limit(5).all()
    recent_posts_data = [{"id": p.id, "title": p.title, "likes": len(p.likes), "comments": len(p.comments), "created_at": p.created_at} for p in recent_posts]

    recent_messages = db.query(ChatMessage).filter((ChatMessage.sender_id == current_user.id) | (ChatMessage.recipient_id == current_user.id)).order_by(ChatMessage.created_at.desc()).limit(5).all()
    recent_messages_data = [{"id": m.id, "sender_id": m.sender_id, "recipient_id": m.recipient_id, "content": m.content, "created_at": m.created_at} for m in recent_messages]

    return {
        "total_posts": total_posts,
        "total_likes_received": total_likes_received,
        "total_comments_received": total_comments_received,
        "total_messages_sent": total_messages_sent,
        "total_messages_received": total_messages_received,
        "unread_notifications": unread_notifications,
        "recent_posts": recent_posts_data,
        "recent_messages": recent_messages_data
    }

@app.get("/leaderboard")
def leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).all()
    leaderboard_data = []
    for u in users:
        total_posts = db.query(Post).filter(Post.user_id == u.id).count()
        total_likes = db.query(PostLike).join(Post).filter(Post.user_id == u.id).count()
        total_comments = db.query(Comment).join(Post).filter(Post.user_id == u.id).count()
        score = total_posts + total_likes + total_comments
        leaderboard_data.append({"id": u.id, "name": u.name, "email": u.email, "total_posts": total_posts, "total_likes": total_likes, "total_comments": total_comments, "score": score})
    leaderboard_sorted = sorted(leaderboard_data, key=lambda x: x["score"], reverse=True)
    return leaderboard_sorted[:10]

# ---------------------
# Search users
# ---------------------
@app.get("/users/search", response_model=List[UserOut])
def search_users(query: str, db: Session = Depends(get_db)):
    users = db.query(User).filter((User.name.ilike(f"%{query}%")) | (User.email.ilike(f"%{query}%"))).all()
    return users

# ---------------------
# Reporting & Moderation
# ---------------------
@app.post("/report")
def report_item(report: ReportCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not (report.post_id or report.message_id):
        raise HTTPException(status_code=400, detail="Must provide post_id or message_id to report")
    r = Report(reporter_id=current_user.id, post_id=report.post_id, message_id=report.message_id, reason=report.reason.strip())
    db.add(r)
    db.commit()
    db.refresh(r)
    # optionally notify moderators/admins - push to all edu-vos users
    mod_users = db.query(User).filter(User.email.ilike(f"%@{EDUVOS_DOMAIN}%")).all()
    payload = {"event": "new_report", "report_id": r.id, "reason": r.reason, "reporter_id": current_user.id, "created_at": r.created_at.isoformat()}
    for mu in mod_users:
        try:
            asyncio.create_task(_push_notification_ws(mu.id, payload))
        except RuntimeError:
            pass
    return {"detail": "Report submitted"}

@app.get("/reports", dependencies=[Depends(require_roles(["admin", "moderator"]))])
def list_reports(db: Session = Depends(get_db)):
    return db.query(Report).order_by(Report.created_at.desc()).all()

@app.delete("/posts/{post_id}/moderate", dependencies=[Depends(require_roles(["admin", "moderator"]))])
def moderate_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    db.delete(post)
    db.commit()
    return {"detail": f"Post {post_id} removed by {current_user.role}"}

@app.post("/users/{user_id}/ban", dependencies=[Depends(require_roles(["admin"]))])
def ban_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_banned = True
    db.commit()
    return {"detail": "User banned"}

@app.post("/users/{user_id}/unban", dependencies=[Depends(require_roles(["admin"]))])
def unban_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_banned = False
    db.commit()
    return {"detail": "User unbanned"}

@app.post("/users/{user_id}/promote", dependencies=[Depends(require_roles(["admin"]))])
def promote_user(user_id: int, role: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if role not in ("user", "moderator", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.role = role
    db.commit()
    return {"detail": f"User promoted to {role}"}

# ---------------------
# WebSockets
# ---------------------
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(ws: WebSocket, user_id: int):
    await ws.accept()
    add_connection(chat_connections, user_id, ws)
    try:
        while True:
            await ws.receive_text()  # keep alive or handle incoming ws commands
    except WebSocketDisconnect:
        remove_connection(chat_connections, user_id, ws)

@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(ws: WebSocket, user_id: int):
    await ws.accept()
    add_connection(notification_connections, user_id, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        remove_connection(notification_connections, user_id, ws)

# ---------------------
# Local runner
# ---------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
