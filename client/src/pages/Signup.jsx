import { useNavigate } from 'react-router-dom';
import { useSignupForm } from '../hooks/useSignupForm';
import { usePostcode } from '../hooks/usePostcode';
import { useAgreements } from '../hooks/useAgreements';
import FormField from '../components/FormField';
import AddressInput from '../components/AddressInput';
import AgreementSection from '../components/AgreementSection';
import PostcodeLayer from '../components/PostcodeLayer';
import './Signup.css';

function Signup() {
  const navigate = useNavigate();
  
  const handleSuccess = () => {
    alert('회원가입이 완료되었습니다!');
    navigate('/login');
  };

  const {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    updateFormData,
    handleSubmit: handleFormSubmit
  } = useSignupForm(handleSuccess);

  const handleAddressSelect = (addressData) => {
    updateFormData(addressData);
  };

  const {
    showLayer: showPostcodeLayer,
    openPostcodeLayer,
    closePostcodeLayer
  } = usePostcode(handleAddressSelect);

  const {
    agreements,
    handleAgreementChange
  } = useAgreements();

  const handleSubmit = (e) => {
    handleFormSubmit(e, agreements);
  };

  return (
    <div className="signup-container">
      <PostcodeLayer show={showPostcodeLayer} onClose={closePostcodeLayer} />
      
      <div className="signup-card">
        <h1 className="signup-title">회원가입</h1>
        <p className="signup-subtitle">프리미엄 커피를 경험해보세요</p>

        <form onSubmit={handleSubmit} className="signup-form">
          <FormField
            id="name"
            name="name"
            label="이름"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="홍길동"
            error={errors.name}
          />

          <FormField
            id="email"
            name="email"
            label="이메일"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="example@email.com"
            error={errors.email}
          />

          <FormField
            id="password"
            name="password"
            label="비밀번호"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="최소 8자 이상"
            error={errors.password}
          />

          <FormField
            id="confirmPassword"
            name="confirmPassword"
            label="비밀번호 확인"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="비밀번호 확인"
            error={errors.confirmPassword}
          />

          <FormField
            id="phone"
            name="phone"
            label="연락처"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="010-1234-5678"
            error={errors.phone}
          />

          <AddressInput
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
            onPostcodeSearch={openPostcodeLayer}
          />

          <AgreementSection
            agreements={agreements}
            onAgreementChange={handleAgreementChange}
            errors={errors}
          />

          {errors.submit && (
            <div className="error-message submit-error">{errors.submit}</div>
          )}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? '처리 중...' : '회원가입'}
          </button>

              <div className="login-link">
                이미 회원이신가요? <button type="button" onClick={() => navigate('/login')}>로그인</button>
              </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;

