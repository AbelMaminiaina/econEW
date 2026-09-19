import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get('error') || 'Default';

  // Redirect to connexion page with error parameter
  const url = new URL('/connexion', request.url);
  url.searchParams.set('error', error);

  return NextResponse.redirect(url);
}
