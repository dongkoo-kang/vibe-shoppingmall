import { useState, useCallback } from 'react';
import { initPostcode, processPostcodeData } from '../utils/postcode';

export const usePostcode = (onAddressSelect) => {
  const [showLayer, setShowLayer] = useState(false);

  const openPostcodeLayer = useCallback(() => {
    setShowLayer(true);
    
    // 레이어가 표시된 후에 embed 실행
    setTimeout(() => {
      const elementLayer = document.getElementById('postcode-layer');
      if (elementLayer) {
        initPostcode(elementLayer, (data) => {
          const addressData = processPostcodeData(data);
          onAddressSelect(addressData);
          setShowLayer(false);
          
          // 커서를 상세주소 필드로 이동한다.
          setTimeout(() => {
            const address2Input = document.getElementById('address2');
            if (address2Input) {
              address2Input.focus();
            }
          }, 100);
        });
      }
    }, 100);
  }, [onAddressSelect]);

  const closePostcodeLayer = useCallback(() => {
    setShowLayer(false);
  }, []);

  return {
    showLayer,
    openPostcodeLayer,
    closePostcodeLayer
  };
};

