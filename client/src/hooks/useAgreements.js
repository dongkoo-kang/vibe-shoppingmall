import { useState, useCallback } from 'react';

export const useAgreements = () => {
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false
  });

  const handleAgreementChange = useCallback((type) => {
    if (type === 'all') {
      setAgreements(prev => {
        const newValue = !prev.all;
        return {
          all: newValue,
          terms: newValue,
          privacy: newValue,
          marketing: newValue
        };
      });
    } else {
      setAgreements(prev => {
        const newAgreements = {
          ...prev,
          [type]: !prev[type]
        };
        // 전체 동의는 모든 필수 항목이 체크되었을 때만 true
        newAgreements.all = newAgreements.terms && newAgreements.privacy;
        return newAgreements;
      });
    }
  }, []);

  return {
    agreements,
    handleAgreementChange
  };
};

