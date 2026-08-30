'use client';

import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export default function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const checkElectron = typeof window !== 'undefined' && 'electronAPI' in window;
    setIsElectron(checkElectron);

    if (checkElectron) {
      const api = (window as any).electronAPI;

      // Get current version
      api.getAppVersion().then((version: string) => {
        setCurrentVersion(version);
      });

      // Set up event listeners
      const unsubscribeAvailable = api.onUpdateAvailable((info: UpdateInfo) => {
        setStatus('available');
        setUpdateInfo(info);
        setError(null);
      });

      const unsubscribeNotAvailable = api.onUpdateNotAvailable(() => {
        setStatus('not-available');
        setUpdateInfo(null);
        setError(null);
        // Auto-hide after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      });

      const unsubscribeDownloading = api.onUpdateDownloading((progress: DownloadProgress) => {
        setStatus('downloading');
        setDownloadProgress(progress);
      });

      const unsubscribeDownloaded = api.onUpdateDownloaded((info: UpdateInfo) => {
        setStatus('downloaded');
        setUpdateInfo(info);
        setDownloadProgress(null);
      });

      const unsubscribeError = api.onUpdateError((err: { message: string }) => {
        setStatus('error');
        setError(err.message);
        // Auto-hide error after 5 seconds
        setTimeout(() => {
          setStatus('idle');
          setError(null);
        }, 5000);
      });

      return () => {
        unsubscribeAvailable();
        unsubscribeNotAvailable();
        unsubscribeDownloading();
        unsubscribeDownloaded();
        unsubscribeError();
      };
    }
  }, []);

  const handleCheckForUpdates = async () => {
    if (!isElectron) return;

    setStatus('checking');
    setError(null);

    try {
      const api = (window as any).electronAPI;
      const result = await api.checkForUpdates();

      if (result.error) {
        setError(result.error);
        setStatus('error');
        setTimeout(() => {
          setStatus('idle');
          setError(null);
        }, 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 5000);
    }
  };

  const handleDownloadUpdate = async () => {
    console.log('[UpdateChecker] handleDownloadUpdate called', { isElectron, status });

    if (!isElectron) {
      console.log('[UpdateChecker] Not in Electron, aborting');
      return;
    }

    if (status !== 'available') {
      console.log('[UpdateChecker] Status is not available, current status:', status);
      return;
    }

    console.log('[UpdateChecker] Starting download...');
    setStatus('downloading');
    setDownloadProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 });
    setError(null);

    try {
      const api = (window as any).electronAPI;
      console.log('[UpdateChecker] Calling api.downloadUpdate()...');
      const result = await api.downloadUpdate();
      console.log('[UpdateChecker] Download result:', result);

      if (result?.error) {
        console.error('[UpdateChecker] Download returned error:', result.error);
        throw new Error(result.error);
      }

      console.log('[UpdateChecker] Download initiated successfully');
      // Don't change status here - wait for 'update-downloading' events
    } catch (err) {
      console.error('[UpdateChecker] Download error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to download update';
      setError(errorMessage);
      setStatus('error');
      setDownloadProgress(null);
      setTimeout(() => {
        setStatus('available'); // Return to available state so user can retry
        setError(null);
      }, 5000);
    }
  };

  const handleInstallUpdate = () => {
    if (!isElectron || status !== 'downloaded') return;

    const api = (window as any).electronAPI;
    api.installUpdate();
  };

  if (!isElectron) {
    return null; // Don't show update checker in browser
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="relative">
      {/* Update Button */}
      <button
        onClick={handleCheckForUpdates}
        disabled={status === 'checking' || status === 'downloading'}
        className="relative p-2 rounded-lg hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title="Проверить обновления"
      >
        {/* Update Icon */}
        <svg
          className={`w-5 h-5 text-slate-300 ${status === 'checking' ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>

        {/* Notification Badge */}
        {(status === 'available' || status === 'downloaded') && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
        )}
      </button>

      {/* Update Status Panel */}
      {status !== 'idle' && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl p-4 z-50">
          {/* Checking */}
          {status === 'checking' && (
            <div className="flex items-center space-x-3">
              <svg
                className="animate-spin h-5 w-5 text-[#DB9844]"
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
              <div>
                <p className="text-sm font-medium text-white">Проверка обновлений...</p>
                <p className="text-xs text-slate-400">Текущая версия: {currentVersion}</p>
              </div>
            </div>
          )}

          {/* Not Available */}
          {status === 'not-available' && (
            <div className="flex items-center space-x-3">
              <svg
                className="h-5 w-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-white">Обновлений нет</p>
                <p className="text-xs text-slate-400">Версия {currentVersion} актуальна</p>
              </div>
            </div>
          )}

          {/* Update Available */}
          {status === 'available' && updateInfo && (
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <svg
                  className="h-5 w-5 text-[#DB9844] mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    Доступна новая версия {updateInfo.version}
                  </p>
                  <p className="text-xs text-slate-400">Текущая версия: {currentVersion}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleDownloadUpdate}
                  className="flex-1 px-3 py-2 bg-[#DB9844] hover:bg-[#c58739] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Скачать
                </button>
                <button
                  onClick={() => setStatus('idle')}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Позже
                </button>
              </div>
            </div>
          )}

          {/* Downloading */}
          {status === 'downloading' && downloadProgress && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <svg
                  className="animate-pulse h-5 w-5 text-[#DB9844]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Скачивание обновления...</p>
                  <p className="text-xs text-slate-400">
                    {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
                  </p>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-[#DB9844] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(downloadProgress.percent)}%` }}
                ></div>
              </div>
              <p className="text-xs text-center text-slate-400">
                {Math.round(downloadProgress.percent)}%
              </p>
            </div>
          )}

          {/* Downloaded */}
          {status === 'downloaded' && updateInfo && (
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Обновление готово</p>
                  <p className="text-xs text-slate-400">Версия {updateInfo.version} скачана</p>
                </div>
              </div>
              <button
                onClick={handleInstallUpdate}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Установить и перезапустить
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && error && (
            <div className="flex items-start space-x-3">
              <svg
                className="h-5 w-5 text-red-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Ошибка проверки</p>
                <p className="text-xs text-slate-400 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
