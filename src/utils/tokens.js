const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const { config } = require('../config/app');

// Generate access token
const generateAccessToken = (userId, email, role) => {
  return jwt.sign(
    { 
      userId, 
      email, 
      role,
      type: 'access'
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

// Generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Save refresh token to database
const saveRefreshToken = async (userId, refreshToken, expiresAt, req) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, created_ip, user_agent) 
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, refreshToken, expiresAt, clientIp, userAgent]
  );
};

// Revoke refresh token
const revokeRefreshToken = async (refreshToken) => {
  await query(
    'UPDATE refresh_tokens SET is_revoked = true WHERE token = $1',
    [refreshToken]
  );
};

// Revoke all refresh tokens for a user
const revokeAllUserTokens = async (userId) => {
  await query(
    'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
    [userId]
  );
};

// Clean up expired refresh tokens
const cleanupExpiredTokens = async () => {
  await query(
    'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
  );
};

// Get refresh token info
const getRefreshTokenInfo = async (refreshToken) => {
  const result = await query(
    `SELECT rt.*, u.id as user_id, u.email, u.name, u.role, u.is_active 
     FROM refresh_tokens rt 
     JOIN users u ON rt.user_id = u.id 
     WHERE rt.token = $1`,
    [refreshToken]
  );

  return result.rows[0] || null;
};

// Generate token pair (access + refresh)
const generateTokenPair = async (userId, email, role, req) => {
  const accessToken = generateAccessToken(userId, email, role);
  const refreshToken = generateRefreshToken();
  
  // Set refresh token expiration (30 days)
  const refreshTokenExpiresAt = new Date();
  refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 30);

  // Save refresh token to database
  await saveRefreshToken(userId, refreshToken, refreshTokenExpiresAt, req);

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt
  };
};

// Verify and decode JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw error;
  }
};

// Get token expiration time
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded ? new Date(decoded.exp * 1000) : null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  getRefreshTokenInfo,
  generateTokenPair,
  verifyToken,
  getTokenExpiration
}; 