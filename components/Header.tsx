'use client';

import React from 'react';
import { signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="w-full border-b border-gray-800/80 bg-gray-950/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/10 border border-orange-400/20">
            🤖
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight select-none">
              Merge<span className="text-orange-400 text-glow-orange">MinD</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs bg-gray-900 border border-gray-800 text-gray-400 px-3 py-1.5 rounded-full hidden sm:inline-block font-mono">
            {user.email}
          </span>
          <button
            onClick={() => signOut(auth)}
            className="text-xs font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:text-white hover:bg-orange-500 hover:border-orange-500 px-4 py-1.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm hover:shadow-orange-500/10"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
