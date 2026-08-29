'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') === 'forbidden'
      ? 'У аккаунта нет прав администратора. Проверьте ADMIN_EMAILS.'
      : '',
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Неверный email или пароль');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Подтвердите ваш email-адрес');
        } else {
          setError(signInError.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Supabase persists the session in browser cookies asynchronously. A
        // full navigation ensures the first request to the protected route
        // carries the freshly written session cookie to the server proxy.
        window.location.replace('/admin');
      } else {
        setError('Не удалось получить сессию. Попробуйте снова.');
        setIsLoading(false);
      }
    } catch {
      setError('Произошла непредвиденная ошибка. Попробуйте снова.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img
                src="/logo.svg"
                alt="CMS Admin"
                className="w-16 h-16"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Панель управления</h1>
            <p className="text-slate-400 text-sm">Войдите в свой аккаунт</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DB9844] focus:border-transparent transition-all"
                placeholder="admin@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DB9844] focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#DB9844] text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#AF5D3E] focus:outline-none focus:ring-2 focus:ring-[#DB9844] focus:ring-offset-2 focus:ring-offset-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#DB9844]/25"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Вход...
                </span>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="#"
              className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              Забыли пароль?
            </a>
          </div>
        </div>

        <div className="text-center mt-6 text-slate-500 text-sm">
          © 2024 CMS Admin. Все права защищены.
        </div>
      </div>
    </div>
  );
}
