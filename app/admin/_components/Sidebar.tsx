'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const menuItems = [
  {
    label: 'Главная',
    href: '/admin',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: 'Контент',
    isGroup: true,
    items: [
      {
        label: 'Портфолио',
        href: '/admin/portfolio',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
      },
      {
        label: 'Цены',
        href: '/admin/pricing',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        label: 'Отзывы',
        href: '/admin/testimonials',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        ),
      },
      {
        label: 'Сотрудники',
        href: '/admin/employees',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
      },
      { label: 'Страницы', href: '/admin/pages', icon: <span aria-hidden="true">▤</span> },
      { label: 'Услуги', href: '/admin/services', icon: <span aria-hidden="true">✦</span> },
      { label: 'Медиа', href: '/admin/media', icon: <span aria-hidden="true">▧</span> },
      { label: 'Настройки', href: '/admin/settings', icon: <span aria-hidden="true">⚙</span> },
    ],
  },
  {
    label: 'Инструменты',
    isGroup: true,
    items: [
      {
        label: 'Code Library',
        href: '/admin/code-library',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
