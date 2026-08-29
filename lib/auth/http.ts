import { NextResponse } from 'next/server';

export function methodNotAllowed(): NextResponse {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'POST' } });
}
