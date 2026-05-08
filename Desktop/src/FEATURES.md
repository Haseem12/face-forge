# FaceForge Platform - Features Guide

## Overview
FaceForge is a creator-first platform where users build their digital identity through customizable micro-apps (Forges) and discover new creators through an intelligent feed algorithm (Spark).

---

## Core Features

### 1. Face - Your Digital Identity
**Location**: `/profile/[username]`

Your Face is your main profile page showcasing who you are and what you create.

**Features:**
- Display name, bio, and profile pictures (avatar & cover)
- Drag-and-drop canvas showing all published Forges
- Public view for anyone to see your work
- Edit access only for profile owner

**What the algorithm tracks:**
- Profile views and interactions
- Forge engagement metrics

---

### 2. Forges - Mini-Apps You Create
**Location**: `/dashboard/forges`

Forges are customizable mini-applications you can add to your Face. Each Forge is a standalone widget with its own configuration and data.

#### 7 Built-in Templates

**Portfolio**
- Showcase your work with images and descriptions
- Config: title, description, items (with images/links), layout style
- Perfect for: designers, photographers, artists

**Blog**
- Share your thoughts and stories
- Config: posts (title, content, date), categories, featured image
- Perfect for: writers, thinkers, thought leaders

**Gallery**
- Display images in beautiful layouts
- Config: images (with captions), layout (grid/masonry), filters
- Perfect for: photographers, visual artists

**Shop**
- Sell products directly
- Config: products (name, price, image, description), inventory, stripe integration
- Perfect for: e-commerce creators, makers

**Donation**
- Accept donations from supporters
- Config: cause description, goal amount, payment methods
- Perfect for: nonprofits, creators seeking support

**Game**
- Embed or link to interactive games
- Config: game URL, description, rules
- Perfect for: game developers, educators

**Custom**
- Write custom HTML/CSS/JavaScript
- Config: custom code (rendered in sandboxed iframe)
- Perfect for: advanced developers

#### Forge Publishing
- **Draft Mode**: Only visible to you
- **Published Mode**: Visible on your Face and in the Spark feed
- You control what the world sees

---

### 3. Graph - Social Discovery
**Location**: `/dashboard` (manage), `/spark` (discover)

#### Allies (Followers)
- Follow other creators to see their latest Forges
- Get updates when people you follow publish new work
- Build your creator network

**How to use:**
1. Visit someone's profile page
2. Click "Follow" to become their Ally
3. Their published Forges appear in your personalized Spark feed

#### Builders (Collaborators)
- Invite others to collaborate on specific Forges
- Assign roles: owner, editor, collaborator
- Work together on Forge content and configuration

---

### 4. Spark - Personalized Discovery Algorithm
**Location**: `/spark`

The Spark feed shows you Forges tailored to your interests, updated in real-time.

#### How the Algorithm Works

The Spark algorithm uses a scoring system that calculates relevance for every Forge:

**Scoring Factors (in order of importance):**

1. **Following Bonus (+10 points)**
   - Forges from creators you follow appear first
   - Ensures you stay connected to people you care about

2. **Interest Matching (+5 points)**
   - Based on your interaction history
   - If you've interacted with Portfolio Forges, more Portfolio recommendations appear
   - Learning what you like and showing more of it

3. **Recency Bonus**
   - Last 24 hours: +5 points
   - Last 7 days: +3 points
   - Promotes fresh content while allowing discovery of older gems

4. **Deduplication**
   - Each Forge appears only once (most relevant position)
   - Prevents duplicate listings in your feed

#### Feed Generation Process

1. **Gather Data**
   - Get list of Forges you follow (from Allies)
   - Get list of Forges matching your interests
   - Get all published Forges in the system

2. **Calculate Scores**
   - For each Forge, calculate relevance score
   - Weight based on your history and connections

3. **Rank & Return**
   - Sort by score (highest first)
   - Return 50 Forges per page (limit: 20 shown at once)

4. **Real-time Updates**
   - Powered by Supabase Realtime
   - New Forges appear instantly
   - Scores update when people follow you or interact with Forges

