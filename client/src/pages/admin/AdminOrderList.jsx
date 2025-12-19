import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminOrderList.css';
import { getOrders } from '../../utils/orderApi';

function AdminOrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]); // 전체 주문 목록 (검색용)
  const [filteredOrders, setFilteredOrders] = useState([]); // 필터링된 주문 목록
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const itemsPerPage = 10;

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return '결제완료';
      case 'processing':
        return '상품 준비중';
      case 'shipped':
        return '배송중';
      case 'delivered':
        return '배송완료';
      case 'cancelled':
        return '주문취소';
      case 'refunded':
        return '환불완료';
      default:
        return status || '처리 중';
    }
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return 'status-paid';
      case 'processing':
        return 'status-preparing';
      case 'shipped':
        return 'status-shipping';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      case 'refunded':
        return 'status-refunded';
      default:
        return '';
    }
  };

  // 날짜 파싱 유틸 (ISO 문자열, 숫자 타임스탬프 모두 안전하게 처리)
  const parseOrderDate = (value) => {
    if (!value) return null;

    // Date 객체 그대로 들어오는 경우
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    // 숫자(타임스탬프) 처리
    if (typeof value === 'number') {
      const ms = value < 1e12 ? value * 1000 : value; // 초 단위면 ms로 변환
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    // 문자열 처리
    if (typeof value === 'string') {
      const trimmed = value.trim();

      // 순수 숫자 문자열인 경우 (예: "1734410736" 또는 "1734410736000")
      if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        if (!Number.isNaN(num)) {
          const ms = trimmed.length <= 10 ? num * 1000 : num;
          const d = new Date(ms);
          return Number.isNaN(d.getTime()) ? null : d;
        }
      }

      const d = new Date(trimmed);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    return null;
  };

  // 관리자 권한 확인 및 주문 목록 조회
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!token || !user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchOrders();
  }, [navigate, statusFilter]);

  // 검색 및 필터링 적용
  useEffect(() => {
    let filtered = [...allOrders];

    // 상태 필터 적용
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        // 결제완료는 pending과 confirmed 모두 포함
        filtered = filtered.filter(order => 
          order.status === 'pending' || order.status === 'confirmed'
        );
      } else {
        filtered = filtered.filter(order => order.status === statusFilter);
      }
    }

    // 검색어 필터 적용
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(order => {
        // 주문번호 검색
        const orderNumber = (order.orderNumber || '').toLowerCase();
        // 고객명 검색
        const customerName = (order.shipping?.recipientName || '').toLowerCase();
        // 연락처 검색
        const phone = (order.shipping?.recipientPhone || '').toLowerCase();
        
        return orderNumber.includes(query) || 
               customerName.includes(query) || 
               phone.includes(query);
      });
    }

    // 결제 시간별로 정렬
    filtered.sort((a, b) => {
      const dateA =
        parseOrderDate(a.payment?.paidAt) ||
        parseOrderDate(a.createdAt) ||
        new Date(0);
      const dateB =
        parseOrderDate(b.payment?.paidAt) ||
        parseOrderDate(b.createdAt) ||
        new Date(0);
      return dateB - dateA; // 최신순
    });

    setFilteredOrders(filtered);
    setTotalOrders(filtered.length);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1); // 검색/필터 변경 시 첫 페이지로
  }, [allOrders, statusFilter, searchQuery, itemsPerPage]);

  // 페이지네이션 적용
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    setOrders(paginatedOrders);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');

      // 전체 주문 목록 조회 (검색을 위해 모든 데이터 필요)
      const params = {
        sort: '-createdAt',
        limit: 1000 // 충분히 큰 값으로 설정하여 모든 주문 가져오기
      };

      const res = await getOrders(params);
      const ordersData = res.data || [];
      
      setAllOrders(ordersData);
    } catch (err) {
      console.error('주문 목록 조회 오류:', err);
      setError(err.message || '주문 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderDetail = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
  };

  const handleBackToDashboard = () => {
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="admin-order-list-page">
        <div className="admin-order-list-container">
          <div className="loading-message">주문 목록을 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-order-list-page">
      <div className="admin-order-list-container">
        <div className="admin-order-list-header">
          <h1 className="admin-order-list-title">주문 관리</h1>
          <button className="back-to-dashboard-btn" onClick={handleBackToDashboard}>
            대시보드로 돌아가기
          </button>
        </div>

        {/* 검색 바 */}
        <div className="admin-order-search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="주문번호 또는 고객명으로 검색..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* 상태 필터 버튼 */}
        <div className="admin-order-filters">
          <button
            className={`admin-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            전체
          </button>
          <button
            className={`admin-filter-btn status-paid ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => handleFilterChange('pending')}
          >
            대기
          </button>
          <button
            className={`admin-filter-btn status-preparing ${statusFilter === 'processing' ? 'active' : ''}`}
            onClick={() => handleFilterChange('processing')}
          >
            준비
          </button>
          <button
            className={`admin-filter-btn status-shipping ${statusFilter === 'shipped' ? 'active' : ''}`}
            onClick={() => handleFilterChange('shipped')}
          >
            배송
          </button>
          <button
            className={`admin-filter-btn status-delivered ${statusFilter === 'delivered' ? 'active' : ''}`}
            onClick={() => handleFilterChange('delivered')}
          >
            완료
          </button>
          <button
            className={`admin-filter-btn status-cancelled ${statusFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => handleFilterChange('cancelled')}
          >
            취소
          </button>
        </div>

        {/* 주문 목록 테이블 */}
        {error ? (
          <div className="error-message">{error}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-message">
            <p>
              {searchQuery.trim() 
                ? '검색 결과가 없습니다.' 
                : '주문이 없습니다.'}
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-message">
            <p>표시할 주문이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="admin-orders-table-container">
              <table className="admin-orders-table">
                <thead>
                  <tr>
                    <th>주문번호</th>
                    <th>주문일시</th>
                    <th>고객명</th>
                    <th>금액</th>
                    <th>상품 수</th>
                    <th>상태</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    // 주문일시는 createdAt을 우선 사용 (주문 생성 시점)
                    const orderDate = parseOrderDate(order.createdAt);
                    
                    return (
                      <tr key={order._id}>
                        <td className="order-number">{order.orderNumber || '-'}</td>
                        <td className="order-date">
                          {orderDate
                            ? orderDate.toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="customer-name">
                          {order.shipping?.recipientName || '-'}
                        </td>
                        <td className="order-amount">
                          ₩{(order.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="product-count">
                          {order.items?.length || 0}개
                        </td>
                        <td>
                          <span className={`order-status ${getStatusColorClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="view-order-btn"
                            onClick={() => handleOrderDetail(order._id)}
                          >
                            조회
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminOrderList;

