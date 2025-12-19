import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Checkout.css';
import { getCart } from '../utils/cartApi';
import { createOrder } from '../utils/orderApi';
import { usePostcode } from '../hooks/usePostcode';
import PostcodeLayer from '../components/PostcodeLayer';
import { processPostcodeData } from '../utils/postcode';

function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // 보내는사람 정보
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  
  // 받는사람 정보
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  
  // 보내는사람과 받는사람 동일 여부
  const [isSameAsSender, setIsSameAsSender] = useState(false);
  
  // 결제 정보
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, completed, failed
  
  // 기타
  const [emailAgreement, setEmailAgreement] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 우편번호 검색
  const handleAddressSelect = (addressData) => {
    setPostalCode(addressData.postalCode || '');
    setAddress1(addressData.address1 || '');
  };

  const {
    showLayer: showPostcodeLayer,
    openPostcodeLayer,
    closePostcodeLayer
  } = usePostcode(handleAddressSelect);

  useEffect(() => {
    // 포트원(아임포트) 결제 모듈 초기화
    if (window.IMP) {
      window.IMP.init('imp62570232');
    } else {
      console.warn('포트원 스크립트가 로드되지 않았습니다.');
    }

    const loadCart = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getCart();
        const cartData = res.data || { items: [], totalAmount: 0 };
        
        if (!cartData.items || cartData.items.length === 0) {
          alert('장바구니가 비어있습니다.');
          navigate('/cart');
          return;
        }
        
        setCart(cartData);
        
        // 사용자 정보 가져오기 (보내는사람 기본값)
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            // 보내는사람 정보 자동 채우기
            setSenderName(user.name || '');
            setSenderPhone(user.phone || '');
            
            // 주소 정보 자동 채우기
            if (user.address) {
              const addressParts = [];
              if (user.address.postalCode) addressParts.push(user.address.postalCode);
              if (user.address.address1) addressParts.push(user.address.address1);
              if (user.address.address2) addressParts.push(user.address.address2);
              if (user.address.city) addressParts.push(user.address.city);
              
              const fullAddress = addressParts.join(' ');
              setSenderAddress(fullAddress);
            }
          } catch (e) {
            console.error('사용자 정보 파싱 오류:', e);
          }
        }
      } catch (err) {
        console.error('장바구니 로딩 에러:', err);
        if (err.message && (err.message.includes('인증') || err.message.includes('로그인') || err.message.includes('401'))) {
          setIsRedirecting(true);
          navigate('/login');
        } else {
          setError(err.message || '장바구니를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem('token');
    if (!token) {
      setIsRedirecting(true);
      navigate('/login');
      return;
    }

    loadCart();
  }, [navigate]);

  // 보내는사람과 받는사람이 동일한 경우 자동 입력
  useEffect(() => {
    if (isSameAsSender) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setRecipientName(user.name || '');
          setRecipientPhone(user.phone || '');
          setRecipientEmail(user.email || '');
          
          if (user.address) {
            if (user.address.postalCode) setPostalCode(user.address.postalCode);
            if (user.address.address1) setAddress1(user.address.address1);
            if (user.address.address2) setAddress2(user.address.address2);
          }
        } catch (e) {
          console.error('사용자 정보 파싱 오류:', e);
        }
      }
    }
  }, [isSameAsSender]);

  // 리다이렉트 중일 때는 로딩 화면 표시
  if (isRedirecting) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="loading-state">로그인 페이지로 이동 중...</div>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    if (!window.IMP) {
      alert('결제 모듈을 불러올 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    // 유효성 검사
    if (!recipientName.trim()) {
      alert('받는사람 이름을 입력해주세요.');
      return;
    }
    if (!recipientPhone.trim()) {
      alert('받는사람 휴대폰 번호를 입력해주세요.');
      return;
    }
    if (!postalCode.trim()) {
      alert('우편번호를 입력해주세요.');
      return;
    }
    if (!address1.trim()) {
      alert('주소를 입력해주세요.');
      return;
    }

    const items = cart.items || [];
    const subtotal = cart.totalAmount || 0;
    const shippingFee = 3000;
    const totalAmount = subtotal + shippingFee;

      // 결제 요청 데이터 구성
      // 결제 방법에 따라 PG사 설정
      let pgValue = '';
      let payMethodValue = '';
      
      if (paymentMethod === 'card') {
        // 신용카드: KG INICIS HTML5
        pgValue = 'html5_inicis';
        payMethodValue = 'card';
      } else if (paymentMethod === 'bank_transfer') {
        // 계좌이체: 금융결제원
        pgValue = 'kftc';
        payMethodValue = 'trans';
      } else if (paymentMethod === 'virtual_account') {
        // 가상계좌: NHN KCP
        pgValue = 'kcp';
        payMethodValue = 'vbank';
      }

      const paymentData = {
        pg: pgValue,
        pay_method: payMethodValue,
        merchant_uid: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: items.length === 1 
          ? items[0].product?.name || '상품'
          : `${items[0].product?.name || '상품'} 외 ${items.length - 1}건`,
        amount: totalAmount,
        buyer_name: recipientName.trim(),
        buyer_tel: recipientPhone.trim(),
        buyer_email: recipientEmail.trim() || undefined,
        buyer_addr: `${address1.trim()} ${address2.trim()}`.trim(),
        buyer_postcode: postalCode.trim(),
      };

    setIsProcessing(true);

    // 포트원 결제 요청
    window.IMP.request_pay(paymentData, (rsp) => {
      setIsProcessing(false);

      if (rsp.success) {
        // 결제 성공
        setPaymentStatus('completed');
        alert('결제가 완료되었습니다.');
        
        // 결제 완료 후 주문 생성
        handleCompleteOrder(rsp);
      } else {
        // 결제 실패
        setPaymentStatus('failed');
        let msg = '결제에 실패했습니다.';
        
        switch (rsp.error_code) {
          case 'IMP_INVALID':
            msg = '유효하지 않은 결제 정보입니다.';
            break;
          case 'IMP_FAIL':
            msg = '결제가 실패했습니다.';
            break;
          case 'IMP_CANCEL':
            msg = '결제가 취소되었습니다.';
            break;
          default:
            msg = rsp.error_msg || msg;
        }
        
        alert(msg);
      }
    });
  };

  const handleCompleteOrder = async (paymentResponse = null) => {
    // 결제 응답이 없고 결제 상태가 완료되지 않은 경우
    if (!paymentResponse && paymentStatus !== 'completed') {
      alert('결제를 먼저 완료해주세요.');
      return;
    }

    // 유효성 검사
    if (!recipientName.trim()) {
      alert('받는사람 이름을 입력해주세요.');
      return;
    }
    if (!recipientPhone.trim()) {
      alert('받는사람 휴대폰 번호를 입력해주세요.');
      return;
    }
    if (!postalCode.trim()) {
      alert('우편번호를 입력해주세요.');
      return;
    }
    if (!address1.trim()) {
      alert('주소를 입력해주세요.');
      return;
    }

    let orderData;

    try {
      setIsProcessing(true);

      const items = cart.items || [];
      const subtotal = cart.totalAmount || 0;
      const shippingFee = 3000;
      const totalAmount = subtotal + shippingFee;

      // 주문 데이터 구성
      orderData = {
        shipping: {
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          postalCode: postalCode.trim(),
          address1: address1.trim(),
          address2: address2.trim() || '',
          city: '',
          country: '대한민국',
          deliveryRequest: ''
        },
        payment: {
          method: paymentMethod,
          status: 'completed',
          amount: totalAmount,
          paidAt: paymentResponse?.paid_at ? new Date(paymentResponse.paid_at) : new Date(),
          transactionId: paymentResponse?.imp_uid || paymentResponse?.merchant_uid || null
        },
        orderNotes: emailAgreement ? '이메일 발송 동의' : ''
      };

      const res = await createOrder(orderData);
      
      if (res.success) {
        const createdOrder = res.data;
        const orderId = createdOrder?._id;

        alert('주문이 완료되었습니다.');
        // 주문 완료 후 주문 성공 페이지로 이동
        if (orderId) {
          navigate(`/orders/${orderId}/success`);
        } else {
          navigate('/orders');
        }
      }
    } catch (err) {
      console.error('주문 생성 오류:', err);
      if (orderData) {
        console.error('주문 데이터:', orderData);
      }
      const errorMessage = err.message || '주문 처리 중 오류가 발생했습니다.';
      alert(`주문 처리 중 오류가 발생했습니다.\n${errorMessage}\n\n서버 콘솔을 확인해주세요.`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="loading-state">장바구니를 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="error-state">{error}</div>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="loading-state">장바구니가 비어있습니다.</div>
        </div>
      </div>
    );
  }

  const items = cart.items || [];
  const subtotal = cart.totalAmount || 0;
  const shippingFee = 3000;
  const totalAmount = subtotal + shippingFee;

  return (
    <div className="checkout-page">
      <PostcodeLayer show={showPostcodeLayer} onClose={closePostcodeLayer} />
      <div className="checkout-container">
        <div className="checkout-header-top">
          <button className="btn-back-to-cart" onClick={() => navigate('/cart')}>
            ← 장바구니로 돌아가기
          </button>
          <h1 className="checkout-title">주문하기</h1>
        </div>

        <div className="checkout-content-wrapper">
          <div className="checkout-form-section">
            {/* 보내는사람 */}
            <div className="form-section">
              <h2 className="form-section-title">보내는사람</h2>
              <div className="form-group">
                <label>이름</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div className="form-group">
                <label>휴대폰 번호</label>
                <input
                  type="tel"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
              <div className="form-group">
                <label>주소</label>
                <input
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  placeholder="주소를 입력하세요"
                />
              </div>
            </div>

            {/* 받는사람 */}
            <div className="form-section">
              <h2 className="form-section-title">받는사람</h2>
              <div className="form-group">
                <div className="address-option-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="recipientAddressType"
                      value="new"
                      checked={!isSameAsSender}
                      onChange={(e) => setIsSameAsSender(false)}
                    />
                    <span>새로운주소 입력</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="recipientAddressType"
                      value="same"
                      checked={isSameAsSender}
                      onChange={(e) => setIsSameAsSender(true)}
                    />
                    <span>보내는사람과 동일</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>이름</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  required
                  disabled={isSameAsSender}
                />
              </div>
              <div className="form-group">
                <label>휴대폰 번호</label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  required
                  disabled={isSameAsSender}
                />
              </div>
              <div className="form-group">
                <label>이메일</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="example@email.com"
                  disabled={isSameAsSender}
                />
              </div>
              <div className="form-group">
                <label>우편번호</label>
                <div className="address-row">
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="우편번호"
                    required
                    readOnly
                    disabled={isSameAsSender}
                    className="postal-code"
                  />
                  <button
                    type="button"
                    onClick={openPostcodeLayer}
                    className="postcode-search-btn"
                    disabled={isSameAsSender}
                  >
                    우편번호 찾기
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>주소</label>
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="도로명 주소를 입력해주세요"
                  required
                  readOnly
                  disabled={isSameAsSender}
                />
              </div>
              <div className="form-group">
                <label>상세 주소</label>
                <input
                  type="text"
                  id="address2"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="상세 주소를 입력하세요"
                  disabled={isSameAsSender}
                />
              </div>
            </div>

            {/* 결제 방법 */}
            <div className="form-section">
              <h2 className="form-section-title">결제방법</h2>
              <div className="payment-methods">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>신용카드</span>
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>직불카드</span>
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="virtual_account"
                    checked={paymentMethod === 'virtual_account'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>계좌이체</span>
                </label>
              </div>
              <button
                className="btn-payment"
                onClick={handlePayment}
                disabled={isProcessing || paymentStatus === 'completed'}
              >
                {isProcessing ? '결제 처리 중...' : paymentStatus === 'completed' ? '결제 완료' : '주문하기'}
              </button>
            </div>

            {/* 이메일 발송 동의 */}
            <div className="form-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={emailAgreement}
                  onChange={(e) => setEmailAgreement(e.target.checked)}
                  disabled={!recipientEmail.trim()}
                />
                <span>발송정보 이메일로 발송하시는 것에 동의 하십니까?</span>
              </label>
            </div>
          </div>

          {/* 주문 요약 */}
          <div className="checkout-order-summary">
            <h2 className="order-summary-title">주문 요약</h2>
            <div className="summary-items">
              {items.map((item) => {
                const product = item.product;
                const priceAtPurchase = item.priceAtPurchase || item.price || 0;
                const itemTotal = priceAtPurchase * (item.quantity || 1);

                return (
                  <div key={item._id} className="summary-item">
                    <div className="summary-item-image">
                      {product?.image ? (
                        <img
                          src={product.image}
                          alt={product.name || '상품 이미지'}
                        />
                      ) : (
                        <div className="image-placeholder">☕</div>
                      )}
                    </div>
                    <div className="summary-item-info">
                      <div className="summary-item-name-row">
                        <span className="summary-item-name">
                          {product?.name || '상품 정보 없음'} × {item.quantity || 1}
                        </span>
                        <div className="summary-item-price-inline">
                          {(() => {
                            const hasDiscount = product?.discount && product.discount.enabled === 1 && product.discount.rate > 0;
                            const originalPrice = product?.price || 0;
                            const originalTotal = originalPrice * (item.quantity || 1);
                            
                            if (hasDiscount && originalPrice > priceAtPurchase) {
                              return (
                                <>
                                  <span className="original-price-inline">₩{originalTotal.toLocaleString()}</span>
                                  <span className="discounted-price-inline">₩{itemTotal.toLocaleString()}</span>
                                </>
                              );
                            }
                            return <span>₩{itemTotal.toLocaleString()}</span>;
                          })()}
                        </div>
                      </div>
                      {(() => {
                        const hasDiscount = product?.discount && product.discount.enabled === 1 && product.discount.rate > 0;
                        const originalPrice = product?.price || 0;
                        
                        if (hasDiscount && originalPrice > priceAtPurchase) {
                          return (
                            <div className="summary-item-discount-info">
                              <span className="discount-badge-inline">{product.discount.rate}% 할인</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="summary-details">
              <div className="summary-row">
                <span>소계</span>
                <span>₩{subtotal.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>배송료</span>
                  <span>₩{shippingFee.toLocaleString()}</span>
              </div>
              <div className="summary-row total-row">
                <span>총액</span>
                <span className="total-amount">₩{totalAmount.toLocaleString()}</span>
              </div>
            </div>
            <button
              className="btn-complete-order"
              onClick={() => handleCompleteOrder()}
              disabled={paymentStatus !== 'completed' || isProcessing}
              style={{ display: paymentStatus === 'completed' ? 'block' : 'none' }}
            >
              {isProcessing ? '처리 중...' : '주문 완료'}
            </button>
            <p className="order-agreement-text">
              주문 완료 시 개인정보처리방침 및 이용약관에 동의한 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;

