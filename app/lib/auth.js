import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not configured')
}

/**
 * Generate a JWT token for a user
 * @param {Object} payload - User data to include in the token
 * @param {string} expiresIn - Token expiration time (default: '24h')
 * @returns {string} JWT token
 */
export const generateToken = (payload, expiresIn = '24h') => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn })
  } catch (error) {
    console.error('Error generating JWT token:', error)
    throw new Error('Failed to generate authentication token')
  }
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired')
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token')
    } else {
      console.error('Error verifying JWT token:', error)
      throw new Error('Failed to verify authentication token')
    }
  }
}

/**
 * Extract token from Authorization header
 * @param {Request} request - HTTP request object
 * @returns {string|null} JWT token or null if not found
 */
export const extractTokenFromHeader = (request) => {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    return null
  }
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
}

/**
 * Middleware function to verify JWT token from request
 * @param {Request} request - HTTP request object
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is missing or invalid
 */
export const requireAuth = (request) => {
  const token = extractTokenFromHeader(request)
  
  if (!token) {
    throw new Error('Authentication token is required')
  }
  
  return verifyToken(token)
}
