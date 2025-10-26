import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SidebarContentProps {
  question: string;
  setQuestion: (value: string) => void;
  options: string[];
  setOptions: (value: string[]) => void;
  category: string;
  setCategory: (value: string) => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  createPoll: () => void;
  addOption: () => void;
  loadSportsUpdates: () => void;
  activeTab: 'trending' | 'recent' | 'sports';
  setActiveTab: (tab: 'trending' | 'recent' | 'sports') => void;
  loading: boolean;
  polls: Array<{id: string, question: string, vote_count: number, like_count: number}>;
  selectedPoll: string | null;
  setSelectedPoll: (id: string) => void;
  handleDeleteClick: (id: string) => void;
  sportsUpdates: Array<{id: string, away: string, home: string, date: string, status: string}>;
  viewGameDetails: (id: string) => void;
  createPollFromGame: (update: {id: string, away: string, home: string}) => void;
  onMobileClose?: () => void;
}

export function SidebarContent({
  question,
  setQuestion,
  options,
  setOptions,
  category,
  setCategory,
  dialogOpen,
  setDialogOpen,
  createPoll,
  addOption,
  loadSportsUpdates,
  activeTab,
  setActiveTab,
  loading,
  polls,
  selectedPoll,
  setSelectedPoll,
  handleDeleteClick,
  sportsUpdates,
  viewGameDetails,
  createPollFromGame,
  onMobileClose
}: SidebarContentProps) {
  return (
    <>
      <div className="p-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Social Poll
            </h1>
            <p className="text-sm text-white/50">Real-time polling</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-white text-black hover:bg-white/90 font-medium">
              New Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-black border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">Create New Poll</DialogTitle>
              <DialogDescription className="text-white/50">Get opinions from the community</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div>
                <label className="text-sm font-medium mb-3 block text-white">Question</label>
                <Textarea
                  placeholder="What's your question?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-[100px] border-white/10 bg-black text-white resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-3 block text-white">Category</label>
                <Input
                  placeholder="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border-white/10 bg-black text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-3 block text-white">Options</label>
                {options.map((option, index) => (
                  <Input
                    key={index}
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[index] = e.target.value;
                      setOptions(newOptions);
                    }}
                    className="mb-3 border-white/10 bg-black text-white"
                  />
                ))}
                <Button variant="outline" onClick={addOption} className="mt-2 border-white/10 text-white hover:bg-white/10">
                  Add Option
                </Button>
              </div>
              <Button onClick={createPoll} className="w-full bg-white text-black hover:bg-white/90 font-medium">
                Create Poll
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          onClick={loadSportsUpdates}
          variant="outline" 
          className="w-full border-white/10 text-white hover:bg-white/10 font-medium"
        >
          Live Sports Updates
        </Button>
      </div>

      <div className="flex gap-2 px-6 pb-4">
        <button
          onClick={() => setActiveTab('trending')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'trending'
              ? 'bg-white text-black'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          Trending
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'recent'
              ? 'bg-white text-black'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => {
            if (sportsUpdates.length > 0) setActiveTab('sports');
            else loadSportsUpdates();
          }}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'sports'
              ? 'bg-white text-black'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          Sports
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-6">
            <p className="text-white/50 text-sm">Loading...</p>
          </div>
        ) : activeTab === 'sports' ? (
          <div className="px-4 space-y-3">
            {sportsUpdates.map((update) => (
              <div
                key={update.id}
                className="group relative p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                onClick={() => viewGameDetails(update.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {update.status === 'live' && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded">LIVE</span>
                      )}
                      <span className="text-xs text-white/50">{update.date}</span>
                    </div>
                    <div className="text-sm font-medium text-white">
                      {update.away}
                    </div>
                    <div className="text-xs text-white/70 mt-1">at</div>
                    <div className="text-sm font-medium text-white">
                      {update.home}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createPollFromGame(update);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90 text-sm"
                  >
                    Create Poll
                  </button>
                </div>
              </div>
            ))}
            {sportsUpdates.length === 0 && (
              <div className="px-4">
                <p className="text-white/50 text-sm">No sports data available. Click Live Sports Updates to fetch.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4">
            {polls.map((poll) => (
              <div
                key={poll.id}
                className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl transition-all mb-2 group ${
                  selectedPoll === poll.id
                    ? 'bg-white text-black font-medium shadow-sm'
                    : 'hover:bg-white/10 text-white/70'
                }`}
              >
                <button
                  onClick={() => {
                    setSelectedPoll(poll.id);
                    onMobileClose?.();
                  }}
                  className="flex-1 text-left"
                >
                  <div className="font-medium text-sm mb-2 line-clamp-2 leading-snug">{poll.question}</div>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    <span>{poll.vote_count} votes</span>
                    <span>•</span>
                    <span>{poll.like_count} likes</span>
                  </div>
                </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(poll.id);
                    }}
                    className="transition-opacity p-2 hover:bg-red-500/20 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-red-500 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

