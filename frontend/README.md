# Eduvos Innovation Management Platform

A vibrant, student-friendly social platform built with Next.js 15 and FastAPI, featuring idea sharing, global forum, anonymous comments, real-time notifications, and analytics for university students aged 18-25.

## Features

- **Authentication System**: Secure JWT-based authentication with login/register functionality
- **Feed System**: Create, view, like, and comment on posts with read-more expansion and pagination
- **Global Forum**: Real-time chat-style forum with polling for live updates
- **Anonymous Comments**: All comments display as "Anonymous" to encourage open discussion
- **Real-time Notifications**: Polling-based notification system with badge and dropdown
- **Category Filtering**: Filter posts by categories (Ideas Hub, Collaborate/Brainstorm, Resources/Gamification, etc.)
- **Profile Management**: View and edit user profile information
- **Analytics Dashboard**: Track engagement metrics with interactive charts
- **Vibrant UI**: Modern, colorful design inspired by Threads, Reddit, and Twitter
- **Responsive Design**: Mobile-first design that works on all devices

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Icons**: Lucide React
- **State Management**: React Context API
- **HTTP Client**: Fetch API

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT with passlib
- **CORS**: Enabled for frontend integration
- **Profanity Filter**: Built-in content moderation

## Getting Started

### Prerequisites

- **Frontend**: Node.js 18.x or higher
- **Backend**: Python 3.10 or higher
- npm, yarn, or pnpm package manager
- pip for Python packages

### Backend Setup

1. Navigate to your backend directory (or create one):
\`\`\`bash
mkdir backend
cd backend
\`\`\`

2. Create a virtual environment:
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
\`\`\`

3. Install dependencies:
\`\`\`bash
pip install fastapi uvicorn sqlalchemy python-jose passlib python-multipart pydantic[email]
\`\`\`

4. Create `main.py` with the FastAPI backend code (provided separately)

5. Run the backend server:
\`\`\`bash
python main.py
# or
uvicorn main:app --reload --host 127.0.0.1 --port 8000
\`\`\`

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd eduvos-innovation
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

3. Configure environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit `.env.local` and set:
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8000
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env.local` file in the root directory:

