const User = require('../models/user.model');
const { generateToken } = require('../utils/jwt');
const { generateRandomPassword } = require('../utils/password');

// 모든 사용자 조회
exports.getAllUsers = async (req, res) => {
  try {
    const { role, level, isActive, page = 1, limit = 10 } = req.query;
    const filter = {};
    
    // 필터링 옵션
    if (role) filter.role = role;
    if (level) filter.level = parseInt(level);
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(filter)
      .select('-password') // 비밀번호 제외
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(filter);
    
    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '사용자 목록을 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 특정 사용자 조회
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '사용자를 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 회원가입 (사용자 생성)
exports.createUser = async (req, res) => {
  try {
    const { email, password, name, phone, role, level, address, memo } = req.body;
    
    // 필수 필드 검증
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '이메일, 비밀번호, 이름은 필수입니다.'
      });
    }
    
    // 이메일 중복 확인
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 이메일입니다.'
      });
    }
    
    // 사용자 생성
    const userData = {
      email: email.toLowerCase(),
      password,
      name: name.trim(),
      phone: phone ? phone.trim() : undefined,
      role: role || 'customer',
      level: level || 1,
      address: address || undefined,
      memo: memo ? memo.trim() : undefined
    };
    
    const user = new User(userData);
    const savedUser = await user.save();
    
    // 비밀번호 제외하고 응답
    const userResponse = savedUser.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: userResponse
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 이메일입니다.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '회원가입 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 로그인
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 입력해주세요.'
      });
    }
    
    // 사용자 찾기
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '입력하신 이메일 주소로 등록된 계정을 찾을 수 없습니다.',
        loginAttempts: 0,
        remainingAttempts: 5
      });
    }
    
    // 계정 잠금 확인
    if (user.isLocked) {
      const response = {
        success: false,
        message: '계정이 잠금되었습니다.',
        isLocked: true,
        lockUntil: user.lockUntil
      };
      
      // 메모가 있으면 메시지 밑에 추가
      if (user.memo) {
        response.memo = user.memo;
      }
      
      return res.status(423).json(response);
    }
    
    // 계정 활성화 확인
    if (!user.isActive) {
      const response = {
        success: false,
        message: '비활성화된 계정입니다.'
      };
      
      // 메모가 있으면 메시지 밑에 추가
      if (user.memo) {
        response.memo = user.memo;
      }
      
      return res.status(403).json(response);
    }
    
    // 비밀번호 확인
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // 로그인 실패 횟수 증가
      await user.incLoginAttempts();
      
      // 업데이트된 사용자 정보 다시 조회
      const refreshedUser = await User.findById(user._id);
      
      // 잠금 상태 확인 (lockUntil 직접 확인)
      const isLocked = refreshedUser.lockUntil && refreshedUser.lockUntil > Date.now();
      
      if (isLocked) {
        // 5회 실패 시 메모 필드에 안내 메시지 추가
        if (!refreshedUser.memo || !refreshedUser.memo.includes('비밀번호 입력 5회 실패')) {
          await User.updateOne(
            { _id: refreshedUser._id },
            { $set: { memo: '비밀번호 입력 5회 실패 / 로그인 화면에서 비밀번호를 초기화 해주세요.' } }
          );
          refreshedUser.memo = '비밀번호 입력 5회 실패 / 로그인 화면에서 비밀번호를 초기화 해주세요.';
        }
        
        const response = {
          success: false,
          message: '5회 로그인 실패로 계정이 잠금되었습니다.',
          isLocked: true,
          lockUntil: refreshedUser.lockUntil,
          loginAttempts: refreshedUser.loginAttempts
        };
        
        // 메모가 있으면 메시지 밑에 추가
        if (refreshedUser.memo) {
          response.memo = refreshedUser.memo;
        }
        
        return res.status(423).json(response);
      }
      
      const remainingAttempts = Math.max(0, 5 - refreshedUser.loginAttempts);
      
      return res.status(401).json({
        success: false,
        message: `비밀번호를 잘못입력하셨습니다.(${refreshedUser.loginAttempts}/5)`,
        loginAttempts: refreshedUser.loginAttempts,
        remainingAttempts: remainingAttempts
      });
    }
    
    // 로그인 성공 시 실패 횟수 초기화
    await user.resetLoginAttempts();
    
    // 로그인 시간 업데이트
    await user.updateLastLogin();
    
    // JWT 토큰 발급
    const token = generateToken(user);
    
    // 비밀번호 제외하고 응답
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({
      success: true,
      message: '로그인 성공',
      token: token,
      data: userResponse
    });
  } catch (error) {
    // ValidationError 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.error('ValidationError 발생:', error);
      return res.status(400).json({
        success: false,
        message: messages[0] || '입력 데이터가 유효하지 않습니다.',
        errors: messages
      });
    }
    
    // 일반 에러 처리 - 에러 메시지를 그대로 전달
    console.error('로그인 에러:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || '로그인 중 오류가 발생했습니다.',
      ...(process.env.NODE_ENV === 'development' && { error: error.message, stack: error.stack })
    });
  }
};

