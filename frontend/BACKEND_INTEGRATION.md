# Backend Integration Guide

This document explains how the frontend integrates with the FastAPI backend and provides troubleshooting tips.

## Architecture Overview

\`\`\`
┌─────────────────┐         HTTP/JSON          ┌──────────────────┐
│                 │ ◄─────────────────────────► │                  │
│  Next.js        │    JWT Authentication       │  FastAPI         │
│  Frontend       │    REST API Calls           │  Backend         │
│  (Port 3000)    │                             │  (Port 8000)     │
│                 │                             │                  │
└─────────────────┘                             └──────────────────┘
        │                                                │
        │                                                │
        ▼                                                ▼
  localStorage                                     SQLite DB
  (JWT Token)                                    (hackjam.db)
\`\`\`

## Authentication Flow

### Registration
1. User fills registration form (`/register`)
2. Frontend sends `POST /register` with `{ name, email, password }`
3. Backend validates and creates user
4. Frontend automatically logs in user
5. JWT token stored in localStorage

### Login
1. User fills login form (`/login`)
2. Frontend sends `POST /login` with `{ email, password }`
3. Backend validates credentials and returns `{ token, user }`
4. Frontend stores token in localStorage
5. User redirected to home page

### Protected Routes
1. Every API request includes `Authorization: Bearer <token>` header
2. Backend validates JWT token
3. If invalid/expired, backend returns 401
4. Frontend catches 401, clears token, redirects to login

## API Request Flow

### Example: Creating a Post

\`\`\`typescript
// 1. User clicks "Create Post" button
// 2. Modal opens with form

// 3. User submits form
const handleSubmit = async () => {
  // 4. Frontend calls API
  const post = await postsApi.createPost({
    title: "My Idea",
    content: "Description",
    category: "ideas"
  })
  
  // 5. API function adds JWT token
  const token = localStorage.getItem("auth_token")
  fetch(`${API_URL}/post`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
  
  // 6. Backend validates token
  // 7. Backend creates post in database
  // 8. Backend returns created post
  
  // 9. Frontend updates UI
  // 10. Feed refreshes to show new post
}
\`\`\`

## Data Transformation

The frontend transforms backend data to match UI requirements:

### Posts
\`\`\`typescript
// Backend response
{
  id: 1,
  title: "Post Title",
  content: "Content",
  category: "ideas",
  likes: 5,
  comments: 3,
  author: {
    id: 1,
    name: "John Doe",
    email: "john@example.com"
  },
  created_at: "2025-01-15T10:30:00Z"
}

// Frontend uses directly (no transformation needed)
\`\`\`

### Dashboard Stats
\`\`\`typescript
// Backend response
{
  user: { id, name, email },
  stats: {
    total_posts: 10,
    likes_received: 50,
    comments_received: 30,
    engagement_last_7_days: {
      likes: [{ date: "2025-01-15", count: 5 }],
      comments: [{ date: "2025-01-15", count: 3 }]
    }
  }
}

// Frontend transforms for chart
const engagementData = [
  { date: "2025-01-15", likes: 5, comments: 3 },
  { date: "2025-01-16", likes: 7, comments: 2 },
  // ...
]
\`\`\`

## Error Handling

### Backend Error Format
\`\`\`json
{
  "detail": "Error message here"
}
\`\`\`

### Frontend Error Handling
\`\`\`typescript
try {
  const result = await api.someFunction()
} catch (error) {
  // Error is automatically parsed from response
  console.error(error.message) // "Error message here"
  // Show error to user
  setError(error.message)
}
\`\`\`

### Common Error Codes

| Status | Meaning | Frontend Action |
|--------|---------|-----------------|
| 400 | Bad Request | Show validation error |
| 401 | Unauthorized | Logout and redirect to login |
| 403 | Forbidden | Show permission error |
| 404 | Not Found | Show "not found" message |
| 500 | Server Error | Show generic error message |

## CORS Configuration

The backend must allow requests from the frontend:

\`\`\`python
# Backend (main.py)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
\`\`\`

For production, update to your deployed frontend URL:
\`\`\`python
allow_origins=["https://your-frontend.vercel.app"]
\`\`\`

## Testing the Integration

### Manual Testing

1. **Test Registration**:
\`\`\`bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
\`\`\`

2. **Test Login**:
\`\`\`bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
\`\`\`

3. **Test Protected Endpoint**:
\`\`\`bash
curl -X GET http://localhost:8000/feed \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
\`\`\`

### Browser Testing

1. Open browser DevTools (F12)
2. Go to Network tab
3. Perform actions in the app
4. Check requests:
   - URL is correct
   - Headers include Authorization
   - Response status is 200
   - Response body has expected data

### Common Integration Issues

#### Issue: "Failed to fetch"
**Cause**: Backend not running or wrong URL
**Fix**: 
- Check backend is running: `curl http://localhost:8000`
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`

#### Issue: CORS error
**Cause**: Backend not allowing frontend origin
**Fix**: Update CORS settings in backend `main.py`

#### Issue: 401 Unauthorized
**Cause**: Invalid or expired token
**Fix**: 
- Clear localStorage and login again
- Check token is being sent in headers
- Verify JWT secret key hasn't changed

#### Issue: Data not displaying
**Cause**: Data structure mismatch
**Fix**:
- Check browser console for errors
- Verify API response matches TypeScript interfaces
- Add console.log to see actual data structure

## Debugging Tips

### Enable Request Logging

\`\`\`typescript
// lib/api.ts
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  console.log("[v0] API Request:", url, options)
  
  const response = await fetch(url, options)
  
  console.log("[v0] API Response:", response.status, await response.clone().json())
  
  return response
}
\`\`\`

### Check Token

\`\`\`javascript
// Browser console
localStorage.getItem("auth_token")
\`\`\`

### Decode JWT

\`\`\`javascript
// Browser console
const token = localStorage.getItem("auth_token")
const payload = JSON.parse(atob(token.split('.')[1]))
console.log(payload)
\`\`\`

### Monitor Backend Logs

\`\`\`bash
# Backend terminal will show all requests
INFO:     127.0.0.1:54321 - "POST /login HTTP/1.1" 200 OK
INFO:     127.0.0.1:54321 - "GET /feed HTTP/1.1" 200 OK
\`\`\`

## Performance Optimization

### Caching Strategies

1. **SWR for Data Fetching** (optional enhancement):
\`\`\`typescript
import useSWR from 'swr'

const { data, error } = useSWR('/feed', postsApi.getFeed)
\`\`\`

2. **Pagination**:
- Load 10 posts at a time
- Implement "Load More" button
- Cache previous pages

3. **Optimistic Updates**:
\`\`\`typescript
// Update UI immediately, rollback on error
const handleLike = async (postId) => {
  // Update UI
  setPosts(prev => updateLikes(prev, postId))
  
  try {
    await postsApi.likePost(postId)
  } catch (error) {
    // Rollback on error
    setPosts(prev => revertLikes(prev, postId))
  }
}
\`\`\`

## Security Considerations

1. **JWT Storage**: Currently using localStorage. For production, consider:
   - httpOnly cookies (more secure)
   - Refresh token mechanism
   - Token rotation

2. **XSS Protection**: 
   - Never use `dangerouslySetInnerHTML`
   - Sanitize user input
   - Use Content Security Policy

3. **HTTPS**: Always use HTTPS in production

4. **Environment Variables**: Never commit `.env.local` to git

## Migration Guide

### Switching from Mock Data to Real API

1. Remove mock data from components
2. Update `NEXT_PUBLIC_API_URL` in `.env.local`
3. Start backend server
4. Test all features end-to-end

### Switching Database (SQLite to PostgreSQL)

1. Update backend database URL
2. Run migrations
3. No frontend changes needed (API contract stays same)

### Adding New Endpoints

1. Add endpoint to backend
2. Add TypeScript interface for response
3. Add function to `lib/api.ts`
4. Use in components

Example:
\`\`\`typescript
// lib/api.ts
export interface Notification {
  id: number
  message: string
  read: boolean
}

export const notificationsApi = {
  async getNotifications(): Promise<Notification[]> {
    return fetchWithAuth(`${API_BASE_URL}/notifications`)
  }
}
