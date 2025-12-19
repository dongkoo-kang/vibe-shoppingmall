import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProductDetail.css';
import { fetchProductById } from '../utils/productApi';
import { addToCart } from '../utils/cartApi';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const res = await fetchProductById(id);
        setProduct(res.data);
      } catch (err) {
        setError(err.message || '상품 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  const handleBack = () => {
    navigate('/products');
  };

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > 99) return 99;
      // 재고 확인
      if (product?.stock !== undefined && next > product.stock) {
        alert(`재고가 부족합니다. (현재 재고: ${product.stock}개)`);
        return product.stock;
      }
      return next;
    });
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (window.confirm('로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
        navigate('/login');
      }
      return;
    }

    try {
      await addToCart(product._id, quantity);
      alert('장바구니에 상품이 추가되었습니다.');
      // 헤더의 장바구니 개수 업데이트를 위해 페이지 새로고침 대신 이벤트 발생
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      if (err.message.includes('인증')) {
        if (window.confirm('로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
          navigate('/login');
        }
      } else {
        alert(err.message || '장바구니에 상품을 추가하는 중 오류가 발생했습니다.');
      }
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-inner loading-state">상품 정보를 불러오는 중입니다...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-inner error-state">
          <p>{error}</p>
          <button className="btn-outline" onClick={handleBack}>
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-inner error-state">
          <p>상품 정보를 찾을 수 없습니다.</p>
          <button className="btn-outline" onClick={handleBack}>
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const hasDiscount =
    product.discount && product.discount.enabled === 1 && product.discount.rate > 0;
  const originalPrice = product.price || 0;
  const discounted = hasDiscount
    ? product.discountedPrice ||
      Math.round(originalPrice * (1 - (product.discount.rate || 0) / 100))
    : originalPrice;

  const tasteTags = ['플로럴', '베리', '시트러스', '초콜릿', '견과류'];

  return (
    <div className="product-detail-page">
      <button className="back-to-list" onClick={handleBack}>
        ← 상품 목록으로 돌아가기
      </button>

      <div className="product-detail-inner">
        <div className="detail-left">
          <div className="detail-image-wrapper">
            {product.image ? (
              <img src={product.image} alt={product.name} className="detail-image" />
            ) : (
              <div className="detail-image-placeholder">☕</div>
            )}
          </div>
        </div>

        <div className="detail-right">
          <div className="detail-category">
            {product.category?.origin} / {product.category?.type}
          </div>
          <h1 className="detail-title">{product.name}</h1>

          <div className="detail-rating-row">
            <div className="stars">
              ★★★★☆
            </div>
            <span className="rating-score">4.8</span>
          </div>

          <div className="detail-price-block">
            {hasDiscount && (
              <div className="detail-price-top">
                <span className="detail-discount-rate">{product.discount.rate}%</span>
                <span className="detail-original-price">
                  ₩{originalPrice.toLocaleString()}
                </span>
              </div>
            )}
            <div className="detail-main-price">
              ₩{discounted.toLocaleString()}
              <span className="detail-size">{product.size}</span>
            </div>
          </div>

          <div className="detail-section">
            <h2 className="detail-section-title">상품 설명</h2>
            <p className="detail-description">
              {product.description ||
                '풍부한 향과 깊은 바디감이 특징인 프리미엄 커피입니다. 다양한 추출 방식에 잘 어울리며, 데일리 커피로 즐기기에도 좋습니다.'}
            </p>
          </div>

          <div className="detail-meta">
            <div className="meta-row">
              <span className="meta-label">원산지</span>
              <span className="meta-value">{product.category?.origin}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">로스트 레벨</span>
              <span className="meta-value">라이트 로스트</span>
            </div>
          </div>

          <div className="detail-taste-notes">
            <span className="meta-label">맛 노트</span>
            <div className="taste-tags">
              {tasteTags.map((tag) => (
                <button key={tag} type="button" className="taste-tag">
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="detail-purchase-section">
            <div className="purchase-product-info">
              <div className="purchase-product-name">{product.name}</div>
              <div className="purchase-product-size">{product.size}</div>
            </div>

            <div className="purchase-quantity-row">
              <div className="quantity-section">
                <div className="quantity-selector">
                  <button type="button" onClick={() => handleQuantityChange(-1)}>
                    -
                  </button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => handleQuantityChange(1)}>
                    +
                  </button>
                </div>
                <div className="stock-info">
                  {product.stock !== undefined && (
                    product.stock < 10 ? (
                      <span className="stock-warning">※재고 {product.stock}개 남았습니다.</span>
                    ) : (
                      <span className="stock-available">※재고 있음</span>
                    )
                  )}
                </div>
              </div>
              <div className="unit-price">
                ₩{discounted.toLocaleString()}
              </div>
            </div>

            <div className="purchase-total-row">
              <span className="total-label">총 상품 금액</span>
              <span className="total-amount">
                총 수량 {quantity}개 | ₩{(discounted * quantity).toLocaleString()}
              </span>
            </div>

            {product.stock !== undefined && product.stock <= 0 ? (
              <button className="add-to-cart-btn disabled" type="button" disabled>
                재입고 예정
              </button>
            ) : (
              <button className="add-to-cart-btn" type="button" onClick={handleAddToCart}>
                장바구니에 추가
              </button>
            )}
          </div>

          <div className="detail-info-box">
            <div className="info-row">
              <span className="info-label">배송 정보</span>
              <span className="info-text">
                결제 후 1~2 영업일 내 발송되며, 모든 상품은 신선하게 로스팅되어 발송됩니다.
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">환불 정책</span>
              <span className="info-text">
                미개봉 상품에 한해 배송 완료 후 7일 이내 교환 및 환불이 가능합니다.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;