\`\`\`env
# API Configuration (REQUIRED)
NEXT_PUBLIC_API_URL=http://localhost:8000

# For production, use your deployed backend URL:
# NEXT_PUBLIC_API_URL=https://your-backend-api.com
\`\`\`

### Environment Variable Descriptions

- `NEXT_PUBLIC_API_URL`: The base URL for your FastAPI backend. Must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

**Important Notes**:
- The backend runs on port 8000 by default
- The frontend runs on port 3000 by default
- CORS is configured in the backend to allow requests from the frontend
- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser

## Project Structure

\`\`\`
eduvos-innovation/
├── app/                          # Next.js App Router pages
│   ├── dashboard/               # Dashboard page with analytics
│   │   └── page.tsx
│   ├── login/                   # Login page
│   │   └── page.tsx
│   ├── profile/                 # User profile page
│   │   └── page.tsx
│   ├── register/                # Registration page
│   │   └── page.tsx
│   ├── globals.css              # Global styles and Tailwind config
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Home page (main feed)
│   └── forum/                   # Global forum page
│       └── page.tsx
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── comments-section.tsx     # Comments display and creation
│   ├── community-highlights.tsx # Community highlights section
│   ├── create-post-modal.tsx    # Modal for creating new posts
│   ├── dashboard-content.tsx    # Main dashboard content
│   ├── dashboard.tsx            # Dashboard sidebar widget
│   ├── engagement-feed.tsx      # Main feed with posts
│   ├── forum-content.tsx        # Global forum content
│   ├── header.tsx               # Top navigation header
│   ├── home-content.tsx         # Home page content wrapper
│   ├── idea-section.tsx         # Idea creation section
│   ├── login-form.tsx           # Login form component
│   ├── navigation.tsx           # Category navigation tabs
│   ├── notifications-dropdown.tsx # Notifications dropdown widget
│   ├── notifications.tsx        # Notifications sidebar
│   ├── profile-content.tsx      # Profile page content
│   ├── protected-route.tsx      # Route protection wrapper
│   ├── register-form.tsx        # Registration form component
│   └── upcoming-events.tsx      # Events calendar widget
│
├── contexts/                     # React Context providers
│   └── auth-context.tsx         # Authentication context
│
├── lib/                         # Utility functions and API
│   ├── api.ts                   # API service functions
│   ├── auth.ts                  # Authentication utilities
│   └── utils.ts                 # General utility functions
│
├── hooks/                       # Custom React hooks
│   ├── use-mobile.tsx           # Mobile detection hook
│   └── use-toast.ts             # Toast notification hook
│
└── public/                      # Static assets
\`\`\`

## Key Components

### Authentication Components

#### `contexts/auth-context.tsx`
Manages authentication state across the application.
- Stores JWT token in localStorage
- Provides login, logout, and register functions
- Automatically checks token validity on mount
- Exposes current user information

#### `components/protected-route.tsx`
Wrapper component that protects routes from unauthenticated access.
- Redirects to login if no valid token
- Shows loading state during authentication check
- Used to wrap protected pages

### Feed Components

#### `components/engagement-feed.tsx`
Main feed component that displays posts.
- Fetches posts from API with pagination
- Supports category filtering
- Displays like and comment counts
- Handles post interactions (like, comment)
- Implements "Load More" pagination
- Supports read-more expansion for long posts

#### `components/create-post-modal.tsx`
Modal for creating new posts.
- Form with title, content, and category selection
- Validates input before submission
- Calls API to create post
- Refreshes feed on success

#### `components/comments-section.tsx`
Displays and manages comments for a post.
- Fetches comments for specific post
- Allows adding new comments
- Shows user info and timestamps
- Flat comment structure (no nesting)
- Displays comments as "Anonymous"

### Navigation Components

#### `components/header.tsx`
Top navigation bar with search and user menu.
- Logo and home link
- Search functionality
- Notification bell
- User dropdown with profile and logout
- Main navigation links (Home, Dashboard, Forum)

#### `components/navigation.tsx`
Category navigation tabs.
- Displays category options
- Highlights active category
- Triggers category filter on click
- Responsive horizontal scroll

### Dashboard Components

#### `components/dashboard-content.tsx`
Full dashboard page with analytics.
- Displays stat cards (posts, likes, comments)
- Shows engagement chart over time
- Fetches data from dashboard API
- Uses Recharts for visualizations

### Forum Components

#### `components/forum-content.tsx`
Global forum content component.
- Real-time chat-style interface
- Polls for new messages every 5 seconds
- Displays sender's messages on the right
- Auto-scrolls to latest message
- Supports Enter to send and Shift+Enter for new line

### Notifications Components

#### `components/notifications-dropdown.tsx`
Dropdown component for notifications.
- Displays unread count badge
- Shows recent activity
- Supports marking notifications as read
- Highlights unread notifications

## API Integration

### Backend API Endpoints

The frontend integrates with the following FastAPI endpoints:

#### Authentication
- `POST /register` - Create new user account
  - Body: `{ name, email, password }`
  - Returns: `{ id, name, email }`
  
- `POST /login` - Authenticate user
  - Body: `{ email, password }`
  - Returns: `{ token, user: { id, name, email } }`

#### Posts & Feed
- `GET /feed?category=&offset=&limit=` - Get paginated posts
  - Query params: `category` (optional), `offset`, `limit`
  - Returns: Array of posts with likes/comments count
  
- `POST /post` - Create new post
  - Body: `{ title, content, category }`
  - Returns: Created post object
  
- `GET /posts/highlights` - Get top 4 posts by likes
  - Returns: Array of top posts
  
- `POST /posts/{id}/like` - Like a post
  - Returns: `{ message: "Post liked!" }`

#### Comments
- `GET /posts/{id}/comments` - Get comments for a post
  - Returns: Array of comments
  
- `POST /comments` - Create new comment
  - Body: `{ post_id, content }`
  - Returns: Created comment object
  
- `DELETE /comments/{id}` - Delete own comment
  - Returns: `{ message: "Comment deleted" }`

#### Profile
- `GET /profile` - Get current user profile
  - Returns: `{ id, name, email }`
  
- `PUT /profile` - Update user profile
  - Body: `{ name?, email?, password? }`
  - Returns: Updated user object

#### Dashboard
- `GET /dashboard` - Get user statistics
  - Returns: `{ user, stats: { total_posts, likes_received, comments_received, engagement_last_7_days } }`

#### Notifications (NEW)
- `GET /notifications?since=` - Get notifications for current user
  - Query params: `since` (optional ISO timestamp)
  - Returns: Array of notifications
  
- `PATCH /notifications/{id}/read` - Mark notification as read
  - Returns: `{ message: "Marked as read" }`

### API Service (`lib/api.ts`)

The API service provides typed functions for all backend interactions with automatic JWT token handling and error management.

## Backend Data Models

### User
- `id`: Integer (Primary Key)
- `email`: String (Unique)
- `name`: String
- `password_hash`: String

### Post
- `id`: Integer (Primary Key)
- `title`: String
- `content`: String
- `category`: String
- `created_at`: DateTime
- `user_id`: Integer (Foreign Key)

### Comment
- `id`: Integer (Primary Key)
- `post_id`: Integer (Foreign Key)
- `user_id`: Integer (Foreign Key)
- `content`: String
- `created_at`: DateTime
- `author_display`: String (Always "Anonymous")

### PostLike
- `id`: Integer (Primary Key)
- `post_id`: Integer (Foreign Key)
- `user_id`: Integer (Foreign Key)
- `created_at`: DateTime
- Unique constraint on (post_id, user_id)

## Category Mapping

The frontend uses display names that map to backend category values:

| Frontend Display | Backend Value |
|-----------------|---------------|
| Home | (no filter) |
| Ideas Hub | ideas |
| Collaborate/Brainstorm | collaborate |
| Resources/Gamification | resources |
| Research Guardians | research |
| Forum | forum |

## Development Workflow

### Running Both Frontend and Backend

1. **Terminal 1 - Backend**:
\`\`\`bash
cd backend
source venv/bin/activate
python main.py
\`\`\`

2. **Terminal 2 - Frontend**:
\`\`\`bash
npm run dev
\`\`\`

3. Access the application at `http://localhost:3000`

