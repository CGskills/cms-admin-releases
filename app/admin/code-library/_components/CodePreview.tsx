'use client';

import { useState, useRef, useEffect } from 'react';
import type { CodeBlockDependency } from '@/types/code-blocks';
import { buildCodeBlock } from '@/lib/code-library/builder';
import type { Dependency } from '@/lib/code-library/types';

interface CodePreviewProps {
  html: string;
  css: string;
  javascript: string;
  dependencies?: CodeBlockDependency[];
}

type PreviewState = 'loading' | 'ready' | 'error' | 'timeout';

const BREAKPOINTS = [
  { label: '320px', width: 320 },
  { label: '375px', width: 375 },
  { label: '390px', width: 390 },
  { label: '768px', width: 768 },
  { label: '1024px', width: 1024 },
  { label: '1280px', width: 1280 },
  { label: '1440px', width: 1440 },
  { label: '1920px', width: 1920 },
];

const PREVIEW_TIMEOUT = 10000; // 10 seconds

export default function CodePreview({ html: htmlCode, css: cssCode, javascript: jsCode, dependencies = [] }: CodePreviewProps) {
  const [activeBreakpoint, setActiveBreakpoint] = useState(1440);
  const [previewState, setPreviewState] = useState<PreviewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Infer dependency type from URL
  const inferDependencyType = (url: string): 'css' | 'js' | 'font' | 'unknown' => {
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return 'font';
    if (url.endsWith('.css')) return 'css';
    if (url.endsWith('.js')) return 'js';
    return 'unknown';
  };

  // Handle iframe load success
  const handleIframeLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPreviewState('ready');
    setErrorMessage('');
    console.log('[CodePreview] Preview loaded successfully');
  };

  // Handle iframe load error
  const handleIframeError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPreviewState('error');
    setErrorMessage('Failed to load preview. Check console for details.');
    console.error('[CodePreview] Preview failed to load');
  };

  // Listen for runtime errors from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data?.type === 'preview-error') {
        console.error('[CodePreview] Runtime error in preview:', event.data.error);
        setPreviewState('error');
        setErrorMessage(`Runtime error: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Build and update preview
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Reset state
    setPreviewState('loading');
    setErrorMessage('');

    // Set timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setPreviewState('timeout');
      setErrorMessage('Preview timed out after 10 seconds');
      console.warn('[CodePreview] Preview loading timeout');
    }, PREVIEW_TIMEOUT);

    try {
      // Convert dependencies
      const builderDeps: Dependency[] = dependencies
        .filter(d => d.cdnUrl)
        .map(d => ({
          name: d.name,
          cdnUrl: d.cdnUrl!,
          type: inferDependencyType(d.cdnUrl!)
        }));

      // Build preview HTML using the builder
      const previewHtml = buildCodeBlock({
        html: htmlCode,
        css: cssCode,
        javascript: jsCode,
        dependencies: builderDeps,
        format: 'full'
      });

      // Inject error handler into the preview
      const htmlWithErrorHandler = previewHtml.replace(
        '</head>',
        `<script>
  window.addEventListener('error', function(e) {
    window.parent.postMessage({
      type: 'preview-error',
      error: e.message + ' at ' + e.filename + ':' + e.lineno
    }, '*');
  });
  window.addEventListener('unhandledrejection', function(e) {
    window.parent.postMessage({
      type: 'preview-error',
      error: 'Unhandled promise rejection: ' + e.reason
    }, '*');
  });
</script>
</head>`
      );

      console.log('[CodePreview] Building preview with current form values');
      iframe.srcdoc = htmlWithErrorHandler;
    } catch (error) {
      console.error('[CodePreview] Error building preview:', error);
      // Schedule state updates to avoid synchronous setState in effect
      setTimeout(() => {
        setPreviewState('error');
        setErrorMessage(`Build error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }, 0);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [htmlCode, cssCode, jsCode, dependencies]);

  return (
    <div>
      {/* Breakpoint selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp.width}
            type="button"
            onClick={() => setActiveBreakpoint(bp.width)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeBreakpoint === bp.width
                ? 'bg-[#DB9844] text-white'
                : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {bp.label}
          </button>
        ))}
      </div>

      {/* Preview iframe */}
      <div className="bg-white rounded-lg overflow-hidden border border-slate-700/50 relative">
        {/* Loading/Error overlay */}
        {previewState !== 'ready' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="text-center p-6">
              {previewState === 'loading' && (
                <>
                  <div className="inline-block w-8 h-8 border-4 border-[#DB9844] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-slate-300 text-sm">Loading preview...</p>
                </>
              )}
              {previewState === 'error' && (
                <>
                  <div className="text-red-400 text-4xl mb-3">⚠</div>
                  <p className="text-red-400 font-medium mb-1">Preview Error</p>
                  <p className="text-slate-400 text-sm">{errorMessage}</p>
                </>
              )}
              {previewState === 'timeout' && (
                <>
                  <div className="text-yellow-400 text-4xl mb-3">⏱</div>
                  <p className="text-yellow-400 font-medium mb-1">Preview Timeout</p>
                  <p className="text-slate-400 text-sm">{errorMessage}</p>
                </>
              )}
            </div>
          </div>
        )}

        <div
          className="mx-auto transition-all duration-300"
          style={{ width: `${activeBreakpoint}px`, maxWidth: '100%' }}
        >
          <iframe
            ref={iframeRef}
            title="Code Preview"
            className="w-full border-0"
            style={{ minHeight: '500px', height: '100%' }}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            // Preview content is user-authored HTML/JS. Allow scripts but keep isolated.
            // Using srcdoc means no origin, so no need for allow-same-origin.
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}
