export async function fetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<{ response: Response; data: T }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);

  if (upstreamSignal) {
    if (upstreamSignal.aborted) abortFromUpstream();
    else upstreamSignal.addEventListener('abort', abortFromUpstream, { once: true });
  }

  try {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers,
    });
    const text = await response.text();
    let data: T;
    try {
      data = text ? JSON.parse(text) as T : ({} as T);
    } catch {
      throw new Error(`Server returned invalid JSON (${response.status})`);
    }
    return { response, data };
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener('abort', abortFromUpstream);
  }
}
