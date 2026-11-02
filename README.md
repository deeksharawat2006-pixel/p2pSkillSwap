# PeerLearn - Peer-to-Peer Learning Platform

A platform connecting college students for skill exchange and collaborative learning.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **Auth**: JWT + bcrypt
- **Real-time**: Socket.io (ready for WebRTC)

## Project Structure

```
PeerLearn/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── middleware/auth.js    # JWT authentication
│   │   ├── models/Student.js     # Student schema with skills/availability
│   │   ├── routes/
│   │   │   ├── auth.js           # Register, login, me
│   │   │   ├── profile.js        # Profile CRUD
│   │   │   └── peers.js          # Matching & search
│   │   ├── services/matchingService.js  # Skill-matching algorithm
│   │   └── app.js                # Express app
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx        # Sidebar navigation
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Profile.jsx       # Skills & availability editors
│   │   │   ├── Matches.jsx       # Smart matches + search
│   │   │   └── PeerProfile.jsx   # View other students
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── package.json                  # Root scripts
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Install all dependencies
npm run install:all

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI and JWT secret
```

### Development

```bash
# Run both frontend & backend
npm run dev

# Or separately:
npm run dev:backend   # http://localhost:5000
npm run dev:frontend  # http://localhost:5173
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new student
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Profile
- `GET /api/profile` - Get profile
- `PUT /api/profile` - Update profile
- `PUT /api/profile/skills/teach` - Update teaching skills
- `PUT /api/profile/skills/learn` - Update learning skills
- `PUT /api/profile/availability` - Update availability

### Peers (Matching & Discovery)
- `GET /api/peers/matches` - Get smart matches (algorithm)
- `GET /api/peers/search` - Search with filters
- `GET /api/peers/:id` - Get public profile

## Matching Algorithm

The algorithm scores peers based on:
- **Skill Overlap (40%)** - Complementary teach/learn skills
- **Availability Overlap (20%)** - Compatible time slots
- **Rating (15%)** - Peer's average rating
- **College/Branch Proximity (15%)** - Same institution/department
- **Proficiency Match (10%)** - Teaching level meets learning target

## Features Implemented

- [x] Student registration & JWT authentication
- [x] Profile management (bio, avatar, college, branch, year)
- [x] Skills I can teach / want to learn with proficiency levels
- [x] Weekly availability grid editor
- [x] Smart peer matching algorithm
- [x] Peer search with filters
- [x] Peer profile view with match details
- [x] Responsive dashboard with stats

## Next Steps

- Session booking & management
- Real-time chat (Socket.io)
- WebRTC video/audio calls
- Collaborative whiteboard (Canvas)
- Credit system
- Ratings & reviews
- Notifications