import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './AdminOrderDetail.css';
import { getOrder, updateOrderStatus } from '../../utils/orderApi';

function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [cancelReason, setCancelReason] = useState('');

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

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!token || !user || user.role !== 'admin') {
      navigate('/admin');
      return;
    }

    fetchOrder();
  }, [id, navigate]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getOrder(id);
      setOrder(res.data);
      setNewStatus(res.data.status);
      setTrackingNumber(res.data.trackingNumber || '');
    } catch (err) {
      console.error('주문 상세 조회 오류:', err);
      setError(err.message || '주문 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus) {
      alert('상태를 선택해주세요.');
      return;
    }

    try {
      setIsUpdating(true);
      const statusData = {
        status: newStatus
      };

      // 배송중일 때 송장번호 추가
      if (newStatus === 'shipped' && trackingNumber) {
        statusData.trackingNumber = trackingNumber;
      }

      await updateOrderStatus(id, statusData);
      alert('주문 상태가 변경되었습니다.');
      setShowStatusModal(false);
      fetchOrder(); // 주문 정보 다시 불러오기
    } catch (err) {
      console.error('주문 상태 변경 오류:', err);
      alert(`주문 상태 변경 중 오류가 발생했습니다.\n${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('취소 사유를 입력해주세요.');
      return;
    }

    if (!window.confirm('정말로 이 주문을 취소하시겠습니까?\n취소된 주문의 재고는 자동으로 복구됩니다.')) {
      return;
    }

    try {
      setIsUpdating(true);
      // 관리자는 updateOrderStatus를 사용하여 취소 처리
      await updateOrderStatus(id, {
        status: 'cancelled'
      });
      alert('주문이 취소되었습니다.');
      setShowCancelModal(false);
      setCancelReason('');
      fetchOrder(); // 주문 정보 다시 불러오기
    } catch (err) {
      console.error('주문 취소 오류:', err);
      alert(`주문 취소 중 오류가 발생했습니다.\n${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/admin');
  };

  const handleBackToOrderList = () => {
    navigate('/admin/orders');
  };

  if (loading) {
    return (
      <div className="admin-order-detail-page">
        <div className="admin-order-detail-container">
          <div className="loading-message">주문 정보를 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="admin-order-detail-page">
        <div className="admin-order-detail-container">
          <div className="error-message">{error || '주문을 찾을 수 없습니다.'}</div>
          <div className="admin-order-detail-actions">
            <button className="btn-secondary" onClick={handleBackToDashboard}>
              대시보드로
            </button>
            <button className="btn-primary" onClick={handleBackToOrderList}>
              주문 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 날짜 파싱 유틸 함수 (초 단위 타임스탬프, 밀리초 단위, ISO 문자열 모두 지원)
  const parseOrderDate = (dateValue) => {
    if (!dateValue) return null;
    
    // 이미 Date 객체인 경우
    if (dateValue instanceof Date) {
      const date = dateValue;
      // 1970년 이전이거나 2100년 이후면 잘못된 날짜로 간주
      if (isNaN(date.getTime()) || date.getFullYear() < 1970 || date.getFullYear() > 2100) {
        return null;
      }
      return date;
    }
    
    // 숫자 또는 숫자 문자열인 경우 (초 단위 또는 밀리초 단위)
    if (typeof dateValue === 'number' || (typeof dateValue === 'string' && /^\d+$/.test(dateValue))) {
      const numValue = typeof dateValue === 'string' ? parseInt(dateValue, 10) : dateValue;
      
      // 0이거나 음수면 null 반환
      if (numValue <= 0) {
        return null;
      }
      
      // 값이 작거나 길이가 10자리 이하면 초 단위로 간주 (예: 1734410736)
      // 밀리초 단위는 보통 13자리 (예: 1734410736000)
      let date;
      if (numValue < 10000000000) {
        // 초 단위를 밀리초로 변환
        date = new Date(numValue * 1000);
      } else {
        // 밀리초 단위로 간주
        date = new Date(numValue);
      }
      
      // 1970년 이전이거나 2100년 이후면 잘못된 날짜로 간주
      if (isNaN(date.getTime()) || date.getFullYear() < 1970 || date.getFullYear() > 2100) {
        return null;
      }
      
      return date;
    }
    
    // ISO 문자열 또는 기타 문자열 형식
    const date = new Date(dateValue);
    
    // 1970년 이전이거나 2100년 이후면 잘못된 날짜로 간주
    if (isNaN(date.getTime()) || date.getFullYear() < 1970 || date.getFullYear() > 2100) {
      return null;
    }
    
    return date;
  };

  const createdAt = parseOrderDate(order?.createdAt);
  const paidAt = parseOrderDate(order?.payment?.paidAt);
  const shippedAt = parseOrderDate(order?.shippedAt);
  const deliveredAt = parseOrderDate(order?.deliveredAt);
  const cancelledAt = parseOrderDate(order?.cancelledAt);

  // 디버깅: 결제일시 원본 값 확인
  if (order?.payment?.paidAt) {
    console.log('결제일시 원본 값:', order.payment.paidAt, '타입:', typeof order.payment.paidAt);
    console.log('파싱된 결제일시:', paidAt);
  }

  const canChangeStatus = order.status !== 'cancelled' && order.status !== 'delivered';
  const canCancel = order.status !== 'cancelled' && order.status !== 'delivered';

  return (
    <div className="admin-order-detail-page">
      <div className="admin-order-detail-container">
        <div className="admin-order-detail-header">
          <h1 className="admin-order-detail-title">주문 관리</h1>
          <div className="admin-order-detail-header-actions">
            <button className="back-to-dashboard-btn" onClick={handleBackToDashboard}>
              대시보드로
            </button>
            <button className="back-to-list-btn" onClick={handleBackToOrderList}>
              주문 목록으로
            </button>
          </div>
        </div>

        {/* 주문 정보 섹션 */}
        <section className="admin-order-section">
          <h2 className="admin-order-section-title">주문 정보</h2>
          <div className="admin-order-info-grid">
            <div className="admin-order-info-item">
              <span className="label">주문 번호</span>
              <span className="value">{order.orderNumber || '-'}</span>
            </div>
            <div className="admin-order-info-item">
              <span className="label">주문 날짜</span>
              <span className="value">
                {createdAt
                  ? createdAt.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '-'}
              </span>
            </div>
            <div className="admin-order-info-item">
              <span className="label">결제 일시</span>
              <span className="value">
                {(paidAt || createdAt)
                  ? (paidAt || createdAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </span>
            </div>
            <div className="admin-order-info-item">
              <span className="label">주문 상태</span>
              <span className={`value status-badge ${getStatusColorClass(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <div className="admin-order-info-item">
              <span className="label">총 주문 금액</span>
              <span className="value">₩{(order.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div className="admin-order-info-item">
              <span className="label">고객명</span>
              <span className="value">{order.user?.name || order.shipping?.recipientName || '-'}</span>
            </div>
            <div className="admin-order-info-item">
              <span className="label">고객 이메일</span>
              <span className="value">{order.user?.email || '-'}</span>
            </div>
            {order.trackingNumber && (
              <div className="admin-order-info-item">
                <span className="label">송장번호</span>
                <span className="value">{order.trackingNumber}</span>
              </div>
            )}
            {shippedAt && (
              <div className="admin-order-info-item">
                <span className="label">배송 시작일</span>
                <span className="value">
                  {shippedAt.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </span>
              </div>
            )}
            {deliveredAt && (
              <div className="admin-order-info-item">
                <span className="label">배송 완료일</span>
                <span className="value">
                  {deliveredAt.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </span>
              </div>
            )}
            {cancelledAt && (
              <div className="admin-order-info-item">
                <span className="label">취소 일시</span>
                <span className="value">
                  {cancelledAt.toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 상품 목록 섹션 */}
        <section className="admin-order-section">
          <h2 className="admin-order-section-title">상품 목록</h2>
          <div className="admin-order-items-list">
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => (
                <div key={item._id} className="admin-order-item">
                  <div className="admin-order-item-left">
                    <div className="admin-order-item-thumb">
                      {item.product?.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name || item.productName || '상품'}
                        />
                      ) : (
                        <div className="admin-order-item-thumb-placeholder">📦</div>
                      )}
                    </div>
                    <div className="admin-order-item-info">
                      <div className="admin-order-item-name">
                        {item.productName || item.product?.name || '상품'}
                      </div>
                      <div className="admin-order-item-sku">
                        상품 코드: {item.productSku || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="admin-order-item-right">
                    <div className="admin-order-item-qty">× {item.quantity}개</div>
                    <div className="admin-order-item-price">
                      ₩{(item.subtotal || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-message">주문 상품 정보가 없습니다.</p>
            )}
          </div>
        </section>

        {/* 배송 정보 섹션 */}
        <section className="admin-order-section">
          <h2 className="admin-order-section-title">배송 정보</h2>
          <div className="admin-order-info-grid">
            <div className="admin-order-info-item">
              <span className="label">받는사람</span>
              <span className="value">{order.shipping?.recipientName || '-'}</span>
            </div>
            <div className="admin-order-info-item">
              <span className="label">연락처</span>
              <span className="value">{order.shipping?.recipientPhone || '-'}</span>
            </div>
            <div className="admin-order-info-item full">
              <span className="label">주소</span>
              <span className="value">
                {order.shipping
                  ? `${order.shipping.postalCode || ''} ${
                      order.shipping.address1 || ''
                    } ${order.shipping.address2 || ''}`
                  : '-'}
              </span>
            </div>
            {order.shipping?.deliveryRequest && (
              <div className="admin-order-info-item full">
                <span className="label">배송 요청사항</span>
                <span className="value">{order.shipping.deliveryRequest}</span>
              </div>
            )}
          </div>
        </section>

        {/* 관리자 액션 버튼 */}
        <div className="admin-order-actions">
          {canChangeStatus && (
            <button
              className="btn-status-change"
              onClick={() => setShowStatusModal(true)}
              disabled={isUpdating}
            >
              상태 변경
            </button>
          )}
          {canCancel && (
            <button
              className="btn-cancel"
              onClick={() => setShowCancelModal(true)}
              disabled={isUpdating}
            >
              주문 취소
            </button>
          )}
        </div>

        {/* 상태 변경 모달 */}
        {showStatusModal && (
          <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">주문 상태 변경</h3>
              <div className="modal-body">
                <div className="form-group">
                  <label>상태 선택</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="form-select"
                  >
                    <option value="pending">결제완료</option>
                    <option value="processing">상품 준비중</option>
                    <option value="shipped">배송중</option>
                    <option value="delivered">배송완료</option>
                  </select>
                </div>
                {newStatus === 'shipped' && (
                  <div className="form-group">
                    <label>송장번호 (선택사항)</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="form-input"
                      placeholder="송장번호를 입력하세요"
                    />
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowStatusModal(false)}
                  disabled={isUpdating}
                >
                  취소
                </button>
                <button
                  className="btn-primary"
                  onClick={handleStatusChange}
                  disabled={isUpdating}
                >
                  {isUpdating ? '처리 중...' : '변경'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 주문 취소 모달 */}
        {showCancelModal && (
          <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">주문 취소</h3>
              <div className="modal-body">
                <div className="form-group">
                  <label>취소 사유</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="form-textarea"
                    placeholder="취소 사유를 입력하세요"
                    rows="4"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                  }}
                  disabled={isUpdating}
                >
                  취소
                </button>
                <button
                  className="btn-cancel"
                  onClick={handleCancelOrder}
                  disabled={isUpdating}
                >
                  {isUpdating ? '처리 중...' : '주문 취소'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminOrderDetail;

