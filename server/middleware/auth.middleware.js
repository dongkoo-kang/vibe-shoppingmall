const { verifyToken } = require('../utils/jwt');

// 인증 미들웨어 (로그인 확인)
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }
    
    const token = authHeader.substring(7); // 'Bearer ' 제거
    
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '인증 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 관리자 권한 체크 미들웨어
exports.isAdmin = async (req, res, next) => {
  try {
    // 먼저 인증 미들웨어를 통과해야 함
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다.'
      });
    }
    
    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '권한 확인 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

