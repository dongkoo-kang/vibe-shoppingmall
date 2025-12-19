import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { fetchProducts } from '../utils/productApi';

function Home() {
  const slideImages = [
    '/Main_slide_1.jpg',
    '/Main_slide_2.jpg',
    '/Main_slide_3.jpg',
    '/Main_slide_4.jpg'
  ];

  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      // 랜덤하게 다음 이미지 선택 (현재 이미지와 다른 이미지)
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * slideImages.length);
      } while (nextIndex === currentImageIndex && slideImages.length > 1);
      
      setCurrentImageIndex(nextIndex);
    }, 3000); // 3초마다 변경

    return () => clearInterval(interval);
  }, [currentImageIndex, slideImages.length]);

  // 상품 데이터 로딩
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetchProducts('?limit=20');
        const all = res.data || [];

        const isPromo = (p) =>
          (p.discount && p.discount.enabled === 1 && p.discount.rate > 0) ||
          (p.event && p.event.enabled === 1);

        const getEventEndTime = (p) => {
          if (p.event && p.event.enabled === 1 && p.event.endDate) {
            return new Date(p.event.endDate).getTime();
          }
          // 이벤트가 없거나 종료일이 없으면 아주 큰 값으로 취급 (뒤로 밀기)
          return Number.MAX_SAFE_INTEGER;
        };

        const promoProducts = all
          .filter(isPromo)
          .sort((a, b) => getEventEndTime(a) - getEventEndTime(b));

        const normalProducts = all.filter((p) => !isPromo(p));

        setProducts([...promoProducts, ...normalProducts]);
      } catch (error) {
        setProductsError(error.message || '상품 정보를 불러오는 중 오류가 발생했습니다.');
      }
    };

    loadProducts();
  }, []);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        {/* 배경 이미지 슬라이드 */}
        <div className="hero-background">
          {slideImages.map((image, index) => (
            <div
              key={index}
              className={`hero-bg-image ${index === currentImageIndex ? 'active' : ''}`}
              style={{ backgroundImage: `url(${image})` }}
            />
          ))}
        </div>
        
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">프리미엄 커피의 경험</h1>
            <p className="hero-description">
              세계 최고의 커피 산지에서 엄선한 신선한 커피 원두.<br />
              매일 신선하게 볶아 전국으로 배송합니다.
            </p>
            <button className="hero-cta-btn">
              지금 구매하기 →
            </button>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="feature-section">
        <div className="feature-card">
          <div className="feature-icon">☕</div>
          <h3 className="feature-title">최고 품질의 원두</h3>
          <p className="feature-description">
            정직한 거래 농지에서 오직 최고 등급 원두만 엄선합니다.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🚚</div>
          <h3 className="feature-title">빠른 배송</h3>
          <p className="feature-description">
            전국 어디든 신선함을 지켜 빠르게 배송해드립니다.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🌱</div>
          <h3 className="feature-title">환경 친화적</h3>
          <p className="feature-description">
            지속 가능한 커피 재배와 친환경 패키징을 실천합니다.
          </p>
        </div>
      </section>

      {/* Recommended Products Section */}
      <section className="products-section">
        <h2 className="section-title">추천 상품</h2>
        <p className="section-subtitle">
          커피 애호가들이 사랑하는 프리미엄 원두들을 만나보세요.
        </p>

        {productsError && (
          <div className="products-error">
            {productsError}
          </div>
        )}

        <div className="products-grid">
          {(products && products.length > 0 ? products.slice(0, 4) : []).map((product) => {
            const hasDiscount =
              product.discount && product.discount.enabled === 1 && product.discount.rate > 0;
            const hasEvent = product.event && product.event.enabled === 1;
            const showPromoStyle = hasDiscount || hasEvent;

            const originalPrice = product.price || 0;
            const discountRate = hasDiscount ? product.discount.rate : 0;
            const discounted =
              hasDiscount && product.discountedPrice
                ? product.discountedPrice
                : hasDiscount
                ? Math.round(originalPrice * (1 - discountRate / 100))
                : originalPrice;

            const handleClick = () => {
              if (product._id) {
                navigate(`/products/${product._id}`);
              }
            };

            return (
              <div
                className="product-card"
                key={product._id}
                onClick={handleClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClick();
                }}
              >
                <div className="product-image">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="product-image-thumb"
                    />
                  ) : (
                    <div className="product-image-placeholder">☕</div>
                  )}
                </div>

                <div className="product-info">
                  <div className="product-category">
                    {product.category?.origin} / {product.category?.type}
                  </div>
                  <h3 className="product-name">{product.name}</h3>

                  <div
                    className={`product-price-block ${
                      showPromoStyle ? 'promo' : 'normal'
                    }`}
                  >
                    {showPromoStyle ? (
                      <>
                        <div className="price-line-top">
                          {hasDiscount && (
                            <span className="discount-percent">
                              {product.discount.rate}%
                            </span>
                          )}
                          {hasEvent && (
                            <span className="event-badge">EVENT</span>
                          )}
                          {hasDiscount && (
                            <span className="original-price">
                              ₩{originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="price-line-main">
                          ₩{discounted.toLocaleString()}
                        </div>
                      </>
                    ) : (
                      <div className="price-line-main">
                        ₩{originalPrice.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* API 결과가 없을 때 기본 예시 4개 표시 */}
          {(!products || products.length === 0) && (
            <>
              <div className="product-card">
                <div className="product-image">
                  <div className="product-image-placeholder">☕</div>
                </div>
                <div className="product-category">싱글오리진</div>
                <h3 className="product-name">에티오피아 예가체프</h3>
                <div className="product-price">₩18,000</div>
              </div>
              <div className="product-card">
                <div className="product-image">
                  <div className="product-image-placeholder">☕</div>
                </div>
                <div className="product-category">프리미엄</div>
                <h3 className="product-name">콜롬비아 게이샤</h3>
                <div className="product-price">₩25,000</div>
              </div>
              <div className="product-card">
                <div className="product-image">
                  <div className="product-image-placeholder">☕</div>
                </div>
                <div className="product-category">싱글오리진</div>
                <h3 className="product-name">케냐 AA</h3>
                <div className="product-price">₩16,000</div>
              </div>
              <div className="product-card">
                <div className="product-image">
                  <div className="product-image-placeholder">☕</div>
                </div>
                <div className="product-category">블렌드</div>
                <h3 className="product-name">하우스 블렌드</h3>
                <div className="product-price">₩12,000</div>
              </div>
            </>
          )}
        </div>

        <button
          className="view-all-btn"
          type="button"
          onClick={() => navigate('/products')}
        >
          전체상품 보기 →
        </button>
      </section>

      {/* Footer Section */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="#" className="footer-link">[이용약관]</a>
            <a href="#" className="footer-link">[개인정보처리방침]</a>
            <a href="#" className="footer-link">[이메일 무단수집거부]</a>
            <a href="#" className="footer-link">[법적고지]</a>
          </div>
          
          <div className="footer-info">
            <p className="footer-info-line">
              대표이사 : 강동구 &nbsp;&nbsp; 개인정보보호책임자 : 강동구 &nbsp;&nbsp; 사업자등록번호 : xxx-xx-xxxxx
            </p>
            <p className="footer-info-line">
              통신판매업종신고증 : 제 9999-서울XX-9999호 &nbsp;&nbsp; 대표이메일 : admin@gmail.com
            </p>
          </div>
          
          <div className="footer-copyright">
            <p>Copyright ⓒ 2025 Coffee&Co Co., LTD. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;

