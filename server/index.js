const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');

// Express 앱 초기화
const app = express();

// 미들웨어
// CORS 설정
app.use(cors({
  origin: function (origin, callback) {
    // 개발 환경에서는 모든 origin 허용
    if (process.env.NODE_ENV === 'development' || !origin) {
      callback(null, true);
    } else {
      const allowedOrigins = [
        process.env.CLIENT_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'http://localhost:3000'
      ];
      
      // Vercel 배포 URL 패턴 지원 (동적 허용)
      // CLIENT_URL이 설정되어 있으면 해당 URL과 모든 하위 경로 허용
      if (process.env.CLIENT_URL && origin && origin.startsWith(process.env.CLIENT_URL)) {
        callback(null, true);
        return;
      }
      
      // Vercel 기본 도메인 패턴 허용 (*.vercel.app)
      if (origin && origin.includes('.vercel.app')) {
        callback(null, true);
        return;
      }
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('CORS 정책에 의해 차단되었습니다.'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}));

// 캐시 방지 헤더 (개발 환경)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB 연결
connectDB();

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ 
    message: 'Shopping Mall API 서버가 실행 중입니다.',
    status: 'success'
  });
});

// API 라우트 예시
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// User 라우트
app.use('/api/users', userRoutes);

// Product 라우트
app.use('/api/products', productRoutes);

// Cart 라우트
app.use('/api/cart', cartRoutes);

// Order 라우트
app.use('/api/orders', orderRoutes);

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ 
    message: '요청한 리소스를 찾을 수 없습니다.',
    path: req.path
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || '서버 내부 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 서버 시작
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ 포트 ${PORT}가 이미 사용 중입니다.`);
    console.error(`다음 명령어로 포트를 사용 중인 프로세스를 확인하세요:`);
    console.error(`  Windows: netstat -ano | findstr :${PORT}`);
    console.error(`  또는 다른 포트를 사용하려면 .env 파일에 PORT=5001 등을 설정하세요.\n`);
    process.exit(1);
  } else {
    console.error('서버 시작 중 오류 발생:', err);
    process.exit(1);
  }
});