### Testing the Integration

1. **Register a new user**:
   - Go to `/register`
   - Create an account
   - You'll be automatically logged in

2. **Create posts**:
   - Click "Create Post" button
   - Fill in title, content, and category
   - Post will appear in the feed

3. **Interact with posts**:
   - Like posts by clicking the thumbs up icon
   - Comment on posts by clicking the comment icon
   - View your stats in the dashboard

4. **Test Forum**:
   - Navigate to `/forum`
   - Post a message
   - Open multiple browser windows to test real-time updates

5. **Test Notifications**:
   - Create posts and comments from different accounts
   - Watch notification badge update
   - Click bell icon to view notifications

### Mock Data vs Real API

The application is configured to work with the real FastAPI backend. If you need to work without the backend:

1. Update `lib/api.ts` to return mock data
2. Comment out API calls and return static data
3. This is useful for UI development without backend dependency

## Customization Guide

### Adding New Features

#### 1. Add a New Page
\`\`\`bash
# Create page file
mkdir app/new-page
touch app/new-page/page.tsx
\`\`\`

\`\`\`tsx
// app/new-page/page.tsx
import { ProtectedRoute } from "@/components/protected-route"
import { NewPageContent } from "@/components/new-page-content"

export default function NewPage() {
  return (
    <ProtectedRoute>
      <NewPageContent />
    </ProtectedRoute>
  )
}
\`\`\`

#### 2. Add a New API Endpoint

**Backend** (`main.py`):
\`\`\`python
@app.get("/new-endpoint")
def new_endpoint(current_user: User = Depends(get_current_user)):
    return {"data": "your data"}
\`\`\`

**Frontend** (`lib/api.ts`):
\`\`\`typescript
export const newApi = {
  async getData(): Promise<DataType> {
    return fetchWithAuth(\`\${API_BASE_URL}/new-endpoint\`)
  },
}
\`\`\`

#### 3. Modify Post Truncation Length
Edit `components/engagement-feed.tsx`:
\`\`\`typescript
const shouldTruncate = post.content.length > 200  // Change 200 to desired length
\`\`\`

#### 4. Change Forum Polling Interval
Edit `components/forum-content.tsx`:
\`\`\`typescript
const interval = setInterval(loadMessages, 5000)  // Change 5000 to desired ms
\`\`\`

#### 5. Customize Notification Polling
Edit `components/notifications-dropdown.tsx`:
\`\`\`typescript
const interval = setInterval(() => {
  loadNotifications(lastFetch)
}, 10000)  // Change 10000 to desired ms
\`\`\`

### Removing Features

#### Remove Post Pinning
Already removed from UI. To fully remove:
1. Remove Pin icon from `components/engagement-feed.tsx`
2. Remove pinning logic from backend if added

#### Remove Anonymous Comments
Edit `components/comments-section.tsx`:
\`\`\`typescript
// Change this:
<p className="font-semibold text-sm">{comment.author_display || "Anonymous"}</p>

// To this:
<p className="font-semibold text-sm">{comment.author_name}</p>
\`\`\`

Update backend to return author name in comments endpoint.

### Styling Customization

#### Change Primary Color
Edit `app/globals.css`:
\`\`\`css
:root {
  --primary: oklch(0.35 0.15 250);  /* Adjust hue (250) for different color */
}
\`\`\`

#### Adjust Card Shadows
Edit component files:
\`\`\`tsx
<Card className="shadow-sm">  // Change to shadow-md, shadow-lg, etc.
\`\`\`

#### Modify Border Radius
Edit `app/globals.css`:
\`\`\`css
:root {
  --radius: 0.5rem;  /* Change to 0.25rem, 1rem, etc. */
}
\`\`\`

## Deployment

### Backend Deployment

1. **Using a VPS or Cloud Server**:
\`\`\`bash
# Install dependencies
pip install -r requirements.txt

# Run with production server
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
\`\`\`

2. **Using Docker**:
\`\`\`dockerfile
FROM python:3.10
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

3. **Environment Variables for Production**:
\`\`\`bash
export SECRET_KEY="your-secret-key-here"
export DATABASE_URL="postgresql://..." # If using PostgreSQL
\`\`\`

### Frontend Deployment

Deploy to Vercel (recommended):
\`\`\`bash
vercel deploy
\`\`\`

Set environment variable in Vercel dashboard:
- `NEXT_PUBLIC_API_URL`: Your deployed backend URL

Or build for self-hosting:
\`\`\`bash
npm run build
npm run start
\`\`\`

## Common Issues

### Backend Connection Errors

**Problem**: "Failed to fetch" or CORS errors

**Solutions**:
- Verify backend is running: `curl http://localhost:8000`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure CORS is enabled in FastAPI backend
- Check firewall/antivirus isn't blocking ports

