import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Cart.css';
import { getCart, updateCartItem, removeFromCart, clearCart } from '../utils/cartApi';

function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantityChanges, setQuantityChanges] = useState({});
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getCart();
        const cartData = res.data || { items: [], totalAmount: 0 };
        setCart(cartData);
        
        // quantityChanges 초기화
        const initialChanges = {};
        if (cartData.items && cartData.items.length > 0) {
          cartData.items.forEach(item => {
            initialChanges[item._id] = item.quantity;
          });
        }
        setQuantityChanges(initialChanges);
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

  // 리다이렉트 중일 때는 로딩 화면 표시
  if (isRedirecting) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="loading-state">로그인 페이지로 이동 중...</div>
        </div>
      </div>
    );
  }

  const handleQuantityInputChange = (itemId, delta) => {
    const item = cart?.items?.find(item => item._id === itemId);
    const product = item?.product;
    const currentQuantity = quantityChanges[itemId] !== undefined 
      ? quantityChanges[itemId] 
      : item?.quantity || 1;
    
    const newQuantity = currentQuantity + delta;
    if (newQuantity < 1) return;
    if (newQuantity > 99) {
      alert('최대 99개까지 구매 가능합니다.');
      return;
    }
    
    // 재고 확인
    if (product?.stock !== undefined && newQuantity > product.stock) {
      alert(`재고가 부족합니다. (현재 재고: ${product.stock}개)`);
      return;
    }
    
    setQuantityChanges(prev => ({
      ...prev,
      [itemId]: newQuantity
    }));
  };

  const handleQuantityUpdate = async (itemId) => {
    const newQuantity = quantityChanges[itemId];
    if (!newQuantity || newQuantity < 1) return;
    
    const item = cart?.items?.find(item => item._id === itemId);
    const product = item?.product;
    
    // 재고 확인
    if (product?.stock !== undefined && newQuantity > product.stock) {
      alert(`재고가 부족합니다. (현재 재고: ${product.stock}개)`);
      setQuantityChanges(prev => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
      return;
    }
    
    try {
      const res = await updateCartItem(itemId, newQuantity);
      const updatedCart = res.data || { items: [], totalAmount: 0 };
      setCart(updatedCart);
      
      // quantityChanges 업데이트
      const updatedChanges = {};
      if (updatedCart.items) {
        updatedCart.items.forEach(item => {
          updatedChanges[item._id] = item.quantity;
        });
      }
      setQuantityChanges(updatedChanges);
      
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      alert(err.message || '수량 변경 중 오류가 발생했습니다.');
    }
  };

  const handleRemove = async (itemId) => {
    if (!window.confirm('이 상품을 장바구니에서 제거하시겠습니까?')) return;
    try {
      const res = await removeFromCart(itemId);
      const updatedCart = res.data || { items: [], totalAmount: 0 };
      setCart(updatedCart);
      
      // quantityChanges 업데이트
      const updatedChanges = {};
      if (updatedCart.items) {
        updatedCart.items.forEach(item => {
          updatedChanges[item._id] = item.quantity;
        });
      }
      setQuantityChanges(updatedChanges);
      
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      alert(err.message || '상품 제거 중 오류가 발생했습니다.');
    }
  };

  const handleClear = async () => {
    if (!window.confirm('장바구니를 모두 비우시겠습니까?')) return;
    try {
      await clearCart();
      setCart({ items: [], totalAmount: 0 });
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      alert(err.message || '장바구니 비우기 중 오류가 발생했습니다.');
    }
  };

  const handleCheckout = () => {
    // 재고 확인
    const items = cart.items || [];
    const shortageItems = [];

    items.forEach(item => {
      const product = item.product;
      const orderQuantity = item.quantity || 1;
      const currentStock = product?.stock ?? 0;

      if (currentStock < orderQuantity) {
        shortageItems.push({
          item,
          orderQuantity,
          currentStock
        });
      }
    });

    // 재고 부족 상품이 있는 경우
    if (shortageItems.length > 0) {
      // 첫 번째 재고 부족 상품으로 재고 부족 페이지로 이동
      const firstShortage = shortageItems[0];
      navigate('/stock-shortage', {
        state: {
          shortageItem: firstShortage.item,
          orderQuantity: firstShortage.orderQuantity,
          currentStock: firstShortage.currentStock
        }
      });
      return;
    }

    // 재고가 모두 충분한 경우 주문 페이지로 이동
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="loading-state">장바구니를 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="error-state">{error}</div>
        </div>
      </div>
    );
  }

  // cart가 null이거나 로딩 중일 때 처리
  if (!cart) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="loading-state">장바구니를 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  const items = cart.items || [];
  const subtotal = cart.totalAmount || 0;
  const shippingFee = 3000; // 배송료 고정
  const totalAmount = subtotal + shippingFee;

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header-top">
          <button className="btn-continue-shopping" onClick={() => navigate('/products')}>
            ← 계속 쇼핑하기
          </button>
          <h1 className="cart-title">장바구니</h1>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <p className="cart-empty-title">장바구니가 비어있습니다</p>
            <p className="cart-empty-subtitle">마음에 드는 상품을 장바구니에 담아보세요!</p>
            <button className="btn-primary" onClick={() => navigate('/products')}>
              쇼핑 계속하기
            </button>
          </div>
        ) : (
          <>
            <div className="cart-header">
              <button className="btn-clear" onClick={handleClear}>
                전체 삭제
              </button>
            </div>
            <div className="cart-content-wrapper">
              <div className="cart-items-section">
                <div className="cart-items">
                {items.map((item) => {
                  const product = item.product;
                  const currentQuantity = quantityChanges[item._id] !== undefined 
                    ? quantityChanges[item._id] 
                    : (item.quantity || 1);
                  const priceAtPurchase = item.priceAtPurchase || item.price || 0;
                  const itemTotal = priceAtPurchase * currentQuantity;

                  return (
                    <div key={item._id} className="cart-item">
                      <div className="cart-item-image">
                        {product?.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            onClick={() => navigate(`/products/${product._id}`)}
                          />
                        ) : (
                          <div className="image-placeholder">☕</div>
                        )}
                      </div>

                      <div className="cart-item-info">
                        <h3
                          className="cart-item-name"
                          onClick={() => navigate(`/products/${product?._id}`)}
                        >
                          {product?.name || '상품 정보 없음'}
                        </h3>
                        <div className="cart-item-meta">
                          {product?.category && (
                            <span className="cart-item-category">
                              {product.category.origin} / {product.category.type}
                            </span>
                          )}
                          {product?.size && (
                            <span className="cart-item-size">{product.size}</span>
                          )}
                        </div>
                        <div className="cart-item-unit-price">
                          {(() => {
                            const hasDiscount = product?.discount && product.discount.enabled === 1 && product.discount.rate > 0;
                            const originalPrice = product?.price || 0;
                            
                            if (hasDiscount && originalPrice > priceAtPurchase) {
                              return (
                                <div className="price-with-discount">
                                  <span className="original-price">₩{originalPrice.toLocaleString()}</span>
                                  <span className="discounted-price">₩{priceAtPurchase.toLocaleString()}</span>
                                  <span className="discount-badge">{product.discount.rate}% 할인</span>
                                </div>
                              );
                            }
                            return <span>₩{priceAtPurchase.toLocaleString()} / 개</span>;
                          })()}
                        </div>
                      </div>

                      <div className="cart-item-quantity-section">
                        <div className="quantity-row">
                          <div className="cart-item-quantity">
                            <button
                              type="button"
                              onClick={() => handleQuantityInputChange(item._id, -1)}
                            >
                              -
                            </button>
                            <span>{currentQuantity}</span>
                            <button
                              type="button"
                              onClick={() => handleQuantityInputChange(item._id, 1)}
                            >
                              +
                            </button>
                          </div>
                          <button
                            className="btn-remove-item"
                            onClick={() => handleRemove(item._id)}
                          >
                            삭제
                          </button>
                        </div>
                        {product?.stock !== undefined && (
                          <div className="cart-stock-info">
                            {product.stock < 10 ? (
                              <span className="stock-warning">※재고 {product.stock}개 남았습니다.</span>
                            ) : (
                              <span className="stock-available">※재고 있음</span>
                            )}
                          </div>
                        )}
                        {quantityChanges[item._id] !== undefined && 
                         quantityChanges[item._id] !== item.quantity && (
                          <button
                            className="btn-update-quantity"
                            onClick={() => handleQuantityUpdate(item._id)}
                          >
                            수량 변경
                          </button>
                        )}
                      </div>

                      <div className="cart-item-price">
                        {(() => {
                          const hasDiscount = product?.discount && product.discount.enabled === 1 && product.discount.rate > 0;
                          const originalPrice = product?.price || 0;
                          const originalTotal = originalPrice * currentQuantity;
                          
                          if (hasDiscount && originalPrice > priceAtPurchase) {
                            return (
                              <div className="item-total-with-discount">
                                <div className="original-total">₩{originalTotal.toLocaleString()}</div>
                                <div className="discounted-total">₩{(itemTotal || 0).toLocaleString()}</div>
                              </div>
                            );
                          }
                          return <div className="item-total">₩{(itemTotal || 0).toLocaleString()}</div>;
                        })()}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>

              <div className="cart-order-summary">
              <h2 className="order-summary-title">주문 요약</h2>
              <div className="summary-details">
                <div className="summary-row">
                  <span>소계</span>
                  <span>₩{(subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span>배송료</span>
                  <span>₩{(shippingFee || 0).toLocaleString()}</span>
                </div>
                <div className="summary-row total-row">
                  <span>총액</span>
                  <span className="total-amount">₩{(totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>
              <button className="btn-checkout" onClick={handleCheckout}>
                주문하기
              </button>
              <p className="checkout-note">주문 진행 시 배송 정보를 입력해주세요</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Cart;

