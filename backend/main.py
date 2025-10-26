from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime
import uuid
import requests

app = FastAPI(title="QuickPoll API", description="Real-time polling platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

polls: Dict[str, Dict] = {}
votes: Dict[str, List] = {}
likes: Dict[str, List] = {}
dislikes: Dict[str, List] = {}
option_likes: Dict[str, List] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

class PollCreate(BaseModel):
    question: str
    options: List[str]
    category: str = "General"

class VoteCreate(BaseModel):
    poll_id: str
    option_index: int

class LikeCreate(BaseModel):
    poll_id: str

class DislikeCreate(BaseModel):
    poll_id: str

class OptionLikeCreate(BaseModel):
    poll_id: str
    option_index: int

@app.get("/")
def read_root():
    return {"message": "QuickPoll API is running", "version": "1.0.0"}

@app.get("/api/polls")
def get_all_polls():
    return {"polls": list(polls.values())}

@app.get("/api/polls/{poll_id}")
def get_poll(poll_id: str):
    if poll_id not in polls:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    poll = polls[poll_id].copy()
    poll["vote_count"] = len(votes.get(poll_id, []))
    poll["like_count"] = len(likes.get(poll_id, []))
    poll["dislike_count"] = len(dislikes.get(poll_id, []))
    
    vote_distribution = {}
    for vote in votes.get(poll_id, []):
        option_idx = vote["option_index"]
        vote_distribution[option_idx] = vote_distribution.get(option_idx, 0) + 1
    
    poll["vote_distribution"] = vote_distribution
    
    option_like_counts = {}
    for like in option_likes.get(poll_id, []):
        idx = like["option_index"]
        option_like_counts[idx] = option_like_counts.get(idx, 0) + 1
    
    poll["option_like_counts"] = option_like_counts
    
    return poll

@app.post("/api/polls")
async def create_poll(poll: PollCreate):
    poll_id = str(uuid.uuid4())
    
    new_poll = {
        "id": poll_id,
        "question": poll.question,
        "options": poll.options,
        "category": poll.category,
        "created_at": datetime.now().isoformat(),
        "vote_count": 0,
        "like_count": 0,
        "dislike_count": 0
    }
    
    polls[poll_id] = new_poll
    votes[poll_id] = []
    likes[poll_id] = []
    if poll_id not in dislikes:
        dislikes[poll_id] = []
    
    await manager.broadcast({
        "type": "poll_created",
        "poll": new_poll
    })
    
    return new_poll

@app.post("/api/votes")
async def create_vote(vote: VoteCreate):
    if vote.poll_id not in polls:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    poll = polls[vote.poll_id]
    if vote.option_index < 0 or vote.option_index >= len(poll["options"]):
        raise HTTPException(status_code=400, detail="Invalid option index")
    
    vote_id = str(uuid.uuid4())
    votes[vote.poll_id].append({
        "id": vote_id,
        "option_index": vote.option_index,
        "timestamp": datetime.now().isoformat()
    })
    
    vote_distribution = {}
    for v in votes[vote.poll_id]:
        option_idx = v["option_index"]
        vote_distribution[option_idx] = vote_distribution.get(option_idx, 0) + 1
    
    poll["vote_count"] = len(votes[vote.poll_id])
    
    await manager.broadcast({
        "type": "vote_cast",
        "poll_id": vote.poll_id,
        "vote_count": poll["vote_count"],
        "vote_distribution": vote_distribution
    })
    
    return {
        "id": vote_id,
        "poll_id": vote.poll_id,
        "option_index": vote.option_index,
        "vote_count": poll["vote_count"]
    }

@app.post("/api/likes")
async def create_like(like: LikeCreate):
    if like.poll_id not in polls:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    new_like = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat()
    }
    
    likes[like.poll_id].append(new_like)
    polls[like.poll_id]["like_count"] = len(likes[like.poll_id])
    
    await manager.broadcast({
        "type": "poll_liked",
        "poll_id": like.poll_id,
        "like_count": polls[like.poll_id]["like_count"]
    })
    
    return {
        "poll_id": like.poll_id,
        "like_count": polls[like.poll_id]["like_count"]
    }

@app.post("/api/dislikes")
async def create_dislike(dislike: DislikeCreate):
    if dislike.poll_id not in polls:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    new_dislike = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat()
    }
    
    dislikes[dislike.poll_id].append(new_dislike)
    polls[dislike.poll_id]["dislike_count"] = len(dislikes[dislike.poll_id])
    
    await manager.broadcast({
        "type": "poll_disliked",
        "poll_id": dislike.poll_id,
        "dislike_count": polls[dislike.poll_id]["dislike_count"]
    })
    
    return {
        "poll_id": dislike.poll_id,
        "dislike_count": polls[dislike.poll_id]["dislike_count"]
    }

@app.post("/api/option-likes")
async def create_option_like(option_like: OptionLikeCreate):
    if option_like.poll_id not in polls:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    poll = polls[option_like.poll_id]
    if option_like.option_index < 0 or option_like.option_index >= len(poll["options"]):
        raise HTTPException(status_code=400, detail="Invalid option index")
    
    if option_like.poll_id not in option_likes:
        option_likes[option_like.poll_id] = []
    
    new_like = {
        "id": str(uuid.uuid4()),
        "option_index": option_like.option_index,
        "timestamp": datetime.now().isoformat()
    }
    
    option_likes[option_like.poll_id].append(new_like)
    
    option_like_counts = {}
    for like in option_likes.get(option_like.poll_id, []):
        idx = like["option_index"]
        option_like_counts[idx] = option_like_counts.get(idx, 0) + 1
    
    await manager.broadcast({
        "type": "option_liked",
        "poll_id": option_like.poll_id,
        "option_like_counts": option_like_counts
    })
    
    return {
        "poll_id": option_like.poll_id,
        "option_index": option_like.option_index,
        "option_like_counts": option_like_counts
    }

