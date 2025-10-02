from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, func
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from sqlalchemy.sql import func as sqlfunc
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
from typing import List
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import uuid

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
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

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

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(Integer, primary_key=True)
    token = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    expires_at = Column(DateTime)
    user = relationship("User", back_populates="refresh_tokens")

# Create tables once (after models defined)
if not os.path.exists(DB_FILE):
    Base.metadata.create_all(bind=engine)
else:
    # ensure tables exist (safe idempotent call)
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

class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

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
SECRET_KEY = os.getenv("SECRET_KEY", "hackjam2025")  # move to env var in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

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

def create_token(payload: dict, expires_delta: timedelta) -> str:
    data = payload.copy()
    data.update({"exp": datetime.utcnow() + expires_delta})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def create_tokens_and_persist(db: Session, user_email: str) -> (str, str):
    access = create_token({"sub": user_email}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_raw = str(uuid.uuid4())
    refresh = create_token({"sub": user_email, "jti": refresh_raw}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    # persist refresh by its jti (raw) + expiry
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    rt = RefreshToken(token=refresh_raw, user_id=db.query(User).filter(User.email == user_email).first().id, expires_at=expires_at)
    db.add(rt)
    db.commit()
    return access, refresh

def verify_refresh_and_rotate(db: Session, refresh_token: str) -> (str, str):
    # decode to get jti and sub (email)
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        email = payload.get("sub")
        if not jti or not email:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    # find persisted refresh by jti
    token_row = db.query(RefreshToken).filter(RefreshToken.token == jti).first()
    if not token_row:
        raise HTTPException(status_code=401, detail="Invalid or revoked refresh token")
    if token_row.expires_at < datetime.utcnow():
        # remove expired token
        db.delete(token_row)
        db.commit()
        raise HTTPException(status_code=401, detail="Expired refresh token")

    # rotate: remove old, create new
    db.delete(token_row)
    db.commit()
    access = create_token({"sub": email}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    new_refresh_raw = str(uuid.uuid4())
    new_refresh = create_token({"sub": email, "jti": new_refresh_raw}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    new_row = RefreshToken(token=new_refresh_raw, user_id=db.query(User).filter(User.email == email).first().id, expires_at=expires_at)
    db.add(new_row)
    db.commit()
    return access, new_refresh

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
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
# AUTH Routes
# ---------------------
@app.get("/")
def read_root():
    return {"message": "Welcome to HackJam 2025!"}

# Public: register
@app.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # basic password policy
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

# Public: login (form)
@app.post("/login", response_model=TokenOut)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access, refresh = create_tokens_and_persist(db, user.email)
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}

# Public: refresh endpoint (rotate refresh token)
@app.post("/refresh", response_model=TokenOut)
def refresh(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    access, new_refresh = verify_refresh_and_rotate(db, req.refresh_token)
    return {"access_token": access, "refresh_token": new_refresh, "token_type": "bearer"}

# ---------------------
# Authenticated endpoints below
# ---------------------
# Posts
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

@app.post("/posts", response_model=PostOut)
def create_post(post: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = Post(**post.dict(), user_id=current_user.id)
    db.add(p)
    db.commit()
    db.refresh(p)
    likes_count = 0
    return {
        "id": p.id,
        "title": p.title,
        "content": p.content,
        "category": p.category,
        "likes": likes_count,
        "author": {"id": current_user.id, "email": current_user.email, "name": current_user.name},
        "created_at": p.created_at
    }

@app.get("/posts/highlights", response_model=List[PostOut])
def get_highlights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # top posts by number of likes
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

@app.post("/posts/{post_id}/like")
def like_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    # Prevent double-like using DB unique constraint + catch IntegrityError
    new_like = PostLike(post_id=post_id, user_id=current_user.id)
    db.add(new_like)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Already liked
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

# ---------------------
# Comment Endpoints
# ---------------------

# Get all comments for a post
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

# Delete a comment (only owner can delete)
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


# Simple helper: get my profile
@app.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

# ---------------------
# Local dev runner
# ---------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
# To run: python Backend/main.py