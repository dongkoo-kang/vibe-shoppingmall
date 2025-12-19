import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderList.css';
import { getOrders } from '../utils/orderApi';

function OrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'

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

  const canTrackDelivery = (status) => {
    return status === 'processing' || status === 'shipped' || status === 'delivered';
  };

  const handleTrackDelivery = (e, orderId) => {
    e.stopPropagation(); // 주문 상세 페이지로 이동하는 것을 방지
    alert('배송 추적 기능은 현재 구현 중입니다.');
  };

  // 각 상태별 주문 개수 계산
  const getStatusCount = (status) => {
    if (status === 'all') {
      return orders.length;
    } else if (status === 'pending' || status === 'confirmed') {
      // 결제완료는 pending과 confirmed 모두 포함
      return orders.filter(order => 
        order.status === 'pending' || order.status === 'confirmed'
      ).length;
    } else {
      return orders.filter(order => order.status === status).length;
    }
  };

  // 상태별 색상 클래스 반환
  const getStatusColorClass = (status) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return 'status-paid'; // 결제완료 - 파란색
      case 'processing':
        return 'status-preparing'; // 상품 준비중 - 주황색
      case 'shipped':
        return 'status-shipping'; // 배송중 - 보라색
      case 'delivered':
        return 'status-delivered'; // 배송완료 - 초록색
      case 'cancelled':
        return 'status-cancelled'; // 주문취소 - 빨간색
      case 'refunded':
        return 'status-refunded'; // 환불완료 - 회색
      default:
        return '';
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getOrders({ sort: '-createdAt' });
        setOrders(res.data || []);
      } catch (err) {
        console.error('주문 목록 조회 오류:', err);
        setError(err.message || '주문 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // 상태 필터 적용
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else if (statusFilter === 'pending' || statusFilter === 'confirmed') {
      // 결제완료 필터는 pending과 confirmed 모두 포함
      setFilteredOrders(orders.filter(order => 
        order.status === 'pending' || order.status === 'confirmed'
      ));
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  }, [orders, statusFilter]);

  const handleGoDetail = (id) => {
    navigate(`/orders/${id}`);
  };

  const handleContinueShopping = () => {
    navigate('/products');
  };

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
  };

  if (loading) {
    return (
      <div className="order-list-page">
        <div className="order-list-container">
          <div className="order-list-loading">주문 목록을 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-list-page">
        <div className="order-list-container">
          <div className="order-list-error">{error}</div>
          <div className="order-list-actions">
            <button className="btn-primary" onClick={handleContinueShopping}>
              계속 쇼핑하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-list-page">
      <div className="order-list-container">
        <div className="order-list-header">
          <h1 className="order-list-title">주문 목록</h1>
          <p className="order-list-subtitle">최근 주문 내역을 확인할 수 있습니다.</p>
        </div>

        {(!orders || orders.length === 0) ? (
          <div className="order-list-empty">
            <p>주문 내역이 없습니다.</p>
            <button className="btn-primary" onClick={handleContinueShopping}>
              계속 쇼핑하기
            </button>
          </div>
        ) : (
          <>
            {/* 상태 필터 버튼 */}
            <div className="order-list-filters">
              <button
                className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleFilterChange('all')}
              >
                전체 <span className="filter-count">{getStatusCount('all')}</span>
              </button>
              <button
                className={`filter-btn status-paid ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => handleFilterChange('pending')}
              >
                결제완료 <span className="filter-count">{getStatusCount('pending')}</span>
              </button>
              <button
                className={`filter-btn status-preparing ${statusFilter === 'processing' ? 'active' : ''}`}
                onClick={() => handleFilterChange('processing')}
              >
                상품 준비중 <span className="filter-count">{getStatusCount('processing')}</span>
              </button>
              <button
                className={`filter-btn status-shipping ${statusFilter === 'shipped' ? 'active' : ''}`}
                onClick={() => handleFilterChange('shipped')}
              >
                배송중 <span className="filter-count">{getStatusCount('shipped')}</span>
              </button>
              <button
                className={`filter-btn status-delivered ${statusFilter === 'delivered' ? 'active' : ''}`}
                onClick={() => handleFilterChange('delivered')}
              >
                배송완료 <span className="filter-count">{getStatusCount('delivered')}</span>
              </button>
              <button
                className={`filter-btn status-cancelled ${statusFilter === 'cancelled' ? 'active' : ''}`}
                onClick={() => handleFilterChange('cancelled')}
              >
                주문취소 <span className="filter-count">{getStatusCount('cancelled')}</span>
              </button>
              <button
                className={`filter-btn status-refunded ${statusFilter === 'refunded' ? 'active' : ''}`}
                onClick={() => handleFilterChange('refunded')}
              >
                환불완료 <span className="filter-count">{getStatusCount('refunded')}</span>
              </button>
            </div>

            <div className="order-list-table">
              <div className="order-list-header-row">
                <span>주문 번호</span>
                <span>주문 날짜</span>
                <span>상태</span>
                <span>총 금액</span>
              </div>
              {(!filteredOrders || filteredOrders.length === 0) ? (
                <div className="order-list-empty-filter">
                  <p>해당 상태의 주문 내역이 없습니다.</p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
                  return (
                    <div
                      key={order._id}
                      className="order-list-row-wrapper"
                    >
                      <button
                        className="order-list-row"
                        type="button"
                        onClick={() => handleGoDetail(order._id)}
                      >
                        <span className="order-number">{order.orderNumber || '-'}</span>
                        <span className="order-date">
                          {createdAt
                            ? createdAt.toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })
                            : '-'}
                        </span>
                        <span className="order-status-cell">
                          <span className={`order-status ${getStatusColorClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                          {canTrackDelivery(order.status) && (
                            <button
                              className="track-delivery-btn"
                              type="button"
                              onClick={(e) => handleTrackDelivery(e, order._id)}
                            >
                              배송추적
                            </button>
                          )}
                        </span>
                        <span className="order-amount">
                          ₩{(order.totalAmount || 0).toLocaleString()}
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="order-list-actions">
              <button className="btn-primary" onClick={handleContinueShopping}>
                계속 쇼핑하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OrderList;


