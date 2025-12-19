import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './OrderDetail.css';
import { getOrder } from '../utils/orderApi';

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getOrder(id);
        setOrder(res.data);
      } catch (err) {
        console.error('주문 상세 조회 오류:', err);
        setError(err.message || '주문 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    } else {
      setLoading(false);
      setError('유효하지 않은 주문 번호입니다.');
    }
  }, [id]);

  const handleGoToOrders = () => {
    navigate('/orders');
  };

  const handleContinueShopping = () => {
    navigate('/products');
  };

  if (loading) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-container">
          <div className="order-detail-loading">주문 정보를 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-container">
          <div className="order-detail-error">{error}</div>
          <div className="order-detail-actions">
            <button className="btn-secondary" onClick={handleGoToOrders}>
              주문 목록으로
            </button>
            <button className="btn-primary" onClick={handleContinueShopping}>
              계속 쇼핑하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const createdAt = order?.createdAt ? new Date(order.createdAt) : null;

  return (
    <div className="order-detail-page">
      <div className="order-detail-container">
        <div className="order-detail-header">
          <h1 className="order-detail-title">주문 정보</h1>
          <p className="order-detail-subtitle">
            주문 번호 {order?.orderNumber || '-'}
          </p>
        </div>

        <div className="order-detail-content">
          <section className="order-section">
            <h2 className="order-section-title">주문 요약</h2>
            <div className="order-info-grid">
              <div className="order-info-item">
                <span className="label">주문 번호</span>
                <span className="value">{order?.orderNumber || '-'}</span>
              </div>
              <div className="order-info-item">
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
              <div className="order-info-item">
                <span className="label">주문 상태</span>
                <span className="value">{getStatusLabel(order?.status)}</span>
              </div>
              <div className="order-info-item">
                <span className="label">총 주문 금액</span>
                <span className="value">
                  ₩{(order?.totalAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="order-items">
              <h3 className="order-items-title">상품 목록</h3>
              {order?.items && order.items.length > 0 ? (
                <ul className="order-items-list">
                  {order.items.map((item) => (
                    <li key={item._id} className="order-item">
                      <div className="order-item-left">
                        <div className="order-item-thumb">
                          {item.product?.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name || item.productName || '상품'}
                            />
                          ) : (
                            <div className="order-item-thumb-placeholder">☕</div>
                          )}
                        </div>
                        <div className="order-item-main">
                          <span className="order-item-name">
                            {item.productName || item.product?.name || '상품'}
                          </span>
                          <span className="order-item-qty">
                            × {item.quantity}개
                          </span>
                        </div>
                      </div>
                      <div className="order-item-sub">
                        <span className="order-item-sku">
                          상품 코드: {item.productSku || '-'}
                        </span>
                        <span className="order-item-price">
                          ₩{(item.subtotal || 0).toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="order-empty">주문 상품 정보가 없습니다.</p>
              )}
            </div>
          </section>

          <section className="order-section">
            <h2 className="order-section-title">배송 정보</h2>
            <div className="order-info-grid">
              <div className="order-info-item">
                <span className="label">받는사람</span>
                <span className="value">{order?.shipping?.recipientName || '-'}</span>
              </div>
              <div className="order-info-item">
                <span className="label">연락처</span>
                <span className="value">{order?.shipping?.recipientPhone || '-'}</span>
              </div>
              <div className="order-info-item full">
                <span className="label">주소</span>
                <span className="value">
                  {order?.shipping
                    ? `${order.shipping.postalCode || ''} ${
                        order.shipping.address1 || ''
                      } ${order.shipping.address2 || ''}`
                    : '-'}
                </span>
              </div>
              {order?.shipping?.deliveryRequest && (
                <div className="order-info-item full">
                  <span className="label">배송 요청사항</span>
                  <span className="value">{order.shipping.deliveryRequest}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="order-detail-actions">
          <button className="btn-secondary" onClick={handleGoToOrders}>
            주문 목록으로
          </button>
          <button className="btn-primary" onClick={handleContinueShopping}>
            계속 쇼핑하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;


