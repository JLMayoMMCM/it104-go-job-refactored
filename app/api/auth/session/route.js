import { NextResponse } from 'next/server';
import { verifyToken } from '../../../lib/auth';

export async function GET(request) {
  const token = request.cookies.get('session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No session token found' }, { status: 401 });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    accountId: decoded.account_id,
    username: decoded.username,
    email: decoded.email,
    accountType: decoded.accountType,
    person_id: decoded.person_id || null,
    job_seeker_id: decoded.job_seeker_id || null
  });
}
