'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export default function MRInput({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('');

  const handleTriggerSubmit = () => {
    if (!url.trim() || loading) return;
    onSubmit(url.trim());
  };

  return (
    <div className="w-full flex flex-col space-y-2">
      {/* Label */}
      <span className="text-gray-400 text-sm font-medium tracking-wide self-start">
        GitLab Merge Request URL
      </span>
      
      {/* Side-by-side flex row */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleTriggerSubmit();
            }
          }}
          disabled={loading}
          placeholder="https://gitlab.com/username/repo/-/merge_requests/1"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        <button
          onClick={handleTriggerSubmit}
          disabled={loading || !url.trim()}
          className="bg-orange-400 hover:bg-orange-300 text-gray-950 font-medium px-6 py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:scale-[0.98]"
        >
          {loading ? 'Reviewing...' : 'Review MR'}
        </button>
      </div>
    </div>
  );
}