#### Interaction Tracking

Every time you interact with a Forge, it's recorded:

**Interaction Types:**
- **View**: Automatically tracked when you visit a Forge
- **Like**: Rate Forges you love
- **Share**: Share Forges with others (bookmarking)
- **Comment**: Leave feedback (planned)

These interactions improve the algorithm's recommendations.

---

## How to Use Each Feature

### Creating Your First Forge

1. Go to **Dashboard** (`/dashboard`)
2. Click **Create New Forge**
3. Choose a template (Portfolio, Blog, Gallery, etc.)
4. Fill in the name and description
5. Configure the template settings (varies by type)
6. **Click Publish** to make it visible on your Face and in Spark feed
7. Share your Face URL with others: `yoursite.com/profile/yourusername`

### Following Other Creators

1. Visit someone's profile page
2. Click the **Follow** button in the header
3. Their latest Forges appear in your Spark feed
4. Click on any Forge to view it in detail

### Discovering New Forges

1. Go to **Spark** (`/spark`)
2. Browse through personalized recommendations
3. Click a Forge to view details and creator profile
4. Interact with Forges to improve future recommendations

### Customizing Your Face Layout

1. Go to **Dashboard** (`/dashboard`)
2. Click **View Profile**
3. On your profile page, click **Edit Layout**
4. Drag Forges to reposition them
5. Resize Forges to create custom layouts
6. Changes save automatically

---

## Database Schema

### Key Tables

**profiles**
- User info (display_name, bio, avatar, cover)
- One per authenticated user

**forges**
- Forge definitions (name, template_type, config, is_published)
- Owned by users

**face_layout**
- Position and size of Forges on user's Face
- Enables custom layouts

**allies**
- Follow relationships between users
- Enables social discovery

**builders**
- Collaboration relationships
- Enables multi-user Forge creation

**interactions**
- User engagement tracking (views, likes, shares)
- Powers the Spark algorithm

**spark_feed**
- Pre-calculated relevance scores
- Enables fast feed generation

---

## API Endpoints

### Profiles
- `GET /api/profiles` - Get current user's profile
- `PUT /api/profiles` - Update profile
- `POST /api/profiles` - Create profile on signup

### Forges
- `GET /api/forges?id=...` - Get Forge details
- `POST /api/forges` - Create new Forge
- `PUT /api/forges` - Update Forge
- `DELETE /api/forges?id=...` - Delete Forge

### Face Layout
- `GET /api/face-layout?userId=...` - Get layout
- `POST /api/face-layout` - Add Forge to Face
- `PUT /api/face-layout` - Update Forge position
- `DELETE /api/face-layout?id=...` - Remove Forge from Face

### Social Graph
- `POST /api/allies` - Follow user
- `DELETE /api/allies` - Unfollow user
- `GET /api/allies?userId=...` - List followers/following

### Interactions & Feed
- `POST /api/interactions` - Track interaction
- `GET /api/spark-feed?limit=50` - Get personalized feed

---

## Future Features (Roadmap)

- 📱 Mobile app
- 🎥 Video Forge template
- 💬 Comments and discussions
- 🎨 Custom themes
- 📊 Analytics dashboard
- 🔔 Notifications
- 🌐 Domain mapping
- 🚀 Forge templates marketplace
- 🤖 AI-powered recommendations

---

## Tips for Success

1. **Create Multiple Forges**: Don't just have one. Build a portfolio, blog, gallery, etc.
2. **Publish Early**: Get your work out there. You can always edit later.
3. **Follow Others**: The Spark algorithm works better when you follow creators you care about.
4. **Interact**: View, like, and share Forges. This trains the algorithm.
5. **Customize**: Make your Face unique. Arrange your Forges in interesting ways.
6. **Share**: Tell friends about your Face. More followers = better recommendations.

---

## Support

For issues or questions:
1. Check this guide
2. Review the README.md
3. Open an issue in GitHub
4. Contact support at support@faceforge.app
