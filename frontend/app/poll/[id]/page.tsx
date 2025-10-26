'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function PollPage() {
  const router = useRouter();
  const params = useParams();
  const pollId = params?.id as string;

  useEffect(() => {
    // Store poll ID in sessionStorage to be picked up by main page
    if (pollId) {
      sessionStorage.setItem('selectedPollId', pollId);
      // Redirect to home page
      router.push('/');
    }
  }, [pollId, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="text-center">
        <p className="text-lg mb-2">Loading poll...</p>
        <p className="text-sm text-white/50">Redirecting to poll</p>
      </div>
    </div>
  );
}