// 사용자 정보 수정 (전체 업데이트)
exports.updateUser = async (req, res) => {
  try {
    const { name, phone, role, level, address, isActive, memo } = req.body;
    
    const updateData = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : undefined;
    if (role !== undefined) updateData.role = role;
    if (level !== undefined) updateData.level = level;
    if (address !== undefined) updateData.address = address;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (memo !== undefined) updateData.memo = memo ? memo.trim() : undefined;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '사용자 정보가 수정되었습니다.',
      data: user
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: '사용자 정보 수정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 사용자 정보 부분 수정
exports.patchUser = async (req, res) => {
  try {
    const updateData = {};
    const allowedFields = ['name', 'phone', 'role', 'level', 'address', 'isActive', 'memo'];
    
    // 요청된 필드만 업데이트
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'name' || key === 'phone' || key === 'memo') {
          updateData[key] = req.body[key] ? req.body[key].trim() : undefined;
        } else {
          updateData[key] = req.body[key];
        }
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '수정할 필드를 입력해주세요.'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '사용자 정보가 수정되었습니다.',
      data: user
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: '사용자 정보 수정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 비밀번호 변경
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '현재 비밀번호와 새 비밀번호를 입력해주세요.'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    // 현재 비밀번호 확인
    const isPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '현재 비밀번호가 올바르지 않습니다.'
      });
    }
    
    // 새 비밀번호 설정
    user.password = newPassword;
    
    // 비밀번호 초기화 관련 memo 필드 제거
    if (user.memo && (
      user.memo.includes('비밀번호가 초기화되었습니다') || 
      user.memo.includes('비밀번호 입력 5회 실패')
    )) {
      user.memo = undefined;
    }
    
    await user.save();
    
    // 업데이트된 사용자 정보 반환 (비밀번호 제외)
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({
      success: true,
      message: '비밀번호가 변경되었습니다.',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: '비밀번호 변경 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 비밀번호 초기화
exports.resetPassword = async (req, res) => {
  try {
    const { email, name, phone } = req.body;
    
    // 필수 필드 검증
    if (!email || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: '이메일, 이름, 연락처를 모두 입력해주세요.'
      });
    }
    
    // 사용자 찾기 (이메일, 이름, 연락처로 확인)
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      name: name.trim(),
      phone: phone.trim()
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '입력하신 정보와 일치하는 사용자를 찾을 수 없습니다.'
      });
    }
    
    // 계정 활성화 확인
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: '비활성화된 계정입니다.'
      });
    }
    
    // 새 비밀번호 생성 (임의 문자+숫자 조합 8자리)
    const newPassword = generateRandomPassword();
    
    // 비밀번호 변경
    user.password = newPassword;
    
    // 로그인 실패 횟수 초기화 및 잠금 해제
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    
    // 메모 필드에 비밀번호 초기화 플래그 설정 (로그인 후 비밀번호 변경 유도)
    user.memo = '비밀번호가 초기화되었습니다. 로그인 후 비밀번호를 변경해주세요.';
    
    // 모든 변경사항을 한 번에 저장 (비밀번호 검증 포함)
    await user.save();
    
    res.json({
      success: true,
      message: '비밀번호가 초기화되었습니다.',
      newPassword: newPassword // 화면에 보여주기 위해 반환
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: '비밀번호 초기화 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 사용자 삭제
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '사용자가 삭제되었습니다.',
      data: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '사용자 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

