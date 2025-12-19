const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, '이메일은 필수입니다.'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, '유효한 이메일 주소를 입력해주세요.']
  },
  password: {
    type: String,
    required: [true, '비밀번호는 필수입니다.'],
    minlength: [8, '비밀번호는 최소 8자 이상이어야 합니다.'],
    maxlength: [20, '비밀번호는 최대 20자 이하여야 합니다.']
  },
  name: {
    type: String,
    required: [true, '이름은 필수입니다.'],
    trim: true,
    maxlength: [50, '이름은 50자 이하여야 합니다.']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9-]+$/, '유효한 전화번호를 입력해주세요.']
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  level: {
    type: Number,
    enum: [1, 2, 3],
    default: 1
  },
  address: {
    postalCode: {
      type: String,
      trim: true
    },
    address1: {
      type: String,
      trim: true
    },
    address2: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  memo: {
    type: String,
    default: null,
    maxlength: [80, '메모는 80자 이하여야 합니다.']
  }
}, {
  timestamps: true, // createdAt, updatedAt 자동 생성
  versionKey: false, // __v 필드 제거
  toJSON: { virtuals: true }, // virtual 속성을 JSON에 포함
  toObject: { virtuals: true } // virtual 속성을 객체에 포함
});

// 비밀번호 해싱 미들웨어
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 비밀번호 비교 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 로그인 시간 업데이트 메서드
userSchema.methods.updateLastLogin = async function() {
  // updateOne을 사용하여 검증 없이 업데이트
  await this.constructor.updateOne(
    { _id: this._id },
    { $set: { lastLogin: new Date() } }
  );
  this.lastLogin = new Date();
  return this;
};

// 계정 잠금 여부 확인 (가상 속성)
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// 로그인 실패 횟수 증가 및 잠금 처리 메서드
userSchema.methods.incLoginAttempts = async function() {
  // 이미 잠금이 해제된 경우 카운트 초기화
  if (this.lockUntil && this.lockUntil < Date.now()) {
    await this.constructor.updateOne(
      { _id: this._id },
      { 
        $set: { loginAttempts: 1 },
        $unset: { lockUntil: 1 }
      }
    );
    this.loginAttempts = 1;
    this.lockUntil = undefined;
    return this;
  }
  
  // 이미 잠금된 상태면 더 이상 증가시키지 않음 (lockUntil 직접 확인)
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return this;
  }
  
  const newLoginAttempts = this.loginAttempts + 1;
  const updateData = { $inc: { loginAttempts: 1 } };
  
  // 5회 실패 시 2시간 잠금
  if (newLoginAttempts >= 5) {
    updateData.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2시간
  }
  
  // updateOne을 사용하여 검증 없이 업데이트
  await this.constructor.updateOne({ _id: this._id }, updateData);
  
  // 로컬 객체도 업데이트
  this.loginAttempts = newLoginAttempts;
  if (newLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
  }
  
  return this;
};

// 로그인 성공 시 실패 횟수 초기화 메서드
userSchema.methods.resetLoginAttempts = async function() {
  // updateOne을 사용하여 검증 없이 업데이트
  await this.constructor.updateOne(
    { _id: this._id },
    { 
      $set: { loginAttempts: 0 },
      $unset: { lockUntil: 1 }
    }
  );
  
  // 로컬 객체도 업데이트
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  
  return this;
};

// 인덱스 설정
// email 필드는 unique: true로 이미 고유 인덱스가 생성되므로 별도 정의 불필요
userSchema.index({ createdAt: -1 }); // 내림차순 인덱스

const User = mongoose.model('User', userSchema);

module.exports = User;

