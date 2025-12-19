import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts, deleteProduct } from '../../utils/productApi';
import './AdminProductList.css';

function AdminProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!token || !user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const load = async (targetPage = 1) => {
      try {
        setLoading(true);
        const res = await fetchProducts(`?page=${targetPage}&limit=10`);
        setProducts(res.data || []);
        if (res.totalPages) {
          setTotalPages(res.totalPages);
        }
        setPage(res.page || targetPage);
      } catch (err) {
        setError(err.message || '상품 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    load(1);
  }, [navigate]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    const loadForPage = async () => {
      try {
        setLoading(true);
        const res = await fetchProducts(`?page=${newPage}&limit=10`);
        setProducts(res.data || []);
        setPage(res.page || newPage);
        if (res.totalPages) {
          setTotalPages(res.totalPages);
        }
      } catch (err) {
        setError(err.message || '상품 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    loadForPage();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`정말로 '${name}' 상품을 삭제하시겠습니까?`)) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      alert(err.message || '상품 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container">
        <div className="admin-page-inner">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-inner">
        <div className="product-list-header">
          <h1 className="admin-page-title">상품 관리</h1>
          <div className="product-list-header-actions">
            <button
              className="back-to-dashboard-btn"
              onClick={() => navigate('/admin')}
            >
              대시보드로 돌아가기
            </button>
            <button
              className="primary-btn"
              onClick={() => navigate('/admin/products/new')}
            >
              + 상품 추가
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="product-table-container">
          <table className="product-table">
            <thead>
              <tr>
                <th>이미지</th>
                <th>상품코드</th>
                <th>상품명</th>
                <th>카테고리</th>
                <th>사이즈</th>
                <th>이벤트/할인</th>
                <th>가격</th>
                <th>재고수량</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-message">
                    등록된 상품이 없습니다.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="product-thumb"
                        />
                      ) : (
                        <div className="product-thumb placeholder">No Image</div>
                      )}
                    </td>
                    <td>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>
                      {p.category?.origin} / {p.category?.type}
                    </td>
                    <td>{p.size || '-'}</td>
                    <td>
                      {(() => {
                        const hasDiscount = p.discount && p.discount.enabled === 1 && p.discount.rate > 0;
                        const hasEvent = p.event && p.event.enabled === 1;
                        if (hasDiscount && hasEvent) return '이벤트+할인';
                        if (hasEvent) return '이벤트';
                        if (hasDiscount) return '할인';
                        return '-';
                      })()}
                    </td>
                    <td>₩{p.price?.toLocaleString()}</td>
                    <td>{p.stock}</td>
                    <td>
                      <button
                        className="link-btn"
                        onClick={() => navigate(`/admin/products/${p._id}/edit`)}
                      >
                        수정
                      </button>
                      <button
                        className="link-btn delete"
                        onClick={() => handleDelete(p._id, p.name)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
              <button
                key={pNum}
                className={`page-btn ${pNum === page ? 'active' : ''}`}
                onClick={() => handlePageChange(pNum)}
              >
                {pNum}
              </button>
            ))}
            <button
              className="page-btn"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProductList;

