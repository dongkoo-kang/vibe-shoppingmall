import { API_URL } from '../config/api';

// 개발 환경 확인
const isDevelopment = import.meta.env.DEV;

// 공통 fetch 옵션 (개발 환경에서만 캐시 방지)
const getFetchOptions = (method = 'POST', body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // 개발 환경에서만 캐시 방지 헤더 추가
  if (isDevelopment) {
    options.headers['Cache-Control'] = 'no-cache';
    options.headers['Pragma'] = 'no-cache';
    options.cache = 'no-store';
  }
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  return options;
};

// 회원가입 API 호출
export const signupUser = async (userData) => {
  try {
    const response = await fetch(API_URL, getFetchOptions('POST', userData));

    const data = await response.json();
    
    // 서버 응답이 success: false인 경우
    if (!response.ok || !data.success) {
      // 서버에서 전달한 에러 메시지가 있으면 사용
      const errorMessage = data.message || data.errors?.join(', ') || '회원가입 중 오류가 발생했습니다.';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    // 네트워크 오류인 경우
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    // 이미 Error 객체인 경우 그대로 throw
    throw error;
  }
};

// 로그인 API 호출
export const loginUser = async (loginData) => {
  try {
    const response = await fetch(`${API_URL}/login`, getFetchOptions('POST', loginData));

    // 응답이 JSON인지 확인
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`서버가 JSON 형식의 응답을 반환하지 않았습니다. (${response.status} ${response.statusText})`);
    }

    const data = await response.json();
    
    // 서버 응답이 success: false인 경우
    if (!response.ok || !data.success) {
      // 서버에서 전달한 에러 메시지가 있으면 사용
      // ValidationError의 경우 errors 배열의 첫 번째 메시지 사용
      let errorMessage = data.message || '로그인 중 오류가 발생했습니다.';
      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        errorMessage = data.errors[0];
      }
      
      const error = new Error(errorMessage);
      // 이메일이 없는 경우 (404) 플래그 추가
      if (response.status === 404) {
        error.emailNotFound = true;
      }
      // 추가 정보 전달
      if (data.loginAttempts !== undefined) {
        error.loginAttempts = data.loginAttempts;
        error.remainingAttempts = data.remainingAttempts;
      }
      if (data.isLocked) {
        error.isLocked = data.isLocked;
        error.memo = data.memo;
        error.lockUntil = data.lockUntil;
      }
      if (data.memo) {
        error.memo = data.memo;
      }
      if (data.errors) {
        error.errors = data.errors;
      }
      throw error;
    }

    return data;
  } catch (error) {
    // 네트워크 오류인 경우
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    // 이미 Error 객체인 경우 그대로 throw
    throw error;
  }
};

// 비밀번호 변경 API 호출
export const changePassword = async (userId, passwordData) => {
  try {
    const token = localStorage.getItem('token');
    const options = getFetchOptions('PATCH', passwordData);
    
    // 인증 토큰 추가
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/${userId}/password`, options);
    
    // 응답이 JSON인지 확인
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`서버가 JSON 형식의 응답을 반환하지 않았습니다. (${response.status} ${response.statusText})`);
    }

    const data = await response.json();
    
    // 서버 응답이 success: false인 경우
    if (!response.ok || !data.success) {
      const errorMessage = data.message || '비밀번호 변경 중 오류가 발생했습니다.';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    // 네트워크 오류인 경우
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    // 이미 Error 객체인 경우 그대로 throw
    throw error;
  }
};

// 비밀번호 초기화 API 호출
export const resetPassword = async (resetData) => {
  try {
    const response = await fetch(`${API_URL}/reset-password`, getFetchOptions('POST', resetData));

    const data = await response.json();
    
    // 서버 응답이 success: false인 경우
    if (!response.ok || !data.success) {
      const errorMessage = data.message || '비밀번호 초기화 중 오류가 발생했습니다.';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    // 네트워크 오류인 경우
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    // 이미 Error 객체인 경우 그대로 throw
    throw error;
  }
};

