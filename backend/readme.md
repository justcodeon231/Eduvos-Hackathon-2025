# HackJam 2025 Backend

A simple API for the HackJam innovation platform. Built with FastAPI and SQLite.

## What it does

- Users can register and login
- Post ideas and projects
- Like posts
- See top posts

## Setup

1. Create virtual environment:
```
python -m venv venv
.\venv\Scripts\activate
```

2. Install packages:
```
pip install -r requirements.txt
```

3. Run the server:
```
uvicorn main:app --reload
```

The API will run at http://127.0.0.1:8000

## API Endpoints

Check out the API docs at http://127.0.0.1:8000/docs to try it out!

Main endpoints:
- POST /register - Create account
- POST /login - Get access token
- GET /posts - See all posts
- POST /posts - Add new post
- GET /posts/highlights - See top posts
- POST /posts/{id}/like - Like a post

## Database

Uses SQLite (hackjam.db file). Has two tables:
- users (id, email, name, password)
- posts (id, title, content, category, likes, user_id)

## Notes

- The database creates itself when you first run the server
- Everything is in main.py to keep it simple
- Uses JWT tokens for login (check the /docs page to see how to use them)