import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchProducts } from '../utils/productApi';
import './StockShortage.css';

function StockShortage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // location.state에서 재고 부족 상품 정보 가져오기
  const shortageItem = location.state?.shortageItem;
  const orderQuantity = location.state?.orderQuantity || 0;
  const currentStock = location.state?.currentStock || 0;

  useEffect(() => {
    if (!shortageItem) {
      // 재고 부족 정보가 없으면 장바구니로 리다이렉트
      navigate('/cart');
      return;
    }

    // 비슷한 카테고리 상품 추천 로드
    const loadRecommendedProducts = async () => {
      try {
        setLoading(true);
        const product = shortageItem.product;
        
        if (product && product.category) {
          // 같은 카테고리(원산지와 종류)의 다른 상품 가져오기
          const query = `?origin=${encodeURIComponent(product.category.origin)}&type=${encodeURIComponent(product.category.type)}&limit=4`;
          const response = await fetchProducts(query);
          
          if (response.data && response.data.length > 0) {
            // 현재 재고 부족 상품 제외
            const filtered = response.data.filter(p => p._id !== product._id);
            setRecommendedProducts(filtered.slice(0, 3)); // 최대 3개만 표시
          }
        }
      } catch (error) {
        console.error('추천 상품 로딩 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendedProducts();
  }, [shortageItem, navigate]);

  if (!shortageItem) {
    return null;
  }

  const product = shortageItem.product;

  return (
    <div className="stock-shortage-page">
      <div className="stock-shortage-container">
        <div className="shortage-header">
          <h1 className="shortage-title">재고 부족 안내</h1>
        </div>

        <div className="shortage-content">
          <div className="shortage-product-info">
            <div className="shortage-product-image">
              {product?.image ? (
                <img src={product.image} alt={product.name} />
              ) : (
                <div className="image-placeholder">☕</div>
              )}
            </div>
            <div className="shortage-product-details">
              <h2 className="shortage-product-name">{product?.name || '상품 정보 없음'}</h2>
              <p className="shortage-message">
                죄송합니다.<br />
                주문하신 상품의 재고가 부족합니다.<br />
                (주문하신 수량 {orderQuantity}개 / 현재 재고 {currentStock}개)
              </p>
            </div>
          </div>

          {recommendedProducts.length > 0 && (
            <div className="recommended-section">
              <h3 className="recommended-title">비슷한 카테고리의 다른 제품</h3>
              <div className="recommended-products-grid">
                {recommendedProducts.map((recProduct) => {
                  const discountedPrice = recProduct.discount?.enabled === 1 && recProduct.discount?.rate > 0
                    ? Math.round(recProduct.price * (1 - recProduct.discount.rate / 100))
                    : recProduct.price;

                  return (
                    <div
                      key={recProduct._id}
                      className="recommended-product-card"
                      onClick={() => navigate(`/products/${recProduct._id}`)}
                    >
                      <div className="recommended-product-image">
                        {recProduct.image ? (
                          <img src={recProduct.image} alt={recProduct.name} />
                        ) : (
                          <div className="image-placeholder">☕</div>
                        )}
                      </div>
                      <div className="recommended-product-info">
                        <h4 className="recommended-product-name">{recProduct.name}</h4>
                        {recProduct.category && (
                          <p className="recommended-product-category">
                            {recProduct.category.origin} / {recProduct.category.type}
                          </p>
                        )}
                        <div className="recommended-product-price">
                          {recProduct.discount?.enabled === 1 && recProduct.discount?.rate > 0 ? (
                            <>
                              <span className="original-price">₩{recProduct.price.toLocaleString()}</span>
                              <span className="discounted-price">₩{discountedPrice.toLocaleString()}</span>
                            </>
                          ) : (
                            <span>₩{recProduct.price.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="shortage-actions">
            <button
              className="btn-back-to-cart"
              onClick={() => navigate('/cart')}
            >
              장바구니로 이동
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockShortage;