### Database Errors

**Problem**: SQLite database errors

**Solutions**:
- Delete `hackjam.db` file and restart backend
- Check file permissions on database file
- Ensure SQLAlchemy models match database schema

### Authentication Issues

**Problem**: Token expired or invalid

**Solutions**:
- Clear localStorage: `localStorage.clear()`
- Check JWT secret key matches between sessions
- Verify token expiry time (default 30 minutes)
- Re-login to get fresh token

### Port Conflicts

**Problem**: Port already in use

**Solutions**:
- Backend: Change port in `main.py`: `uvicorn.run("main:app", port=8001)`
- Frontend: Run on different port: `npm run dev -- -p 3001`
- Update `NEXT_PUBLIC_API_URL` accordingly

### Forum Not Updating
- Check backend is running
- Verify polling interval in browser console
- Check network tab for API calls every 5 seconds
- Clear browser cache

### Notifications Not Appearing
- Verify backend notification creation logic
- Check polling is active (network tab)
- Ensure user is logged in
- Check notification API returns data

### Comments Showing User Names
- Verify backend returns `author_display: "Anonymous"`
- Check frontend uses `comment.author_display`
- Clear browser cache

### Read More Not Working
- Check post content length > 200 characters
- Verify state management in engagement-feed
- Check console for errors
