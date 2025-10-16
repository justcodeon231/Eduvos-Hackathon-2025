# Eduvos Innovation Management Platform

A comprehensive innovation management platform built with Next.js 15, featuring idea sharing, collaboration tools, event management, and analytics for educational institutions.

## Features

- **Authentication System**: Secure JWT-based authentication with login/register functionality
- **Feed System**: Create, view, like, and comment on posts with pagination
- **Category Filtering**: Filter posts by categories (Ideas Hub, Collaborate/Brainstorm, Resources/Gamification, etc.)
- **Profile Management**: View and edit user profile information
- **Analytics Dashboard**: Track engagement metrics with interactive charts
- **Real-time Updates**: Dynamic content updates and notifications
- **Responsive Design**: Mobile-first design that works on all devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Icons**: Lucide React
- **State Management**: React Context API
- **HTTP Client**: Fetch API

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm package manager

### Installation

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

3. Configure environment variables (see Environment Variables section below)

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

Create a `.env.local` file in the root directory with the following variables:

\`\`\`env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Optional: Add other environment variables as needed
\`\`\`

### Environment Variable Descriptions

- `NEXT_PUBLIC_API_URL`: The base URL for your backend API. This must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

**Note**: Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Keep sensitive keys without this prefix to keep them server-side only.

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
│   └── page.tsx                 # Home page (main feed)
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
│   ├── header.tsx               # Top navigation header
│   ├── home-content.tsx         # Home page content wrapper
│   ├── idea-section.tsx         # Idea creation section
│   ├── login-form.tsx           # Login form component
│   ├── navigation.tsx           # Category navigation tabs
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

### Navigation Components

#### `components/header.tsx`
Top navigation bar with search and user menu.
- Logo and home link
- Search functionality
- Notification bell
- User dropdown with profile and logout
- Main navigation links (Home, Dashboard)

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

## API Integration

### API Service (`lib/api.ts`)

The API service provides functions for all backend interactions:

#### Authentication
- `login(email, password)`: Authenticate user and return JWT
- `register(name, email, password)`: Create new user account

#### Posts
- `getPosts(offset, limit, category)`: Fetch paginated posts
- `createPost(title, content, category)`: Create new post
- `likePost(postId)`: Like a post
- `unlikePost(postId)`: Unlike a post

#### Comments
- `getComments(postId)`: Fetch comments for a post
- `createComment(postId, content)`: Add comment to post

#### Profile
- `getProfile()`: Fetch current user profile
- `updateProfile(data)`: Update user profile

#### Dashboard
- `getDashboard()`: Fetch dashboard statistics

### API Response Handling

All API functions include:
- Automatic JWT token inclusion in headers
- Error handling with descriptive messages
- JSON response parsing
- Token expiry detection and logout

## Adding New Features

### Adding a New Page

1. Create a new directory in `app/`:
\`\`\`bash
mkdir app/new-page
\`\`\`

2. Create `page.tsx`:
\`\`\`tsx
import { ProtectedRoute } from "@/components/protected-route"

export default function NewPage() {
  return (
    <ProtectedRoute>
      <div>Your content here</div>
    </ProtectedRoute>
  )
}
\`\`\`

3. Add navigation link in `components/header.tsx`:
\`\`\`tsx
const mainNavItems = [
  // ... existing items
  { href: "/new-page", label: "New Page", icon: YourIcon },
]
\`\`\`

### Adding a New API Endpoint

1. Add function to `lib/api.ts`:
\`\`\`tsx
export async function newApiFunction(params: any) {
  const token = localStorage.getItem("token")
  const response = await fetch(`${API_URL}/endpoint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  })
  
  if (!response.ok) {
    throw new Error("Error message")
  }
  
  return response.json()
}
\`\`\`

2. Use in component:
\`\`\`tsx
import { newApiFunction } from "@/lib/api"

// In component
const handleAction = async () => {
  try {
    const result = await newApiFunction(data)
    // Handle success
  } catch (error) {
    // Handle error
  }
}
\`\`\`

### Adding a New Component

1. Create component file in `components/`:
\`\`\`tsx
// components/new-component.tsx
export function NewComponent() {
  return <div>Component content</div>
}
\`\`\`

2. Import and use in pages:
\`\`\`tsx
import { NewComponent } from "@/components/new-component"
\`\`\`

### Adding a New Category

1. Update `components/navigation.tsx`:
\`\`\`tsx
const navItems = [
  // ... existing items
  "New Category",
]
\`\`\`

2. The category will automatically work with the existing feed filtering system.

## Modifying Features

### Changing Authentication Flow

Edit `contexts/auth-context.tsx` to modify:
- Token storage location (localStorage vs cookies)
- Token refresh logic
- User data structure
- Authentication state management

### Customizing Post Display

Edit `components/engagement-feed.tsx` to modify:
- Post card layout
- Interaction buttons
- Metadata display
- Loading states

### Updating Styles

1. Global styles: Edit `app/globals.css`
2. Component styles: Modify Tailwind classes in component files
3. Theme colors: Update CSS variables in `globals.css`:
\`\`\`css
@theme inline {
  --color-primary: /* your color */;
  --color-secondary: /* your color */;
}
\`\`\`

## Removing Features

### Removing a Page

1. Delete the page directory:
\`\`\`bash
rm -rf app/page-name
\`\`\`

2. Remove navigation links from `components/header.tsx`

### Removing a Feature from Feed

1. Edit `components/engagement-feed.tsx`
2. Remove the feature's UI elements and event handlers
3. Remove related API calls from `lib/api.ts`

### Removing Authentication

**Not recommended**, but if needed:
1. Remove `ProtectedRoute` wrappers from pages
2. Remove `AuthProvider` from `app/layout.tsx`
3. Remove authentication-related API calls
4. Remove login/register pages

## Development Tips

### Mock Data for Development

When backend is not available, you can mock API responses:

\`\`\`tsx
// lib/api.ts
export async function getPosts() {
  // Return mock data instead of API call
  return {
    posts: [
      { id: 1, title: "Mock Post", content: "Content", likes: 5 }
    ]
  }
}
\`\`\`

### Debugging

Use console.log with `[v0]` prefix for debugging:
\`\`\`tsx
console.log("[v0] User data:", userData)
console.log("[v0] API response:", response)
\`\`\`

### Testing Protected Routes

1. Login with valid credentials
2. Check localStorage for token: `localStorage.getItem("token")`
3. Try accessing protected pages
4. Clear token to test redirect: `localStorage.removeItem("token")`

## Common Issues

### API Connection Errors

- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend server is running
- Verify CORS is configured on backend

### Authentication Issues

- Clear localStorage: `localStorage.clear()`
- Check token format in API responses
- Verify JWT is being sent in headers

### Styling Issues

- Clear Next.js cache: `rm -rf .next`
- Restart development server
- Check Tailwind class names are correct

## Building for Production

\`\`\`bash
npm run build
npm run start
\`\`\`

Or deploy to Vercel:
\`\`\`bash
vercel deploy
\`\`\`

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Your License Here]

## Support

For issues or questions, please contact [your-email@example.com]
