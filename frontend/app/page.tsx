'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SidebarContent } from '@/components/sidebar-content';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Poll {
  id: string;
  question: string;
  options: string[];
  category: string;
  created_at: string;
  vote_count: number;
  like_count: number;
  dislike_count: number;
  vote_distribution?: Record<number, number>;
  option_like_counts?: Record<number, number>;
}

export default function Home() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [category, setCategory] = useState('General');
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  const [userLikeDislike, setUserLikeDislike] = useState<Map<string, 'like' | 'dislike'>>(new Map());
  const [likedOptions, setLikedOptions] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pollToDelete, setPollToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'sports'>('trending');
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [sportsUpdates, setSportsUpdates] = useState<Array<{id: string, home: string, away: string, date: string, status: string}>>([]);
  const [gameDetailsOpen, setGameDetailsOpen] = useState(false);
  const [gameDetails, setGameDetails] = useState<{
    id: string;
    date: string;
    status: string;
    home_team: {name: string, city: string, conference: string};
    visitor_team: {name: string, city: string, conference: string};
    home_score: number | null;
    visitor_score: number | null;
    season: string;
    postseason: boolean;
    stats?: {
      away_players: Array<{player: string, points: number, rebounds: number, assists: number}>;
      home_players: Array<{player: string, points: number, rebounds: number, assists: number}>;
    };
  } | null>(null);

  const selectedPollRef = useRef(selectedPoll);

  useEffect(() => {
    const loadPolls = async () => {
      try {
        const response = await fetch(`${API_URL}/api/polls`);
        const data = await response.json();
        const pollsWithStats = await Promise.all(
          data.polls.map(async (poll: Poll) => {
            const pollData = await fetch(`${API_URL}/api/polls/${poll.id}`).then(r => r.json());
            return pollData;
          })
        );
        
        const sortedPolls = {
          recent: pollsWithStats,
          trending: [...pollsWithStats].sort((a, b) => (b.like_count + b.vote_count) - (a.like_count + a.vote_count)),
          sports: pollsWithStats
        };
        
        const pollsToShow = activeTab === 'sports' ? [] : sortedPolls[activeTab];
        setPolls(pollsToShow);
        
        if (pollsToShow.length > 0 && !selectedPoll) {
          setSelectedPoll(pollsToShow[0].id);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching polls:', error);
        setLoading(false);
      }
    };
    loadPolls();
  }, [activeTab, selectedPoll]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 3000);
  };

  const loadSportsUpdates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sports/updates`);
      const data = await response.json();
      setSportsUpdates(data.updates || []);
      } catch (error) {
        console.error('Error loading sports updates:', error);
        // Keep existing sports updates
      }
  };


  // WebSocket connection for real-time updates
  useEffect(() => {
    let newSocket: WebSocket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      try {
        const wsUrl = API_URL.replace('http', 'ws');
        newSocket = new WebSocket(`${wsUrl}/ws`);

        newSocket.onopen = () => {
          console.log('Connected to WebSocket');
          reconnectAttempts = 0;
        };

        newSocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'poll_created') {
              setPolls(prev => {
                const newPolls = [message.poll, ...prev];
                // Only select if no poll is currently selected
                setSelectedPoll(current => current || message.poll.id);
                return newPolls;
              });
              showToast('New poll created!');
            } else if (message.type === 'poll_deleted') {
              // If deleted poll was selected, select the first remaining poll
              if (selectedPollRef.current === message.poll_id) {
                setPolls(prev => {
                  const filtered = prev.filter(poll => poll.id !== message.poll_id);
                  if (filtered.length > 0) {
                    setSelectedPoll(filtered[0].id);
                  } else {
                    setSelectedPoll(null);
                  }
                  return filtered;
                });
              } else {
                setPolls(prev => prev.filter(poll => poll.id !== message.poll_id));
              }
              showToast('Poll deleted successfully');
            } else if (message.type === 'vote_cast') {
              setPolls(prev => prev.map(poll => 
                poll.id === message.poll_id 
                  ? { ...poll, vote_count: message.vote_count, vote_distribution: message.vote_distribution }
                  : poll
              ));
            } else if (message.type === 'poll_liked') {
              setPolls(prev => prev.map(poll => 
                poll.id === message.poll_id 
                  ? { ...poll, like_count: message.like_count }
                  : poll
              ));
            } else if (message.type === 'poll_disliked') {
              setPolls(prev => prev.map(poll => 
                poll.id === message.poll_id 
                  ? { ...poll, dislike_count: message.dislike_count }
                  : poll
              ));
            } else if (message.type === 'option_liked') {
              setPolls(prev => prev.map(poll => 
                poll.id === message.poll_id 
                  ? { ...poll, option_like_counts: message.option_like_counts }
                  : poll
              ));
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        newSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        newSocket.onclose = () => {
          console.log('WebSocket disconnected');
          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * reconnectAttempts, 30000); // Max 30s
            setTimeout(connectWebSocket, delay);
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);

  useEffect(() => {
    selectedPollRef.current = selectedPoll;
  }, [selectedPoll]);

  const createPoll = async () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) {
      showToast('Please enter a question and at least 2 options');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          options: options.filter(o => o.trim()),
          category
        })
      });
      const poll = await response.json();
      setQuestion('');
      setOptions(['', '']);
      setDialogOpen(false);
      setSidebarOpen(false);
      showToast('Poll created successfully!');
      return poll;
    } catch (error) {
      console.error('Error creating poll:', error);
      showToast('Failed to create poll');
    }
  };

  const handleDeleteClick = (pollId: string) => {
    setPollToDelete(pollId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pollToDelete) return;

    try {
      await fetch(`${API_URL}/api/polls/${pollToDelete}`, {
        method: 'DELETE'
      });
      // WebSocket will handle the UI update
      setDeleteDialogOpen(false);
      setPollToDelete(null);
    } catch (error) {
      console.error('Error deleting poll:', error);
      showToast('Failed to delete poll');
      setDeleteDialogOpen(false);
      setPollToDelete(null);
    }
  };

  const vote = async (pollId: string, optionIndex: number) => {
    if (votedPolls.has(pollId)) {
      showToast('You have already voted on this poll');
      return;
    }

    try {
      await fetch(`${API_URL}/api/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poll_id: pollId,
          option_index: optionIndex
        })
      });
      setVotedPolls(prev => new Set(prev).add(pollId));
      showToast('Vote cast successfully!');
    } catch (error) {
      console.error('Error voting:', error);
      showToast('Failed to vote');
    }
  };

  const handleReaction = async (pollId: string, reaction: 'like' | 'dislike') => {
    // Update local state to show which button is active
    const newMap = new Map(userLikeDislike);
    newMap.set(pollId, reaction);
    setUserLikeDislike(newMap);
    
    // Always call the API - backend increments count
    try {
      if (reaction === 'like') {
        await fetch(`${API_URL}/api/likes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poll_id: pollId })
        });
      } else {
        await fetch(`${API_URL}/api/dislikes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poll_id: pollId })
        });
      }
    } catch (error) {
      console.error(`Error ${reaction}:`, error);
    }
  };

  const likeOption = async (pollId: string, optionIndex: number) => {
    const likeKey = `${pollId}-${optionIndex}`;
    if (likedOptions.has(likeKey)) {
      return;
    }

    try {
      await fetch(`${API_URL}/api/option-likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poll_id: pollId,
          option_index: optionIndex
        })
      });
      setLikedOptions(prev => new Set(prev).add(likeKey));
    } catch (error) {
      console.error('Error liking option:', error);
    }
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const getPercentage = (poll: Poll, optionIndex: number) => {
    if (!poll.vote_distribution || poll.vote_count === 0) return 0;
    const votes = poll.vote_distribution[optionIndex] || 0;
    return Math.round((votes / poll.vote_count) * 100);
  };

  const getOptionLikeCount = (poll: Poll, optionIndex: number) => {
    return poll.option_like_counts?.[optionIndex] || 0;
  };

  const sharePoll = async (pollId: string) => {
    const pollUrl = `${window.location.origin}/poll/${pollId}`;
    try {
      await navigator.clipboard.writeText(pollUrl);
      showToast('Poll link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast('Failed to copy link');
    }
  };

  const createPollFromGame = async (update: {id: string, away: string, home: string}) => {
    try {
      const response = await fetch(`${API_URL}/api/sports/game-data/${update.id}`);
      const data = await response.json();
      
      setQuestion('');
      setOptions([data.away, data.home]);
      setCategory(data.category);
      setDialogOpen(true);
      showToast('Ready to create poll!');
    } catch (error) {
      console.error('Error loading game data:', error);
      // Use fallback data
      setQuestion('');
      setOptions([update.away, update.home]);
      setCategory('Sports');
      setDialogOpen(true);
      showToast('Ready to create poll!');
    }
  };

  const viewGameDetails = async (gameId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/sports/game-details/${gameId}`);
      const data = await response.json();
      setGameDetails(data);
      setGameDetailsOpen(true);
    } catch (error) {
      console.error('Error loading game details:', error);
      showToast('Failed to load game details');
    }
  };

  const currentPoll = polls.find(p => p.id === selectedPoll);
  const userReaction = currentPoll ? userLikeDislike.get(currentPoll.id) : null;

  return (
    <div className="flex h-screen bg-black text-white relative">
      {/* Toast Notification */}
      {toastOpen && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white text-black px-6 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-5">
          {toastMessage}
        </div>
      )}

      {/* Mobile Menu Button */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <button className="fixed top-6 left-6 z-50 p-3 rounded-xl bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 bg-black border-white/10 p-0 overflow-hidden flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Navigate between polls, trending, recent, and sports updates</SheetDescription>
          </SheetHeader>
          <SidebarContent
            question={question}
            setQuestion={setQuestion}
            options={options}
            setOptions={setOptions}
            category={category}
            setCategory={setCategory}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            createPoll={createPoll}
            addOption={addOption}
            loadSportsUpdates={loadSportsUpdates}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            loading={loading}
            polls={polls}
            selectedPoll={selectedPoll}
            setSelectedPoll={setSelectedPoll}
            handleDeleteClick={handleDeleteClick}
            sportsUpdates={sportsUpdates}
            viewGameDetails={viewGameDetails}
            createPollFromGame={createPollFromGame}
            onMobileClose={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-80 border-r border-white/10 bg-black flex-col">
        <SidebarContent
          question={question}
          setQuestion={setQuestion}
          options={options}
          setOptions={setOptions}
          category={category}
          setCategory={setCategory}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          createPoll={createPoll}
          addOption={addOption}
          loadSportsUpdates={loadSportsUpdates}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          loading={loading}
          polls={polls}
          selectedPoll={selectedPoll}
          setSelectedPoll={setSelectedPoll}
          handleDeleteClick={handleDeleteClick}
          sportsUpdates={sportsUpdates}
          viewGameDetails={viewGameDetails}
          createPollFromGame={createPollFromGame}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/50">Loading polls...</p>
          </div>
        ) : !currentPoll ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-white/50 text-lg mb-2">No poll selected</p>
              <p className="text-white/50 text-sm">Select a poll or create a new one</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                      {currentPoll.category}
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{currentPoll.vote_count} voters</span>
                      <span>•</span>
                      <span>{new Date(currentPoll.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <h1 className="text-2xl lg:text-4xl font-semibold tracking-tight text-white leading-tight">
                    {currentPoll.question}
          </h1>
                </div>
                <button
                  onClick={() => handleDeleteClick(currentPoll.id)}
                  className="p-3 hover:bg-red-500/20 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-white hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Engagement Bar */}
              <div className="flex items-center gap-3 lg:gap-6 p-3 lg:p-4 rounded-2xl bg-white/5 border border-white/10">
                <button
                  onClick={() => handleReaction(currentPoll.id, 'like')}
                  className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-6 py-2 lg:py-3 rounded-xl transition-all ${
                    userReaction === 'like' 
                      ? 'bg-white text-black' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                  </svg>
                  <span className="hidden lg:inline text-sm font-medium">Like</span>
                  <div className="text-lg lg:text-xl font-bold">{currentPoll.like_count}</div>
                </button>

                <div className="h-8 lg:h-12 w-px bg-white/10" />

                <button
                  onClick={() => handleReaction(currentPoll.id, 'dislike')}
                  className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-6 py-2 lg:py-3 rounded-xl transition-all ${
                    userReaction === 'dislike' 
                      ? 'bg-white text-black' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 rotate-180" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                  </svg>
                  <span className="hidden lg:inline text-sm font-medium">Dislike</span>
                  <div className="text-lg lg:text-xl font-bold">{currentPoll.dislike_count || 0}</div>
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => sharePoll(currentPoll.id)}
                  className="flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="hidden lg:inline text-sm font-medium">Share</span>
                </button>
        </div>

              {/* Poll Options */}
              <div className="space-y-4 pt-4">
                {currentPoll.options.map((option, index) => {
                  const percentage = getPercentage(currentPoll, index);
                  const hasVoted = votedPolls.has(currentPoll.id);
                  const optionLikes = getOptionLikeCount(currentPoll, index);
                  const likeKey = `${currentPoll.id}-${index}`;
                  
                  return (
                    <div key={index} className="space-y-3 lg:space-y-4 p-4 lg:p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 transition-all">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-base lg:text-lg font-medium text-white leading-relaxed">{option}</span>
                        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                          {hasVoted && (
                            <span className="text-sm font-semibold text-white/50">
                              {percentage}%
                            </span>
                          )}
                          <button
                            onClick={() => likeOption(currentPoll.id, index)}
                            disabled={likedOptions.has(likeKey)}
                            className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm text-white/50 hover:text-white transition-colors disabled:opacity-50"
                          >
                            <span className="font-medium">{optionLikes}</span>
                          </button>
                        </div>
                      </div>
                      {hasVoted && currentPoll.vote_count > 0 && (
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-white h-2 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      )}
                      {!hasVoted && (
                        <Button
                          onClick={() => vote(currentPoll.id, index)}
                          className="w-full bg-white text-black hover:bg-white/90 font-medium"
                        >
                          Vote for this
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Details Dialog */}
      <Dialog open={gameDetailsOpen} onOpenChange={setGameDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black border-white/10">
          {gameDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold text-white">
                  Game Details
                </DialogTitle>
                <DialogDescription className="text-white/50">
                  {gameDetails.status === 'live' && <span className="text-red-500 font-medium">LIVE GAME</span>}
                  {gameDetails.status === 'final' && <span>Final Score</span>}
                  {gameDetails.status === 'scheduled' && <span>Scheduled Game</span>}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Game Info */}
                <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="space-y-2">
                    <div className="text-xs text-white/50 uppercase">Visitor</div>
                    <div className="text-xl font-bold text-white">
                      {gameDetails.visitor_team?.name}
                    </div>
                    <div className="text-sm text-white/50">
                      {gameDetails.visitor_team?.city}
                    </div>
                    {gameDetails.visitor_score !== null && (
                      <div className="text-3xl font-bold text-white mt-2">
                        {gameDetails.visitor_score}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-white/50 uppercase">Home</div>
                    <div className="text-xl font-bold text-white">
                      {gameDetails.home_team?.name}
                    </div>
                    <div className="text-sm text-white/50">
                      {gameDetails.home_team?.city}
                    </div>
                    {gameDetails.home_score !== null && (
                      <div className="text-3xl font-bold text-white mt-2">
                        {gameDetails.home_score}
                      </div>
                    )}
                  </div>
                </div>

                {/* Game Metadata */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-white/50">Date</div>
                    <div className="text-white font-medium">
                      {new Date(gameDetails.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-white/50">Season</div>
                    <div className="text-white font-medium">
                      {gameDetails.season}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-white/50">Conference</div>
                    <div className="text-white font-medium">
                      {gameDetails.home_team?.conference} vs {gameDetails.visitor_team?.conference}
                    </div>
                  </div>
                </div>

                {/* Player Stats */}
                {gameDetails.stats && (gameDetails.stats.away_players?.length > 0 || gameDetails.stats.home_players?.length > 0) && (
                  <div className="space-y-4">
                    <div className="text-lg font-semibold text-white">Top Performers</div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Away Team Players */}
                      {gameDetails.stats.away_players?.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-white">
                            {gameDetails.visitor_team?.name}
                          </div>
                          {gameDetails.stats.away_players.map((player, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                              <div className="text-white font-medium text-sm">{player.player}</div>
                              <div className="flex gap-4 mt-2 text-xs text-white/50">
                                <span>PTS: {player.points ?? 0}</span>
                                <span>REB: {player.rebounds ?? 0}</span>
                                <span>AST: {player.assists ?? 0}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Home Team Players */}
                      {gameDetails.stats.home_players?.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-white">
                            {gameDetails.home_team?.name}
                          </div>
                          {gameDetails.stats.home_players.map((player, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                              <div className="text-white font-medium text-sm">{player.player}</div>
                              <div className="flex gap-4 mt-2 text-xs text-white/50">
                                <span>PTS: {player.points ?? 0}</span>
                                <span>REB: {player.rebounds ?? 0}</span>
                                <span>AST: {player.assists ?? 0}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Create Poll Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      if (gameDetails) {
                        setQuestion('');
                        setOptions([gameDetails.visitor_team?.name, gameDetails.home_team?.name]);
                        setCategory('Sports');
                        setGameDetailsOpen(false);
                        setDialogOpen(true);
                      }
                    }}
                    className="flex-1 bg-white text-black hover:bg-white/90 font-medium"
                  >
                    Create Poll from This Game
                  </Button>
                </div>
        </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-black border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Poll</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Are you sure you want to delete this poll? This action cannot be undone and all votes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/10 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-black hover:bg-black/90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