@app.delete("/api/polls/{poll_id}")
async def delete_poll(poll_id: str):
    if poll_id not in polls:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    await manager.broadcast({
        "type": "poll_deleted",
        "poll_id": poll_id
    })
    
    if poll_id in polls:
        del polls[poll_id]
    if poll_id in votes:
        del votes[poll_id]
    if poll_id in likes:
        del likes[poll_id]
    if poll_id in dislikes:
        del dislikes[poll_id]
    if poll_id in option_likes:
        del option_likes[poll_id]
    
    return {"message": "Poll deleted successfully", "poll_id": poll_id}

@app.get("/api/polls/{poll_id}/stats")
def get_poll_stats(poll_id: str):
    if poll_id not in polls:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    vote_distribution = {}
    for vote in votes.get(poll_id, []):
        option_idx = vote["option_index"]
        vote_distribution[option_idx] = vote_distribution.get(option_idx, 0) + 1
    
    return {
        "poll_id": poll_id,
        "total_votes": len(votes.get(poll_id, [])),
        "total_likes": len(likes.get(poll_id, [])),
        "vote_distribution": vote_distribution,
        "created_at": polls[poll_id]["created_at"]
    }

@app.get("/api/sports/updates")
def get_sports_updates():
    try:
        response = requests.get(
            "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            events = data.get('events', [])[:10]
            
            updates = []
            for event in events:
                competitions = event.get('competitions', [])
                if competitions:
                    comp = competitions[0]
                    competitors = comp.get('competitors', [])
                    if len(competitors) >= 2:
                        away = competitors[0] if competitors[0].get('home') == False else competitors[1]
                        home = competitors[1] if competitors[0].get('home') == False else competitors[0]
                        
                        updates.append({
                            "id": event.get('id', str(len(updates) + 1)),
                            "home": home.get('team', {}).get('displayName', 'Home'),
                            "away": away.get('team', {}).get('displayName', 'Away'),
                            "date": datetime.now().strftime("%Y-%m-%d"),
                            "status": comp.get('status', {}).get('type', {}).get('name', 'scheduled')
                        })
            
            if updates:
                return {"updates": updates}
        
        raise Exception("API returned non-200")
        
    except Exception as e:
        today = datetime.now().strftime("%Y-%m-%d")
        return {"updates": [
            {"id": "1", "home": "Lakers", "away": "Celtics", "date": today, "status": "live"},
            {"id": "2", "home": "Warriors", "away": "Heat", "date": today, "status": "scheduled"},
            {"id": "3", "home": "Bucks", "away": "Nuggets", "date": today, "status": "live"},
            {"id": "4", "home": "Knicks", "away": "76ers", "date": today, "status": "final"},
            {"id": "5", "home": "Suns", "away": "Clippers", "date": today, "status": "scheduled"},
        ]}

@app.get("/api/sports/game-data/{game_id}")
def get_game_data(game_id: str):
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"https://api.balldontlie.io/v1/games", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            games = data.get('data', [])
            game = next((g for g in games if str(g.get('id')) == game_id), None)
            
            if game and game.get('home_team') and game.get('visitor_team'):
                return {
                    "away": game['visitor_team']['full_name'],
                    "home": game['home_team']['full_name'],
                    "category": "Sports"
                }
        
        return {
            "away": "Team A",
            "home": "Team B",
            "category": "Sports"
        }
    except Exception as e:
        return {
            "away": "Team A",
            "home": "Team B",
            "category": "Sports"
        }

@app.get("/api/sports/game-details/{game_id}")
def get_game_details(game_id: str):
    try:
        response = requests.get(
            "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            events = data.get('events', [])
            event = next((e for e in events if str(e.get('id')) == game_id), None)
            
            if event:
                competitions = event.get('competitions', [])
                if competitions:
                    comp = competitions[0]
                    competitors = comp.get('competitors', [])
                    if len(competitors) >= 2:
                        away = competitors[0] if not competitors[0].get('home') else competitors[1]
                        home = competitors[1] if not competitors[0].get('home') else competitors[0]
                        
                        return {
                            "id": event.get('id'),
                            "date": event.get('date', datetime.now().isoformat()),
                            "status": comp.get('status', {}).get('type', {}).get('name', 'scheduled'),
                            "home_team": {
                                "name": home.get('team', {}).get('displayName', ''),
                                "city": home.get('team', {}).get('location', ''),
                                "conference": home.get('team', {}).get('conference', '')
                            },
                            "visitor_team": {
                                "name": away.get('team', {}).get('displayName', ''),
                                "city": away.get('team', {}).get('location', ''),
                                "conference": away.get('team', {}).get('conference', '')
                            },
                            "home_score": home.get('score'),
                            "visitor_score": away.get('score'),
                            "season": "2024-25",
                            "postseason": False,
                            "stats": {"away_players": [], "home_players": []}
                        }
    except Exception as e:
        pass
    
    today = datetime.now().strftime("%Y-%m-%d")
    return {
        "id": game_id,
        "date": today,
        "status": "scheduled",
        "home_team": {"name": "Unknown Team", "city": "Unknown", "conference": "Unknown"},
        "visitor_team": {"name": "Unknown Team", "city": "Unknown", "conference": "Unknown"},
        "home_score": None,
        "visitor_score": None,
        "season": "2024-25",
        "postseason": False,
        "stats": {"away_players": [], "home_players": []}
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
