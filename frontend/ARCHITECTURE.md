# Architecture Documentation

## Overview

The Eduvos Innovation Management Platform follows a modern Next.js architecture with clear separation of concerns and modular component design.

## Architecture Principles

### 1. Component-Based Architecture
- Small, reusable components
- Single responsibility principle
- Props-based communication
- Composition over inheritance

### 2. Client-Server Separation
- Client components for interactivity (`"use client"`)
- Server components for data fetching (default)
- API routes for backend communication
- Clear boundary between frontend and backend

### 3. State Management
- React Context for global state (authentication)
- Local state for component-specific data
- No external state management library needed
- Props drilling avoided through context

### 4. Data Flow

\`\`\`
User Action → Component → API Service → Backend API
                ↓                           ↓
            Local State ← Response ← JSON Data
                ↓
            UI Update
\`\`\`

## Directory Structure Explained

### `/app` - Application Routes
Next.js 15 App Router structure where folders define routes:
- Each folder with `page.tsx` becomes a route
- `layout.tsx` wraps all child routes
- Automatic code splitting per route
- File-based routing system

### `/components` - UI Components
Reusable React components organized by function:
- `ui/` - Base components from shadcn/ui
- Feature components - Specific to application features
- Layout components - Header, navigation, etc.
- Form components - Login, register, create post

### `/contexts` - React Context Providers
Global state management:
- `auth-context.tsx` - Authentication state
- Wraps entire app in `layout.tsx`
- Provides state and actions to all components

### `/lib` - Utility Functions
Helper functions and services:
- `api.ts` - All API communication
- `auth.ts` - Authentication utilities
- `utils.ts` - General helpers (cn function, etc.)

### `/hooks` - Custom React Hooks
Reusable logic:
- `use-mobile.tsx` - Responsive design helper
- `use-toast.ts` - Toast notifications
- Can add custom hooks for shared logic

## Key Patterns

### 1. Protected Routes Pattern

\`\`\`tsx
// Wrap any page that requires authentication
<ProtectedRoute>
  <YourPageContent />
</ProtectedRoute>
\`\`\`

**How it works:**
1. Checks for valid JWT token
2. Redirects to login if not authenticated
3. Shows loading state during check
4. Renders children if authenticated

### 2. API Service Pattern

\`\`\`tsx
// Centralized API calls in lib/api.ts
export async function apiFunction() {
  const token = localStorage.getItem("token")
  const response = await fetch(`${API_URL}/endpoint`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.json()
}
\`\`\`

**Benefits:**
- Single source of truth for API calls
- Consistent error handling
- Easy to mock for testing
- Automatic token inclusion

### 3. Context Provider Pattern

\`\`\`tsx
// contexts/auth-context.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Usage in components
const { user, login } = useAuth()
\`\`\`

**Benefits:**
- Avoid props drilling
- Global state access
- Clean component APIs

### 4. Composition Pattern

\`\`\`tsx
// Build complex UIs from simple components
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
\`\`\`

**Benefits:**
- Flexible layouts
- Reusable components
- Easy to maintain

## Data Flow Examples

### Authentication Flow

\`\`\`
1. User enters credentials
   ↓
2. LoginForm calls login() from useAuth()
   ↓
3. AuthContext calls API.login()
   ↓
4. API returns JWT token
   ↓
5. Token stored in localStorage
   ↓
6. User state updated in context
   ↓
7. ProtectedRoute allows access
   ↓
8. User redirected to home page
\`\`\`

### Post Creation Flow

\`\`\`
1. User clicks "Write a new idea"
   ↓
2. CreatePostModal opens
   ↓
3. User fills form and submits
   ↓
4. Modal calls API.createPost()
   ↓
5. API sends POST request with JWT
   ↓
6. Backend creates post
   ↓
7. Modal closes and calls onSuccess()
   ↓
8. Parent component refreshes feed
   ↓
9. New post appears in feed
\`\`\`

### Category Filtering Flow

\`\`\`
1. User clicks category tab
   ↓
2. Navigation calls onCategoryChange()
   ↓
3. Parent updates activeCategory state
   ↓
4. EngagementFeed receives new category prop
   ↓
5. useEffect triggers with new category
   ↓
6. API.getPosts() called with category filter
   ↓
7. Posts filtered by category returned
   ↓
8. Feed re-renders with filtered posts
\`\`\`

## Component Communication

### Parent to Child (Props)
\`\`\`tsx
<EngagementFeed category={activeCategory} />
\`\`\`

### Child to Parent (Callbacks)
\`\`\`tsx
<Navigation onCategoryChange={handleCategoryChange} />
\`\`\`

### Sibling to Sibling (Lift State Up)
\`\`\`tsx
// Parent component
const [category, setCategory] = useState("Home")

return (
  <>
    <Navigation category={category} onChange={setCategory} />
    <Feed category={category} />
  </>
)
\`\`\`

### Global State (Context)
\`\`\`tsx
const { user } = useAuth() // Available anywhere
\`\`\`

## Performance Considerations

### 1. Code Splitting
- Automatic per-route splitting by Next.js
- Dynamic imports for large components
- Lazy loading for modals and dialogs

### 2. Memoization
- Use `useMemo` for expensive calculations
- Use `useCallback` for function props
- Use `React.memo` for pure components

### 3. Pagination
- Load data in chunks (offset/limit)
- "Load More" button instead of infinite scroll
- Prevents loading all data at once

### 4. Optimistic Updates
- Update UI immediately on user action
- Revert if API call fails
- Better perceived performance

## Security Considerations

### 1. JWT Storage
- Currently in localStorage
- Consider httpOnly cookies for production
- Implement token refresh mechanism

### 2. Protected Routes
- All authenticated pages wrapped in ProtectedRoute
- Server-side validation recommended
- Check token expiry

### 3. API Security
- Always send JWT in Authorization header
- Validate responses
- Handle 401 errors (token expired)
- Sanitize user input

### 4. XSS Prevention
- React escapes content by default
- Be careful with dangerouslySetInnerHTML
- Validate and sanitize user input

## Scalability Considerations

### Adding New Features
1. Create new component in `/components`
2. Add API function in `/lib/api.ts`
3. Create page in `/app` if needed
4. Update navigation if needed

### State Management Growth
- Current Context API works for small-medium apps
- Consider Zustand or Redux for complex state
- Keep state as local as possible

### API Layer Growth
- Consider splitting `api.ts` into multiple files
- Group by feature (posts-api.ts, users-api.ts)
- Add request/response interceptors
- Implement retry logic

## Testing Strategy

### Unit Tests
- Test utility functions in `/lib`
- Test custom hooks
- Test pure components

### Integration Tests
- Test component interactions
- Test API service functions
- Test authentication flow

### E2E Tests
- Test complete user flows
- Test critical paths (login, create post)
- Use Playwright or Cypress

## Future Improvements

### Short Term
- Add loading skeletons
- Implement error boundaries
- Add toast notifications for all actions
- Implement search functionality

### Medium Term
- Add real-time updates (WebSockets)
- Implement file uploads
- Add user mentions and tags
- Implement notifications system

### Long Term
- Add PWA support
- Implement offline mode
- Add analytics tracking
- Implement A/B testing framework

## Deployment Architecture

\`\`\`
User Browser
    ↓
Vercel Edge Network (CDN)
    ↓
Next.js Application (Serverless)
    ↓
Backend API (Your server)
    ↓
Database
\`\`\`

### Recommended Setup
- Frontend: Vercel (automatic deployments)
- Backend: Your preferred hosting
- Database: PostgreSQL (Supabase, Neon, etc.)
- File Storage: Vercel Blob or S3

## Monitoring and Debugging

### Development
- React DevTools for component inspection
- Network tab for API calls
- Console logs with `[v0]` prefix
- Next.js error overlay

### Production
- Vercel Analytics for performance
- Error tracking (Sentry)
- API monitoring
- User analytics

## Conclusion

This architecture provides a solid foundation for a scalable, maintainable innovation management platform. The modular design allows for easy feature additions and modifications while maintaining code quality and performance.
