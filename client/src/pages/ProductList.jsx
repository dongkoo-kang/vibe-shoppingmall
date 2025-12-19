import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ProductList.css';
import { fetchProducts } from '../utils/productApi';

function ProductList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrigin, setSelectedOrigin] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPromo, setSelectedPromo] = useState('all');
  const [originFilters, setOriginFilters] = useState([{ id: 'all', label: '전체' }]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // URL에서 검색 쿼리 읽기
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [location.search]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchProducts('?limit=1000');
        const list = res.data || [];
        setProducts(list);

        // 상품 데이터에 존재하는 원산지(origin) 기준으로 필터 생성
        const origins = Array.from(
          new Set(
            list
              .map((p) => p.category && p.category.origin)
              .filter((v) => typeof v === 'string' && v.trim().length > 0)
          )
        );
        const originDefs = origins.map((o) => ({ id: o, label: o }));
        setOriginFilters([{ id: 'all', label: '전체' }, ...originDefs]);
      } catch (err) {
        setError(err.message || '상품 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = products.filter((p) => {
    // 검색어 필터링
    const searchOk = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.origin.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 원산지 필터링
    const originOk =
      selectedOrigin === 'all' ||
      (p.category && p.category.origin === selectedOrigin);
    
    // 분류 필터링
    const typeOk =
      selectedType === 'all' ||
      (p.category && p.category.type === selectedType);
    
    // 할인/이벤트 필터링
    const hasDiscount = p.discount && p.discount.enabled === 1 && p.discount.rate > 0;
    const hasEvent = p.event && p.event.enabled === 1;
    const promoOk =
      selectedPromo === 'all' ||
      (selectedPromo === 'discount' && hasDiscount) ||
      (selectedPromo === 'event' && hasEvent);
    
    return searchOk && originOk && typeOk && promoOk;
  });

  const handleCardClick = (id) => {
    navigate(`/products/${id}`);
  };

  return (
    <div className="product-list-page">
      <div className="product-list-header">
        <h1 className="list-title">우리의 커피</h1>
        <p className="list-subtitle">세계 각지의 프리미엄 커피 원두를 만나보세요</p>
      </div>

      <div className="product-list-layout">
        <aside className="product-filter">
          <div className="filter-section">
            <h3 className="filter-subtitle">할인/이벤트</h3>
            <ul className="filter-list">
              {[
                { id: 'all', label: '전체' },
                { id: 'discount', label: '할인' },
                { id: 'event', label: '이벤트' },
              ].map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={`filter-btn ${selectedPromo === f.id ? 'active' : ''}`}
                    onClick={() => setSelectedPromo(f.id)}
                  >
                    {f.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="filter-section">
            <h3 className="filter-subtitle">원산지</h3>
            <ul className="filter-list">
              {originFilters.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={`filter-btn ${selectedOrigin === f.id ? 'active' : ''}`}
                    onClick={() => setSelectedOrigin(f.id)}
                  >
                    {f.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="filter-section">
            <h3 className="filter-subtitle">분류</h3>
            <ul className="filter-list">
              {[
                { id: 'all', label: '전체' },
                { id: '원두', label: '원두' },
                { id: '분쇄원두', label: '분쇄원두' },
                { id: '드립', label: '드립' },
              ].map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={`filter-btn ${selectedType === f.id ? 'active' : ''}`}
                    onClick={() => setSelectedType(f.id)}
                  >
                    {f.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="product-list-main">
          {loading && <div className="list-state">상품을 불러오는 중입니다...</div>}
          {error && <div className="list-state error">{error}</div>}

          {!loading && !error && (
            <div className="product-list-grid">
              {filtered.map((product) => (
                <div
                  key={product._id}
                  className="list-card"
                  onClick={() => handleCardClick(product._id)}
                >
                  <div className="list-card-image">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <div className="list-card-image-placeholder">☕</div>
                    )}
                  </div>
                  <div className="list-card-body">
                    <div className="list-category">
                      {product.category?.origin} / {product.category?.type}
                    </div>
                    <h3 className="list-name">{product.name}</h3>
                    <p className="list-desc">{product.description}</p>
                    <div className="list-bottom">
                      <div className="list-price-section">
                        {(() => {
                          const hasDiscount =
                            product.discount && product.discount.enabled === 1 && product.discount.rate > 0;
                          const hasEvent = product.event && product.event.enabled === 1;
                          const originalPrice = product.price || 0;
                          const discounted = hasDiscount
                            ? Math.round(originalPrice * (1 - (product.discount.rate || 0) / 100))
                            : originalPrice;

                          return (
                            <>
                              {hasDiscount && (
                                <div className="list-price-top">
                                  <span className="list-discount-badge">{product.discount.rate}%</span>
                                  {hasEvent && <span className="list-event-badge">EVENT</span>}
                                  <span className="list-original-price">
                                    ₩{originalPrice.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {!hasDiscount && hasEvent && (
                                <div className="list-price-top">
                                  <span className="list-event-badge">EVENT</span>
                                </div>
                              )}
                              <div className="list-price-row">
                                <span className={`list-price ${hasDiscount || hasEvent ? 'promo' : ''}`}>
                                  ₩{discounted.toLocaleString()}
                                </span>
                                {product.stock !== undefined && product.stock < 5 && (
                                  <span className="list-stock-warning">
                                    ※재고 {product.stock}개
                                  </span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <span className="list-rating">★ 4.8</span>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && !error && filtered.length === 0 && (
                <div className="list-state">조건에 맞는 상품이 없습니다.</div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ProductList;


