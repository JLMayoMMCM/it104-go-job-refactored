import jwt from 'jsonwebtoken';

export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware for protected routes
export async function authenticateRequest(req) {
  const token = req.cookies.get('session')?.value;
  
  if (!token) {
    return { authenticated: false, error: 'No session token found' };
  }

  const decoded = verifyToken(token);
  
  if (!decoded) {
    return { authenticated: false, error: 'Invalid or expired session' };
  }

  // Verify account exists
  const { data: account, error } = await supabase
    .from('account')
    .select('account_id')
    .eq('account_id', decoded.account_id)
    .single();

  if (error || !account) {
    return { authenticated: false, error: 'Account not found' };
  }

  return { authenticated: true, account: decoded };
}
