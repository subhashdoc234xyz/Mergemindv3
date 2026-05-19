'use client';

import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-radial-glow opacity-60 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-radial-purple-glow opacity-40 pointer-events-none" />

      {/* Card container */}
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 z-10 border border-gray-800/80 shadow-2xl relative overflow-hidden scanline">
        
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-orange-500/10 border border-orange-400/20 mb-4 animate-bounce [animation-duration:3s]">
            🤖
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight select-none">
            Merge<span className="text-orange-400 text-glow-orange">MinD</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            AI-Powered GitLab MR Review Agent
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-900/80 border border-gray-800 rounded-xl p-1.5 mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
              isLogin
                ? "bg-gray-800 text-white shadow-sm border border-gray-700/50"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
              !isLogin
                ? "bg-gray-800 text-white shadow-sm border border-gray-700/50"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Welcome Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {isLogin
              ? "Sign in to start reviewing GitLab Merge Requests"
              : "Register to empower your code reviews"}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2.5 font-mono shadow-inner">
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="you@example.com"
              className="w-full bg-gray-900/60 border border-gray-800 hover:border-gray-700 focus:border-orange-500 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all duration-300 shadow-inner"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="••••••••"
              className="w-full bg-gray-900/60 border border-gray-800 hover:border-gray-700 focus:border-orange-500 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all duration-300 shadow-inner"
            />
            {!isLogin && (
              <p className="text-xs text-gray-500 mt-2 font-mono">
                Must be at least 6 characters
              </p>
            )}
          </div>
        </div>

        {/* Submit Action */}
        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer shadow-lg ${
            loading || !email || !password
              ? "bg-gray-850 border border-gray-800/80 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white hover:scale-[1.02] active:scale-[0.98] pulse-glow"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {isLogin ? "Signing In..." : "Creating Account..."}
            </span>
          ) : isLogin ? (
            "🤖 Sign In"
          ) : (
            "🤖 Create Account"
          )}
        </button>

        {/* Toggle Footer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="text-orange-400 hover:text-orange-300 font-semibold transition-all duration-300 hover:underline cursor-pointer ml-1"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>

      <p className="text-xs text-gray-500 mt-8 font-mono select-none">
        Powered by <span className="text-orange-400/80">Firebase</span>
      </p>
    </div>
  );
}
