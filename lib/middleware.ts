import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest, getTokenFromCookie } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function authMiddleware(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const token =
      getTokenFromRequest(req) || getTokenFromCookie(req.headers.get('cookie'));

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const authReq = req as AuthenticatedRequest;
    authReq.user = payload;

    return handler(authReq);
  };
}

export function roleMiddleware(
  allowedRoles: string[],
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return authMiddleware(async (req: AuthenticatedRequest) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return handler(req);
  });
}

