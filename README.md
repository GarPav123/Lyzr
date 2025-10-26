# Social Poll

A real-time opinion polling platform with sports integration. Users create polls, vote in real-time, and track live sports updates from the NBA.

## System Design & Architecture

### Technology Stack

**Backend:**
- FastAPI: Python web framework for REST APIs
- WebSocket: Real-time bidirectional communication
- In-memory storage: Dictionaries for polls, votes, likes, dislikes
- ESPN API: Live NBA game data integration

**Frontend:**
- Next.js 14: React framework with App Router
- TypeScript: Type-safe development
- Tailwind CSS: Utility-first styling
- shadcn/ui: Component library for dialogs, sheets, buttons
- React Hooks: State management (useState, useEffect, useRef)

### Architecture

```
Frontend (Next.js)              Backend (FastAPI)
├── WebSocket Connection  ←→   ├── ConnectionManager
├── REST API Calls         ←→   ├── REST Endpoints
├── Real-time Updates    ←→   ├── WebSocket Broadcasts
└── Local State               └── In-memory State
```

### Data Flow

1. **Poll Creation**: User creates poll → Frontend POSTs to `/api/polls` → Backend stores and broadcasts via WebSocket
2. **Voting**: User votes → Frontend POSTs to `/api/votes` → Backend calculates distribution → Broadcasts to all clients
3. **Real-time Updates**: Any action triggers WebSocket broadcast to all connected clients
4. **Sports Data**: Frontend fetches from `/api/sports/updates` → Backend calls ESPN API → Returns game data

### Key Components

- **ConnectionManager**: Manages active WebSocket connections and broadcasts
- **In-memory Storage**: Fast lookups for polls, votes, likes, dislikes, option_likes
- **WebSocket Events**: poll_created, vote_cast, poll_liked, poll_disliked, poll_deleted, option_liked
- **Frontend State**: votedPolls, userLikeDislike, likedOptions track user interactions client-side

## How to Run Locally

### Prerequisites

- Python 3.9+
- Node.js 18+ or Bun
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Lyzr
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Backend runs on `http://localhost:8000`

3. **Frontend Setup**
```bash
cd frontend
bun install
bun dev
```
Frontend runs on `http://localhost:3000`

4. **Start Both (Alternative)**
```bash
./start.sh
```

### API Endpoints

- `GET /api/polls` - Get all polls
- `GET /api/polls/{poll_id}` - Get poll with statistics
- `POST /api/polls` - Create poll
- `POST /api/votes` - Submit vote
- `POST /api/likes` - Like poll
- `POST /api/dislikes` - Dislike poll
- `POST /api/option-likes` - Like poll option
- `DELETE /api/polls/{poll_id}` - Delete poll
- `GET /api/sports/updates` - Get NBA game updates
- `GET /api/sports/game-details/{game_id}` - Get detailed game info

## APIs & Resources Used

### ESPN NBA Scoreboard API
- **Endpoint**: `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`
- **Purpose**: Fetch live NBA games and scores
- **Usage**: Returns current games with home/away teams, status, and scores
- **Format**: JSON response with events array containing competition data

### WebSocket Protocol
- **Endpoint**: `ws://localhost:8000/ws`
- **Purpose**: Real-time bidirectional communication
- **Events**: Broadcasts poll_created, vote_cast, poll_liked, poll_disliked, poll_deleted, option_liked
- **Reconnection**: Exponential backoff with max 5 attempts

### Development Resources
- **FastAPI**: https://fastapi.tiangolo.com/
- **Next.js**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs/

## Features

- Real-time polling with instant updates across all clients
- Like/dislike system with mutual exclusivity
- Sports integration for creating polls from live NBA games
- Delete polls with confirmation dialog
- Mobile-responsive design with Sheet sidebar
- Trending and Recent tabs for poll organization