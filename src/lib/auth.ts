import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key'
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE || '3600')

export interface TokenPayload {
  userId: string
  clubId: string
  username: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(12)
  return bcryptjs.hash(password, salt)
}

// Verify password
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcryptjs.compare(password, hash)
}

// Generate tokens
export const generateTokens = (payload: TokenPayload): AuthTokens => {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: SESSION_MAX_AGE,
  })

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: SESSION_MAX_AGE,
  }
}

// Verify access token
export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

// Verify refresh token
export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload
  } catch {
    return null
  }
}

// Hash token for storage
export const hashToken = (token: string): string => {
  return require('crypto').createHash('sha256').update(token).digest('hex')
}
