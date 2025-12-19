const jwt = require('jsonwebtoken');

// JWT 토큰 발급
exports.generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    level: user.level
  };

  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return jwt.sign(payload, secret, { expiresIn });
};

// JWT 토큰 검증
exports.verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('유효하지 않은 토큰입니다.');
  }
};

