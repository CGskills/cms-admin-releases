'use client';

import { User } from '@supabase/supabase-js';
import LogoutButton from './LogoutButton';
import UpdateChecker from './UpdateChecker';
import { useState } from 'react';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Search */}
          <div className="flex-1">
            <div className="max-w-lg w-full lg:max-w-xs">
              <label htmlFor="search" className="sr-only">
                Поиск
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  id="search"
                  name="search"
                  className="block w-full rounded-lg border-0 bg-slate-900/50 py-2 pl-10 pr-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DB9844] sm:text-sm"
                  placeholder="Поиск..."
                  type="search"
                />
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Update Checker */}
            <UpdateChecker />

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-700/50 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#DB9844] to-[#AF5D3E] flex items-center justify-center text-white font-semibold text-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-white">
                    {user.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-slate-400">Администратор</div>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    isProfileOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-700/50">
                    <p className="text-xs text-slate-400">Вы вошли как</p>
                    <p className="text-sm text-white truncate">{user.email}</p>
                  </div>
                  <div className="border-t border-slate-700/50 mt-1 pt-1">
                    <div className="px-4 py-2">
                      <LogoutButton />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
