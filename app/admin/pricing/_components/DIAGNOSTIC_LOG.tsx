// TEMPORARY DIAGNOSTIC LOGGING - DELETE AFTER ANALYSIS

export function logKeyEvent(
  phase: 'capture' | 'bubble',
  eventType: string,
  event: React.KeyboardEvent<HTMLInputElement>
) {
  if (event.key !== ' ') return; // Only log Space key

  const target = event.target as HTMLInputElement;
  const composedPath = event.nativeEvent.composedPath?.() || [];

  console.log(`[${phase.toUpperCase()}] ${eventType}`, {
    key: event.key,
    code: event.code,
    defaultPrevented: event.defaultPrevented,
    'target.tagName': target.tagName,
    'target.type': target.type,
    'target.placeholder': target.placeholder,
    'target.value': target.value,
    'document.activeElement.tagName': document.activeElement?.tagName,
    'document.activeElement === target': document.activeElement === target,
    isTrusted: event.isTrusted,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    repeat: event.repeat,
    'composedPath.length': composedPath.length,
    'composedPath[0]': composedPath[0]?.constructor?.name,
    'composedPath[1]': composedPath[1]?.constructor?.name,
    timestamp: Date.now(),
  });
}

export function logClickOrFocus(eventType: string, element: HTMLElement) {
  console.log(`[EVENT] ${eventType}`, {
    'element.tagName': element.tagName,
    'element.className': element.className,
    'element.id': element.id,
    'document.activeElement.tagName': document.activeElement?.tagName,
  });
}

// Install global listeners to catch preventDefault calls
export function installGlobalDiagnostics() {
  if (typeof window === 'undefined') return;

  // Capture phase - earliest possible interception
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      console.log('[GLOBAL CAPTURE] keydown Space', {
        'target.tagName': (e.target as HTMLElement)?.tagName,
        'target.type': (e.target as HTMLInputElement)?.type,
        defaultPrevented: e.defaultPrevented,
        'activeElement.tagName': document.activeElement?.tagName,
      });
    }
  }, true);

  // Bubble phase
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      console.log('[GLOBAL BUBBLE] keydown Space', {
        'target.tagName': (e.target as HTMLElement)?.tagName,
        defaultPrevented: e.defaultPrevented,
      });
    }
  }, false);

  // After all handlers
  setTimeout(() => {
    document.addEventListener('keyup', (e) => {
      if (e.key === ' ') {
        console.log('[GLOBAL] keyup Space', {
          'target.tagName': (e.target as HTMLElement)?.tagName,
          defaultPrevented: e.defaultPrevented,
        });
      }
    }, false);
  }, 0);

  console.log('[DIAGNOSTIC] Global keyboard listeners installed');
}
