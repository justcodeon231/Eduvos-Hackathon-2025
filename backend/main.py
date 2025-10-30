# main.py - lean one-on-one social app
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import List, Optional, Dict
from datetime import datetime, timedelta, timezone
import os

# ---------------------
# Database setup
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

Base.metadata.create_all(bind=engine)

# ---------------------
# Schemas
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

class PostCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"

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

# ---------------------
# Auth setup
# ---------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
SECRET_KEY = os.getenv("SECRET_KEY", "hackjam2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

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
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ---------------------
# App
# ---------------------
app = FastAPI(title="Lean Social App")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------
# WebSocket stores
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
# Helper functions
# ---------------------
def create_notification(db: Session, recipient_id: int, actor_id: Optional[int], ntype: str, message: str):
    if recipient_id == actor_id:
        return
    n = Notification(recipient_id=recipient_id, actor_id=actor_id, notification_type=ntype, message=message)
    db.add(n)
    db.commit()
    # WS push
    for ws in list(notification_connections.get(recipient_id, [])):
        try:
            ws.send_json({
                "type": "notification",
                "message": {
                    "notification_type": ntype,
                    "message": message,
                    "actor_id": actor_id,
                    "created_at": n.created_at.isoformat()
                }
            })
        except Exception:
            pass

# ---------------------
# Routes: Auth
# ---------------------
@app.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = pwd_context.hash(user.password)
    u = User(email=user.email, name=user.name, password_hash=hashed)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

@app.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == user.email).first()
    if not u or not pwd_context.verify(user.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": u.email})
    return {"access_token": token, "token_type": "bearer"}

# ---------------------
# Routes: Users
# ---------------------
@app.get("/profile", response_model=UserOut)
def read_profile(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/profile", response_model=UserOut)
def update_profile(name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.name = name
    db.commit()
    db.refresh(current_user)
    return current_user

@app.delete("/profile")
def delete_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"detail": "User deleted"}

# ---------------------
# Routes: Posts
# ---------------------
@app.post("/post", response_model=PostOut)
def create_post(p: PostCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = Post(title=p.title, content=p.content, category=p.category, author=current_user)
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
def list_posts(db: Session = Depends(get_db)):
    posts = db.query(Post).all()
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
    create_notification(db, recipient_id=post.user_id, actor_id=current_user.id, ntype="like", message=f"{current_user.name} liked your post")
    return {"detail": "Liked"}

# ---------------------
# Routes: Comments
# ---------------------
@app.post("/comments")
def create_comment(c: CommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == c.post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    comment = Comment(post_id=post.id, user_id=current_user.id, content=c.content)
    db.add(comment)
    db.commit()
    create_notification(db, recipient_id=post.user_id, actor_id=current_user.id, ntype="comment", message=f"{current_user.name} commented on your post")
    return {"detail": "Comment added"}

# ---------------------
# Routes: Chat (REST)
# ---------------------
@app.post("/chat/send", response_model=ChatMessageOut)
def send_chat(msg: ChatMessageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    recipient = db.query(User).filter(User.id == msg.recipient_id).first()
    if not recipient:
        raise HTTPException(404, "Recipient not found")
    chat = ChatMessage(sender_id=current_user.id, recipient_id=recipient.id, content=msg.content)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    # WS push
    for ws in list(chat_connections.get(recipient.id, [])):
        try:
            ws.send_json({"sender_id": current_user.id, "content": msg.content, "created_at": chat.created_at.isoformat()})
        except Exception:
            pass
    create_notification(db, recipient_id=recipient.id, actor_id=current_user.id, ntype="dm", message=f"{current_user.name} sent you a message")
    return chat

@app.get("/chat/history/{other_user_id}", response_model=List[ChatMessageOut])
def chat_history(other_user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msgs = db.query(ChatMessage).filter(
        ((ChatMessage.sender_id==current_user.id) & (ChatMessage.recipient_id==other_user_id)) |
        ((ChatMessage.sender_id==other_user_id) & (ChatMessage.recipient_id==current_user.id))
    ).order_by(ChatMessage.created_at).all()
    return msgs

# ---------------------
# Routes: Notifications
# ---------------------
@app.get("/notifications", response_model=List[NotificationOut])
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Notification).filter_by(recipient_id=current_user.id).order_by(Notification.created_at.desc()).all()

@app.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter_by(id=notif_id, recipient_id=current_user.id).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    notif.is_read = 1
    db.commit()
    return {"detail": "Marked as read"}

# ---------------------
# WebSockets
# ---------------------
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(ws: WebSocket, user_id: int):
    await ws.accept()
    add_connection(chat_connections, user_id, ws)
    try:
        while True:
            data = await ws.receive_text()  # optional: handle client sending over WS
    except WebSocketDisconnect:
        remove_connection(chat_connections, user_id, ws)

@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(ws: WebSocket, user_id: int):
    await ws.accept()
    add_connection(notification_connections, user_id, ws)
    try:
        while True:
            data = await ws.receive_text()
    except WebSocketDisconnect:
        remove_connection(notification_connections, user_id, ws)
