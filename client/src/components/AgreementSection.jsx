import { useState } from 'react';
import TermsLayer from './TermsLayer';

function AgreementSection({ agreements, onAgreementChange, errors }) {
  const [showTermsLayer, setShowTermsLayer] = useState(false);
  const [showPrivacyLayer, setShowPrivacyLayer] = useState(false);

  return (
    <>
      <div className="agreement-section">
        <div className="agreement-item">
          <label className="agreement-checkbox">
            <input
              type="checkbox"
              checked={agreements.all}
              onChange={() => onAgreementChange('all')}
            />
            <span>전체 동의</span>
          </label>
        </div>

        <div className="agreement-item indent">
          <label className="agreement-checkbox">
            <input
              type="checkbox"
              checked={agreements.terms}
              onChange={() => onAgreementChange('terms')}
            />
            <span>이용약관 동의 <span className="required">(필수)</span></span>
          </label>
          <button 
            type="button" 
            className="view-link"
            onClick={() => setShowTermsLayer(true)}
          >
            보기
          </button>
        </div>

        <div className="agreement-item indent">
          <label className="agreement-checkbox">
            <input
              type="checkbox"
              checked={agreements.privacy}
              onChange={() => onAgreementChange('privacy')}
            />
            <span>개인정보처리방침 동의 <span className="required">(필수)</span></span>
          </label>
          <button 
            type="button" 
            className="view-link"
            onClick={() => setShowPrivacyLayer(true)}
          >
            보기
          </button>
        </div>

      <div className="agreement-item indent">
        <label className="agreement-checkbox">
          <input
            type="checkbox"
            checked={agreements.marketing}
            onChange={() => onAgreementChange('marketing')}
          />
          <div className="marketing-checkbox-content">
            <span>마케팅 정보 수신 동의 <span className="optional">(선택)</span></span>
            <div className="marketing-info">
              이용정보 : 이름, 이메일 주소  /  사용용도 : 메거진, 새상품 정보, 이벤트
            </div>
          </div>
        </label>
      </div>

        {(errors.terms || errors.privacy) && (
          <span className="error-message">필수 약관에 동의해주세요.</span>
        )}
      </div>

      <TermsLayer
        show={showTermsLayer}
        title="이용약관"
        content="이용약관 입니다."
        onClose={() => setShowTermsLayer(false)}
      />

      <TermsLayer
        show={showPrivacyLayer}
        title="개인정보처리방침"
        content="개인정보처리 방침을 지킵니다."
        onClose={() => setShowPrivacyLayer(false)}
      />
    </>
  );
}

export default AgreementSection;

