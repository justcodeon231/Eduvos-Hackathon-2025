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
from typing import List
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
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())  # <-- added
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

class CommentCreate(BaseModel):
    post_id: int
    content: str

class CommentOut(BaseModel):
    id: int
    post_id: int
    user_id: int
    content: str
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

@app.post("/login", response_model=AuthResponse)  # AuthResponse includes token + user
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

"""
Call /posts?category=tech or /feed?category=events.
Leave category empty for the full feed.
Everything else stays exactly the same.
"""
@app.get("/feed", response_model=List[FeedPostOut])
def get_feed(
    category: str | None = None,
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
    return {"message": "Post liked!"}

@app.post("/comments", response_model=CommentOut)
def create_comment(comment: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    c = Comment(post_id=comment.post_id, user_id=current_user.id, content=comment.content)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@app.get("/posts/{post_id}/comments", response_model=List[CommentOut])
def get_comments(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.desc())
        .all()
    )

# -----------------------
# Commenting Endpoints
# -----------------------

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
# Messaging Endpoints
# ---------------------
# TODO: implement messaging system
# Create Message model, endpoints for sending/receiving messages
# For now, this is a placeholder (/conversations, /send, etc.)

# ---------------------
# User Dashboard Endpoints
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
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None

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


# @app.get("/me", response_model=UserOut)
# def me(current_user: User = Depends(get_current_user)):
#     return current_user

# ---------------------
# Local dev runner
# ---------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
