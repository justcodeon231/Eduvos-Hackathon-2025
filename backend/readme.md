# HackJam 2025 - MVP Backend

This is the backend API for the HackJam 2025 hackathon project. It’s built with **FastAPI** and **SQLite**, providing core functionality for a social media-like MVP, including user registration, authentication, posts, likes, and comments.

---

## Features

- **User Authentication**
  - Register new users
  - Login and receive JWT access tokens
- **Posts**
  - Create posts with title, content, and category
  - View all posts
  - View top 4 posts (most liked)
- **Likes**
  - Like a post (each user can like a post once)
- **Comments**
  - Comment on posts
- **Database**
  - SQLite database (`hackjam.db`) with SQLAlchemy ORM
- **Ready for Hackathon**
  - All core endpoints are functional
  - Minor improvements can enhance UX and extendability

---

## Tech Stack

- **Python 3.12+**
- **FastAPI**
- **SQLAlchemy**
- **SQLite**
- **PassLib (bcrypt)** for password hashing
- **JWT (JOSE)** for authentication

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/justcodeon231/Eduvos-Hackathon-2025
cd Eduvos-Hackathon-2025
````

2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. Install dependencies:

```bash
pip install fastapi uvicorn sqlalchemy passlib[bcrypt] python-jose
```

---

## Running the API

Run the backend using Uvicorn:

```bash
python -m uvicorn main:app --reload
```

* The server will run at `http://127.0.0.1:8000`
* Open Swagger UI for documentation and testing at `http://127.0.0.1:8000/docs`

---

## API Endpoints

### Root

* **GET /**
  Returns a welcome message.

### Users

* **POST /register**
  Register a new user. Returns user info.
* **POST /login**
  Login and receive JWT token.

### Posts

* **GET /posts**
  Get all posts.
* **POST /posts**
  Create a new post (requires JWT token).
* **GET /posts/highlights**
  Get top 4 posts by likes.
* **POST /posts/{post\_id}/like**
  Like a post (requires JWT token, one like per user).

### Comments

* **POST /comments**
  Create a comment on a post (requires JWT token).

---

## Models

**User**

* id, email, name, password\_hash

**Post**

* id, title, content, category, likes, user\_id, created\_at

**PostLike**

* id, post\_id, user\_id

**Comment**

* id, post\_id, user\_id, content, created\_at

---

## Notes

* JWT tokens expire after 30 minutes.
* Passwords are hashed with bcrypt.
* Likes are limited to 1 per user per post.
* Comments and likes are relational, stored in separate tables.

---

## TODO / Future Improvements

* Pagination for posts endpoint
* User profile endpoints
* Edit/delete posts and comments
* Real-time feed with WebSocket (optional)
* Frontend integration

---

## License

This project is A School Projectt.

