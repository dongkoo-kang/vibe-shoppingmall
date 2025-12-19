const mongoose = require('mongoose');

const connectDB = async () => {
  // 우선순위: MONGODBATLAS_URI > MONGODB_URI > 로컬 주소
  const atlasUri = process.env.MONGODBATLAS_URI;
  const mongoUri = process.env.MONGODB_URI;
  const localUri = 'mongodb://localhost:27017/shoppingmall';
  
  // Atlas URI가 있으면 우선 사용, 없으면 MONGODB_URI 또는 로컬 주소
  let uriToTry = atlasUri || mongoUri || localUri;
  let uriName = atlasUri ? 'MONGODBATLAS_URI' : (mongoUri ? 'MONGODB_URI' : '로컬 주소');

  try {
    console.log(`MongoDB 연결 시도 중... (${uriName})`);
    
    const conn = await mongoose.connect(uriToTry, {
      // MongoDB 6.0 이상에서는 아래 옵션들이 기본값이므로 생략 가능
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`MongoDB 연결 성공: ${conn.connection.host} (${uriName} 사용)`);
  } catch (error) {
    console.error(`MongoDB 연결 실패 (${uriName}):`, error.message);
    
    // Atlas URI를 사용했는데 실패한 경우, 로컬로 재시도
    if (atlasUri && uriToTry === atlasUri) {
      console.log('MongoDB Atlas 연결 실패. 로컬 MongoDB로 재시도 중...');
      
      // 기존 연결 정리
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      
      try {
        const localConn = await mongoose.connect(localUri, {
          // MongoDB 6.0 이상에서는 아래 옵션들이 기본값이므로 생략 가능
          // useNewUrlParser: true,
          // useUnifiedTopology: true,
        });
        console.log(`MongoDB 연결 성공: ${localConn.connection.host} (로컬 주소 사용)`);
      } catch (localError) {
        console.error('로컬 MongoDB 연결도 실패:', localError.message);
        console.error('MongoDB가 실행 중인지 확인하세요.');
        process.exit(1);
      }
    } else {
      console.error('MongoDB 연결에 실패했습니다. MongoDB가 실행 중인지 확인하세요.');
      process.exit(1);
    }
  }
};

module.exports = connectDB;

