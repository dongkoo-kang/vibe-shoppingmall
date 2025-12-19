import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, resetPassword } from '../utils/api';
import { validateEmail } from '../utils/validation';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  
  // 이미 로그인한 사용자는 메인 페이지로 리다이렉트
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      navigate('/');
    } else {
      // 로그인하지 않은 경우 상태 초기화
      setErrors({});
      setIsLocked(false);
      setLockMemo('');
      setFormData({
        email: '',
        password: ''
      });
    }
  }, [navigate]);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [resetFormData, setResetFormData] = useState({
    email: '',
    name: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMemo, setLockMemo] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 이메일 실시간 검증
    if (name === 'email' && value) {
      const emailError = validateEmail(value);
      if (emailError) {
        setErrors(prev => ({
          ...prev,
          email: emailError
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          email: ''
        }));
      }
    } else {
      // 에러 초기화
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  const handleResetInputChange = (e) => {
    const { name, value } = e.target;
    setResetFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 클라이언트 측 유효성 검사
    const validationErrors = {};
    if (!formData.email.trim()) {
      validationErrors.email = '이메일을 입력해주세요.';
    } else {
      const emailError = validateEmail(formData.email);
      if (emailError) {
        validationErrors.email = emailError;
      }
    }
    
    if (!formData.password) {
      validationErrors.password = '비밀번호를 입력해주세요.';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    
    // 이전 에러 초기화
    setErrors({});
    setIsLocked(false);
    setLockMemo('');

    try {
      const response = await loginUser(formData);
      console.log('로그인 응답:', response);
      
      // 로그인 성공
      if (response.success && response.token) {
        setErrors({});
        
        // 토큰 저장 (localStorage)
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.data));
        
        // 비밀번호 초기화 후 로그인한 경우 비밀번호 변경 페이지로 이동
        // (메모 필드에 비밀번호 초기화 관련 메시지가 있는지 확인)
        // 단, 로그아웃 후 다시 로그인한 경우는 제외
        const userData = response.data;
        const hasPasswordResetMemo = userData.memo && (
          userData.memo.includes('비밀번호가 초기화되었습니다') || 
          userData.memo.includes('비밀번호 입력 5회 실패')
        );
        
        // 이전 세션에서 비밀번호 변경이 필요한 상태였는지 확인
        const previousSession = localStorage.getItem('needsPasswordChange');
        
        // 비밀번호 변경이 필요한 경우:
        // - hasPasswordResetMemo가 true이고 previousSession이 'true'인 경우에만 비밀번호 변경 페이지로 이동
        // - 로그아웃 후 다시 로그인한 경우 (previousSession이 없음) -> 비밀번호 변경 페이지로 이동하지 않음
        if (hasPasswordResetMemo && previousSession === 'true') {
          // 이전 세션에서도 필요했던 경우 비밀번호 변경 페이지로 이동
          navigate('/change-password');
        } else {
          // 비밀번호 변경이 필요한 경우 플래그 설정 (다음 로그인 시 사용)
          if (hasPasswordResetMemo && !previousSession) {
            localStorage.setItem('needsPasswordChange', 'true');
          } else if (!hasPasswordResetMemo) {
            // 비밀번호 변경이 필요하지 않은 경우 플래그 제거
            localStorage.removeItem('needsPasswordChange');
          }
          // 일반 로그인 성공 시 홈으로 이동
          navigate('/');
        }
      } else {
        // 응답은 왔지만 success가 false인 경우
        console.log('로그인 실패:', response);
        setErrors({
          submit: response.message || '로그인에 실패했습니다.'
        });
      }
    } catch (error) {
      // 에러 메시지 표시
      console.error('로그인 에러:', error);
      
      // 이메일이 없는 경우 (비밀번호 검증 로직 진행하지 않음)
      if (error.emailNotFound) {
        setErrors({
          submit: error.message || '입력하신 이메일 주소로 등록된 계정을 찾을 수 없습니다.',
          email: '등록된 이메일 주소가 아닙니다.'
        });
        setIsLocked(false);
        setLockMemo('');
      }
      // 잠금 상태 확인
      else if (error.isLocked) {
        setIsLocked(true);
        if (error.memo) {
          setLockMemo(error.memo);
        }
        setErrors({
          submit: error.message || '계정이 잠금되었습니다.',
          memo: error.memo
        });
      } else {
        // 비밀번호가 틀린 경우
        const errorMessage = error.message || '비밀번호를 잘못입력하셨습니다.';
        setErrors({
          submit: errorMessage,
          loginAttempts: error.loginAttempts,
          remainingAttempts: error.remainingAttempts
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResetPasswordResult(null);

    try {
      const response = await resetPassword(resetFormData);
      
      if (response.success) {
        setResetPasswordResult({
          success: true,
          newPassword: response.newPassword
        });
        setIsLocked(false);
        setLockMemo('');
        setFormData({
          email: resetFormData.email,
          password: ''
        });
      }
    } catch (error) {
      setResetPasswordResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetFormData({
      email: '',
      name: '',
      phone: ''
    });
    setResetPasswordResult(null);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">로그인</h1>
        <p className="login-subtitle">프리미엄 커피를 경험해보세요</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              name="email"
              type="text"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="example@email.com"
              className={errors.email ? 'error' : ''}
              disabled={isSubmitting}
            />
            {errors.email && <div className="error-message">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="비밀번호를 입력하세요"
              className={errors.password ? 'error' : ''}
              disabled={isSubmitting}
            />
            {errors.password && <div className="error-message">{errors.password}</div>}
          </div>

          {errors.submit && (
            <div className="error-message submit-error">
              {errors.submit}
              {errors.loginAttempts !== undefined && (
                <div className="attempts-info">
                  로그인 시도 횟수: {errors.loginAttempts}회 / 남은 시도 횟수: {errors.remainingAttempts}회
                </div>
              )}
              {errors.memo && (
                <div className="memo-info">{errors.memo}</div>
              )}
            </div>
          )}

          {isLocked && (
            <div className="reset-password-section">
              <button
                type="button"
                className="reset-password-btn"
                onClick={() => setShowResetModal(true)}
              >
                비밀번호 초기화
              </button>
            </div>
          )}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? '처리 중...' : '로그인'}
          </button>

          <div className="signup-link">
            계정이 없으신가요? <button type="button" onClick={() => navigate('/signup')}>회원가입</button>
          </div>
        </form>
      </div>

      {/* 비밀번호 초기화 모달 */}
      {showResetModal && (
        <div className="modal-overlay" onClick={closeResetModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>비밀번호 초기화</h2>
              <button className="modal-close" onClick={closeResetModal}>×</button>
            </div>
            
            {resetPasswordResult?.success ? (
              <div className="reset-success">
                <h3>비밀번호가 초기화되었습니다.</h3>
                <div className="new-password-display">
                  <label>새 비밀번호:</label>
                  <div className="password-box">{resetPasswordResult.newPassword}</div>
                  <p className="password-warning">이 비밀번호를 복사하여 안전한 곳에 보관하세요.</p>
                </div>
                <button className="close-btn" onClick={closeResetModal}>확인</button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="reset-form">
                <div className="form-group">
                  <label htmlFor="reset-email">이메일</label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    value={resetFormData.email}
                    onChange={handleResetInputChange}
                    placeholder="example@email.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reset-name">이름</label>
                  <input
                    id="reset-name"
                    name="name"
                    type="text"
                    value={resetFormData.name}
                    onChange={handleResetInputChange}
                    placeholder="홍길동"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reset-phone">연락처</label>
                  <input
                    id="reset-phone"
                    name="phone"
                    type="tel"
                    value={resetFormData.phone}
                    onChange={handleResetInputChange}
                    placeholder="010-1234-5678"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {resetPasswordResult && !resetPasswordResult.success && (
                  <div className="error-message">{resetPasswordResult.message}</div>
                )}

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={closeResetModal} disabled={isSubmitting}>
                    취소
                  </button>
                  <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? '처리 중...' : '비밀번호 초기화'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;

