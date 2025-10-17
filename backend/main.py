from fastapi import FastAPI, Depends, HTTPException
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
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

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
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")

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
    recipient_id = Column(Integer, ForeignKey("users.id"))  # who receives the notification
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # who performed the action (optional)
    notification_type = Column(String)  # "like", "comment", "share", etc.
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    message = Column(String)  # short human-readable message
    is_read = Column(Integer, default=0)  # 0 = unread, 1 = read
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())

    recipient = relationship("User", back_populates="notifications", foreign_keys=[recipient_id])

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
    class Config:
        from_attributes = True

# Comments: include author_display field for frontend (always "Anonymous")
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
PROFANITY = {"fuck", "shit", "bitch", "asshole", "bastard", "nigger", "cunt", "damn"}  # add/modify as needed

def contains_profanity(text: str) -> bool:
    if not text:
        return False
    lowered = text.lower()
    # crude check: words split by non-alpha, simple approach good enough for MVP
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
            "created_at": p.created_at
        })
    return out

@app.post("/post", response_model=PostOut)
def create_post(post: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = Post(**post.dict(), user_id=current_user.id)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {
        "id": p.id,
        "title": p.title,
        "content": p.content,
        "category": p.category,
        "likes": 0,
        "author": {"id": current_user.id, "email": current_user.email, "name": current_user.name},
        "created_at": p.created_at
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
            "created_at": p.created_at
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
            "created_at": post.created_at
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

    # create notification for post owner (if liker != owner)
    try:
        create_notification_for(db, recipient_id=post.user_id, actor_id=current_user.id, ntype="like",
                                message=f"{current_user.name} liked your post", post_id=post.id)
    except Exception:
        # notification failure should not break user experience
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

    # create notification for post owner (if commenter != owner)
    try:
        create_notification_for(db, recipient_id=post.user_id, actor_id=current_user.id, ntype="comment",
                                message=f"{current_user.name} commented on your post", post_id=post.id, comment_id=c.id)
    except Exception:
        db.rollback()

    # Return anonymous author_display
    return {
        "id": c.id,
        "post_id": c.post_id,
        "user_id": c.user_id,  # still returns ID (for internal use)
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
    # map to include author_display: always "Anonymous"
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
# Notifications API (pollable)
# ---------------------
@app.get("/notifications", response_model=List[NotificationOut])
def get_notifications(since: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Fetch notifications for current user.
    Optional query param `since` should be ISO-format timestamp (e.g. 2025-10-17T12:00:00Z).
    Frontend can poll every 10 seconds: GET /notifications?since=<last_ts>
    """
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
# User Dashboard Endpoints (unchanged)
# ---------------------
@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Total posts by user
    total_posts = db.query(func.count(Post.id)).filter(Post.user_id == current_user.id).scalar() or 0

    # Total likes received across user's posts
    likes_received = (
        db.query(func.count(PostLike.id))
        .join(Post, Post.id == PostLike.post_id)
        .filter(Post.user_id == current_user.id)
        .scalar() or 0
    )

    # Total comments received across user's posts
    comments_received = (
        db.query(func.count(Comment.id))
        .join(Post, Post.id == Comment.post_id)
        .filter(Post.user_id == current_user.id)
        .scalar() or 0
    )

    # Engagement per day for the last 7 days
    today = datetime.now(timezone.utc).date()
    seven_days_ago = today - timedelta(days=6)

    # Likes per day
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

    # Comments per day
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

    # Format output for frontend
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
            "engagement_last_7_days": engagement_last_7_days
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
# Local dev runner
# ---------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
