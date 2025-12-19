// 이메일 유효성 검사
export const validateEmail = (email) => {
  if (!email.trim()) {
    return '이메일을 입력해주세요.';
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return '유효한 이메일 주소를 입력해주세요.';
  }
  return '';
};

// 비밀번호 유효성 검사
export const validatePassword = (password) => {
  if (!password) {
    return '비밀번호를 입력해주세요.';
  }
  if (password.length < 8) {
    return '비밀번호는 최소 8자 이상이어야 합니다.';
  }
  if (password.length > 20) {
    return '비밀번호는 최대 20자 이하여야 합니다.';
  }
  return '';
};

// 회원가입 폼 전체 검증
export const validateSignupForm = (formData, agreements) => {
  const errors = {};

  if (!formData.name.trim()) {
    errors.name = '이름을 입력해주세요.';
  }

  const emailError = validateEmail(formData.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(formData.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = '비밀번호 확인을 입력해주세요.';
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
  }

  if (!agreements.terms) {
    errors.terms = '이용약관에 동의해주세요.';
  }

  if (!agreements.privacy) {
    errors.privacy = '개인정보처리방침에 동의해주세요.';
  }

  return errors;
};

