import { useState } from 'react';
import { validateSignupForm } from '../utils/validation';
import { signupUser } from '../utils/api';

export const useSignupForm = (onSuccess) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    postalCode: '',
    address1: '',
    address2: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  };

  const updateFormData = (updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  };

  const validate = (agreements) => {
    const newErrors = validateSignupForm(formData, agreements);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e, agreements) => {
    e.preventDefault();

    // 유효성 검사
    if (!validate(agreements)) {
      return;
    }

    setIsSubmitting(true);
    setErrors({}); // 이전 에러 초기화

    try {
      // 주소를 객체로 변환
      const addressObj = formData.address1 ? {
        postalCode: formData.postalCode || undefined,
        address1: formData.address1,
        address2: formData.address2 || undefined,
        country: '대한민국'
      } : undefined;

      // 서버에 전송할 데이터 구성
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        address: addressObj,
        password: formData.password
      };

      // 서버에 회원가입 요청
      const result = await signupUser(userData);
      
      // 성공 시 콜백 실행
      if (result.success) {
        onSuccess();
      } else {
        setErrors({ submit: result.message || '회원가입 중 오류가 발생했습니다.' });
      }
    } catch (error) {
      // 에러 메시지 설정
      const errorMessage = error.message || '네트워크 오류가 발생했습니다. 다시 시도해주세요.';
      setErrors({ submit: errorMessage });
      console.error('회원가입 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    updateFormData,
    handleSubmit
  };
};

