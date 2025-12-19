import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../utils/api';
import { validatePassword } from '../utils/validation';
import './ChangePassword.css';

function ChangePassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 로그인 상태 확인
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  // 비밀번호 변경이 필요한 경우인지 확인
  useEffect(() => {
    if (!user || !token) {
      // 로그인하지 않은 경우 홈으로 리다이렉트
      navigate('/');
      return;
    }

    // needsPasswordChange 플래그가 없으면 홈으로 리다이렉트
    // (로그아웃 후 다시 로그인한 경우 플래그가 없으므로 비밀번호 변경 페이지로 접근 불가)
    const needsPasswordChange = localStorage.getItem('needsPasswordChange');
    if (needsPasswordChange !== 'true') {
      navigate('/');
      return;
    }

    // 메모 필드에 비밀번호 초기화 관련 메시지가 있는지 확인
    const hasPasswordResetMemo = user.memo && (
      user.memo.includes('비밀번호가 초기화되었습니다') || 
      user.memo.includes('비밀번호 입력 5회 실패')
    );

    if (!hasPasswordResetMemo) {
      // 메모에 비밀번호 초기화 관련 메시지가 없으면 홈으로 리다이렉트
      navigate('/');
      return;
    }
  }, [user, token, navigate]);

  if (!user || !token) {
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 에러 초기화
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // 새 비밀번호 실시간 검증
    if (name === 'newPassword' && value) {
      const passwordError = validatePassword(value);
      if (passwordError) {
        setErrors(prev => ({
          ...prev,
          newPassword: passwordError
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          newPassword: ''
        }));
      }
    }
    
    // 비밀번호 확인 실시간 검증
    if (name === 'confirmPassword' && value && formData.newPassword) {
      if (value !== formData.newPassword) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: '비밀번호가 일치하지 않습니다.'
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          confirmPassword: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    // 클라이언트 측 유효성 검사
    const validationErrors = {};
    
    if (!formData.currentPassword) {
      validationErrors.currentPassword = '현재 비밀번호를 입력해주세요.';
    }
    
    if (!formData.newPassword) {
      validationErrors.newPassword = '새 비밀번호를 입력해주세요.';
    } else {
      const passwordError = validatePassword(formData.newPassword);
      if (passwordError) {
        validationErrors.newPassword = passwordError;
      }
    }
    
    if (!formData.confirmPassword) {
      validationErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (formData.newPassword !== formData.confirmPassword) {
      validationErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }
    
    if (formData.currentPassword === formData.newPassword) {
      validationErrors.newPassword = '현재 비밀번호와 새 비밀번호가 동일합니다.';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await changePassword(user._id, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      if (response.success) {
        setSuccessMessage('비밀번호가 성공적으로 변경되었습니다.');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // 비밀번호 변경 완료 플래그 제거
        localStorage.removeItem('needsPasswordChange');
        
        // 사용자 정보 업데이트 (서버에서 업데이트된 사용자 정보를 받아온 경우)
        if (response.data && response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        // 2초 후 홈으로 이동
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      setErrors({
        submit: error.message || '비밀번호 변경 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <h1 className="change-password-title">비밀번호 변경</h1>
        <p className="change-password-subtitle">보안을 위해 정기적으로 비밀번호를 변경해주세요</p>

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="form-group">
            <label htmlFor="currentPassword">현재 비밀번호</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleInputChange}
              placeholder="현재 비밀번호를 입력하세요"
              className={errors.currentPassword ? 'error' : ''}
              disabled={isSubmitting}
            />
            {errors.currentPassword && <div className="error-message">{errors.currentPassword}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">새 비밀번호</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleInputChange}
              placeholder="최소 8자 이상, 최대 20자 이하"
              className={errors.newPassword ? 'error' : ''}
              disabled={isSubmitting}
            />
            {errors.newPassword && <div className="error-message">{errors.newPassword}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">새 비밀번호 확인</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="새 비밀번호를 다시 입력하세요"
              className={errors.confirmPassword ? 'error' : ''}
              disabled={isSubmitting}
            />
            {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
          </div>

          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}

          {errors.submit && (
            <div className="error-message submit-error">
              {errors.submit}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? '처리 중...' : '비밀번호 변경'}
          </button>

          <div className="cancel-link">
            <button type="button" onClick={() => navigate('/')} className="cancel-btn">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;

