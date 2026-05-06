# FaceForge

Build your identity, shape your world.

## What is FaceForge?

FaceForge is a creator-first platform where people "forge" their digital presence through micro-apps. Think Facebook profiles meets App Store widgets.

### Core Features

**Face**: Your main identity page. Photos, bio, status — the classic stuff.

**Forges**: Mini-apps you drag onto your Face. Could be a portfolio, a shop, a blog, a game, a donation meter, or custom code. No coding required.

**Graph**: Not friends, but "Allies" (followers) and "Builders" (collaborators). Allies follow your updates. Builders can collaborate on your Forges.

**Spark**: Algorithm feeds you new Forges based on what you build, not just what you click. Discover creators, not just content.

## Architecture

### Database Schema (Supabase PostgreSQL)

- **profiles**: User identity and metadata
- **forges**: Mini-apps with config and code
- **face_layout**: Position of forges on user's Face
- **allies**: Follow/follower relationships
- **builders**: Collaborators on forges
- **interactions**: Views, likes, shares, comments for feed algorithm
- **spark_feed**: Personalized feed with relevance scores

All tables use Row Level Security (RLS) for privacy.

### Tech Stack

- **Frontend**: Next.js 16 + React with TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Real-time**: Supabase Realtime WebSockets (via direct queries)
- **UI**: shadcn/ui + Tailwind CSS

### Project Structure

```
app/
  page.tsx                          # Home/landing page
  auth/
    login/                          # Login page
    sign-up/                        # Signup page
    callback/                       # Auth callback
  dashboard/                        # User dashboard
    forges/
      create/                       # Create new forge
      [id]/edit/                    # Edit forge
  profile/
    [username]/                     # Public profile page
  spark/                            # Discovery feed
    [forgeId]/                      # View forge
  api/
    profiles/                       # Profile CRUD
    forges/                         # Forge CRUD
    face-layout/                    # Layout management
    allies/                         # Follow system
    builders/                       # Collaboration
    interactions/                   # Track engagement
    spark-feed/                     # Feed algorithm

components/
  profile/                          # Profile components
  forges/                          # Forge viewers

lib/
  supabase/                        # Supabase client setup
  forge-templates.ts               # Forge template configs
```

## Forge Templates

FaceForge supports 7 forge types:

1. **Portfolio** (🎨) - Showcase projects and work
2. **Blog** (📝) - Write and share articles
3. **Gallery** (🖼️) - Display images and artwork
4. **Shop** (🛍️) - Sell products and services
5. **Donation** (❤️) - Collect tips and support
6. **Game** (🎮) - Create mini-games
7. **Custom** (⚙️) - Write your own HTML/CSS/JS

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account (for database and auth)

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure Supabase**:
   - Create a new Supabase project
   - Update environment variables in `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

3. **Run migrations**:
   - The database schema is auto-created via the Supabase MCP during setup

4. **Start dev server**:
   ```bash
   pnpm dev
   ```

5. **Access the app**:
   - Open http://localhost:3000

## Usage

### For Users

1. **Sign up** at `/auth/sign-up`
2. **Create your profile** with avatar, bio, and cover image
3. **Create forges** from your dashboard with pre-built templates or custom code
4. **Arrange your Face** by dragging forges onto your profile canvas
5. **Publish forges** to make them visible to the world
6. **Follow creators** on the Spark feed to build your Allies list
7. **Collaborate** by adding Builders to your forges

### For Developers

**Creating a Custom Forge**:

```typescript
// Create with type 'custom'
POST /api/forges
{
  "name": "My Game",
  "template_type": "custom",
  "config": { "customCode": "..." }
}

// Custom code has access to document and DOM
// Code runs in a sandboxed iframe for security
```

**Interacting with Forges**:

```typescript
// Record user engagement
POST /api/interactions
{
  "forge_id": "...",
  "interaction_type": "view|like|share|comment"
}
```

## Feed Algorithm

The Spark feed is powered by:

1. **Allies-based**: Forges from people you follow appear first
2. **Interaction-based**: Your engagement (views, likes, shares) influences what you see
3. **Relevance scoring**: Each interaction increases a forge's relevance score
4. **Freshness**: Recent forges prioritized over older ones

## Real-time Features

FaceForge uses Supabase Realtime for:

- Live profile updates
- Feed changes when you follow new creators
- Interaction counts

Real-time subscriptions can be added via `supabase.from('table_name').on('*', ...)`.

## Security

- **Row Level Security (RLS)**: Users can only see/modify their own data
- **Sandboxed Custom Code**: Custom forges run in iframes with restricted permissions
- **Password Hashing**: Supabase handles bcrypt hashing
- **Session Management**: HTTP-only cookies via Supabase Auth

## Future Enhancements

- Real-time WebSocket subscriptions for live updates
- Drag-and-drop forge builder UI
- Advanced forge templates (e.g., marketplace, community forum)
- Creator analytics dashboard
- Monetization features (tips, subscriptions, Stripe integration)
- Social features (comments, reactions, messaging)
- Mobile app

## API Routes

### Profiles
- `GET /api/profiles?userId=X` - Get user profile
- `PUT /api/profiles` - Update own profile

### Forges
- `POST /api/forges` - Create forge
- `GET /api/forges?id=X` - Get forge details
- `PUT /api/forges` - Update forge
- `DELETE /api/forges?id=X` - Delete forge

### Face Layout
- `GET /api/face-layout?userId=X` - Get forge positions
- `POST /api/face-layout` - Add forge to face
- `PUT /api/face-layout` - Update position
- `DELETE /api/face-layout?id=X` - Remove forge

### Allies (Follow System)
- `GET /api/allies?userId=X&type=followers|following` - Get followers/following
- `POST /api/allies` - Follow user
- `DELETE /api/allies?following_id=X` - Unfollow user

### Builders (Collaboration)
- `GET /api/builders?forgeId=X` - Get collaborators
- `POST /api/builders` - Add collaborator
- `DELETE /api/builders?id=X` - Remove collaborator

### Interactions & Feed
- `POST /api/interactions` - Record engagement
- `GET /api/spark-feed` - Get personalized feed

## License

MIT
