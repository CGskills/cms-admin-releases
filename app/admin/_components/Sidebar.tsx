'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { menuItems } from '@/lib/config/sidebar-menu';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state to localStorage and sync across tabs
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Sync state across tabs using storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed' && e.newValue !== null) {
        setIsCollapsed(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col transition-all duration-300`}
    >
      {/* Logo */}
      <div className="h-20 flex items-center justify-center px-4 border-b border-slate-700/50">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Amber" className="w-9 h-9 flex-shrink-0" />
            <span className="text-xl font-bold bg-gradient-to-r from-[#DB9844] to-[#AF5D3E] bg-clip-text text-transparent whitespace-nowrap">
              Amber
            </span>
          </div>
        ) : (
          <img src="/logo.svg" alt="Amber" className="w-8 h-8" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {menuItems.map((item, index) => {
          if (item.isGroup) {
            return (
              <div key={index} className="mb-6">
                {!isCollapsed && (
                  <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </div>
                )}
                {isCollapsed && <div className="border-t border-slate-700/50 mb-2"></div>}
                <div className="space-y-1">
                  {item.items?.map((subItem) => {
                    const isActive = pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`flex items-center ${
                          isCollapsed ? 'justify-center' : 'space-x-3'
                        } px-3 py-2 rounded-lg transition-all ${
                          isActive
                            ? 'bg-[#DB9844] text-white shadow-lg shadow-[#DB9844]/20'
                            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                        }`}
                        title={isCollapsed ? subItem.label : undefined}
                      >
                        {subItem.icon}
                        {!isCollapsed && (
                          <span className="text-sm font-medium">{subItem.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center ${
                isCollapsed ? 'justify-center' : 'space-x-3'
              } px-3 py-2 rounded-lg transition-all mb-1 ${
                isActive
                  ? 'bg-[#DB9844] text-white shadow-lg shadow-[#DB9844]/20'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-slate-700/50 p-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all"
          title={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          <svg
            className={`w-5 h-5 transform transition-transform ${
              isCollapsed ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
