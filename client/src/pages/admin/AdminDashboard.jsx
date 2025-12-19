import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import { getOrders } from '../../utils/orderApi';
import { fetchProducts } from '../../utils/productApi';

function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalOrders: 0,
    totalSales: 0,
    productCount: 8,
    customerCount: 0,
    recentOrders: []
  });

  // 날짜 파싱 유틸 함수 (초 단위 타임스탬프, 밀리초 단위, ISO 문자열 모두 지원)
  const parseOrderDate = (dateValue) => {
    if (!dateValue) return null;
    
    // 이미 Date 객체인 경우
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    
    // 숫자 또는 숫자 문자열인 경우 (초 단위 또는 밀리초 단위)
    if (typeof dateValue === 'number' || (typeof dateValue === 'string' && /^\d+$/.test(dateValue))) {
      const numValue = typeof dateValue === 'string' ? parseInt(dateValue, 10) : dateValue;
      
      // 값이 작거나 길이가 10자리 이하면 초 단위로 간주 (예: 1734410736)
      // 밀리초 단위는 보통 13자리 (예: 1734410736000)
      if (numValue < 10000000000) {
        // 초 단위를 밀리초로 변환
        const date = new Date(numValue * 1000);
        return isNaN(date.getTime()) ? null : date;
      } else {
        // 밀리초 단위로 간주
        const date = new Date(numValue);
        return isNaN(date.getTime()) ? null : date;
      }
    }
    
    // ISO 문자열 또는 기타 문자열 형식
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  };

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

  // 관리자 권한 확인 및 대시보드 데이터 조회
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');
    
    if (!token || !user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      // 전체 주문 목록 조회 (통계 계산을 위해 충분히 큰 limit 설정)
      const ordersRes = await getOrders({
        sort: '-createdAt',
        limit: 1000 // 충분히 큰 값으로 설정하여 모든 주문 가져오기
      });
      
      console.log('주문 조회 응답:', ordersRes);
      let allOrders = ordersRes.data || [];
      console.log('전체 주문 수:', allOrders.length);
      
      // 주문 데이터 샘플 확인 (디버깅)
      if (allOrders.length > 0) {
        console.log('첫 번째 주문 샘플:', {
          orderNumber: allOrders[0].orderNumber,
          createdAt: allOrders[0].createdAt,
          paidAt: allOrders[0].payment?.paidAt,
          status: allOrders[0].status,
          totalAmount: allOrders[0].totalAmount
        });
      }

      // 결제 시간별로 정렬 (클라이언트 측 정렬)
      allOrders.sort((a, b) => {
        const dateA = parseOrderDate(a.payment?.paidAt) || parseOrderDate(a.createdAt) || new Date(0);
        const dateB = parseOrderDate(b.payment?.paidAt) || parseOrderDate(b.createdAt) || new Date(0);
        return dateB - dateA; // 최신순
      });

      // 최근 30일 계산
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정
      console.log('30일 전 날짜:', thirtyDaysAgo);

      // 최근 30일 주문 필터링 (결제 완료된 주문만 포함)
      const recentOrders = allOrders.filter(order => {
        // 결제 완료된 주문만 포함 (취소/환불 제외)
        if (order.status === 'cancelled' || order.status === 'refunded') {
          return false;
        }

        // 날짜 확인
        const orderDate = parseOrderDate(order.payment?.paidAt) || parseOrderDate(order.createdAt);
        
        if (!orderDate) {
          // 날짜 파싱 실패 시 createdAt이 있으면 포함
          if (order.createdAt) {
            return true;
          }
          return false;
        }
        
        // 날짜 비교 (시간 제외)
        const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
        const thirtyDaysAgoOnly = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate());
        
        return orderDateOnly >= thirtyDaysAgoOnly;
      });

      console.log('전체 주문 수:', allOrders.length);
      console.log('최근 30일 주문 수:', recentOrders.length);
      console.log('전체 주문 샘플:', allOrders.map(o => ({
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        paidAt: o.payment?.paidAt,
        status: o.status,
        totalAmount: o.totalAmount
      })));

      // 총 주문 수 (최근 30일) - 최근 30일 주문이 없으면 전체 주문 수 사용
      const totalOrders = recentOrders.length > 0 ? recentOrders.length : allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded').length;

      // 총 매출 계산 (최근 30일, 취소/환불 제외) - 최근 30일 주문이 없으면 전체 주문 매출 사용
      const ordersForSales = recentOrders.length > 0 ? recentOrders : allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
      const totalSales = ordersForSales.reduce((sum, order) => {
        return sum + (order.totalAmount || 0);
      }, 0);

      console.log('총 매출:', totalSales);

      // 고유 고객 수 계산 (최근 30일, 중복 제외) - 최근 30일 주문이 없으면 전체 주문 고객 수 사용
      const ordersForCustomers = recentOrders.length > 0 ? recentOrders : allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
      const uniqueCustomers = new Set(
        ordersForCustomers
          .map(order => {
            // user가 객체인 경우 _id 또는 id 사용, 문자열인 경우 그대로 사용
            if (typeof order.user === 'object' && order.user !== null) {
              return order.user._id || order.user.id || (order.user._id ? order.user._id.toString() : null);
            }
            return order.user ? order.user.toString() : null;
          })
          .filter(userId => userId)
      ).size;

      console.log('고유 고객 수:', uniqueCustomers);

      // 최근 주문 데이터 포맷팅 (결제 시간별 정렬된 상위 10개)
      const formattedRecentOrders = allOrders.slice(0, 10).map(order => ({
        id: order._id,
        orderNumber: order.orderNumber || '-',
        amount: order.totalAmount || 0,
        productCount: order.items?.length || 0,
        status: getStatusLabel(order.status)
      }));

      // 상품 수 조회
      let productCount = 0;
      try {
        const productsRes = await fetchProducts('?limit=1000'); // 충분히 큰 limit
        productCount = productsRes.data?.length || 0;
        console.log('상품 수:', productCount);
      } catch (productErr) {
        console.error('상품 수 조회 오류:', productErr);
        // 상품 수 조회 실패 시 기본값 유지
      }

      setDashboardData({
        totalOrders,
        totalSales,
        productCount,
        customerCount: uniqueCustomers,
        recentOrders: formattedRecentOrders
      });
    } catch (err) {
      console.error('대시보드 데이터 조회 오류:', err);
      alert(`대시보드 데이터를 불러오는 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  const handleProductManagement = () => {
    navigate('/admin/products');
  };

  const handleOrderManagement = () => {
    navigate('/admin/orders');
  };

  const handleAddProduct = () => {
    navigate('/admin/products/new');
  };

  const handleUserManagement = () => {
    navigate('/admin/users');
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">관리자 대시보드</h1>
        </div>

      {/* 요약 카드 섹션 */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-content">
            <div className="card-title-row">
              <h3 className="card-title">총 주문</h3>
              <div className="card-icon">🛒</div>
            </div>
            <p className="card-value">{dashboardData.totalOrders}</p>
            <p className="card-subtitle">지난 30일</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-content">
            <div className="card-title-row">
              <h3 className="card-title">총 매출</h3>
              <div className="card-icon">$</div>
            </div>
            <p className="card-value">₩{dashboardData.totalSales.toLocaleString()}</p>
            <p className="card-subtitle">지난 30일</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-content">
            <div className="card-title-row">
              <h3 className="card-title">상품 수</h3>
              <div className="card-icon">📦</div>
            </div>
            <p className="card-value">{dashboardData.productCount}</p>
            <p className="card-subtitle">현재 등록된 상품</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-content">
            <div className="card-title-row">
              <h3 className="card-title">주문 고객</h3>
              <div className="card-icon">👥</div>
            </div>
            <p className="card-value">{dashboardData.customerCount}</p>
            <p className="card-subtitle">중복 제외</p>
          </div>
        </div>
      </div>

      {/* 액션 카드 섹션 */}
      <div className="action-cards">
        <div className="action-card product-management" onClick={handleProductManagement}>
          <div className="action-content">
            <div className="action-main">
              <div className="action-text">
                <h4 className="action-title">상품 관리</h4>
                <span className="action-count">{dashboardData.productCount}개 상품 관리</span>
              </div>
              <div className="action-icon">📦</div>
            </div>
          </div>
        </div>

        <div className="action-card add-product" onClick={handleAddProduct}>
          <div className="action-content">
            <div className="action-main">
              <div className="action-text">
                <h4 className="action-title">상품 추가</h4>
                <span className="action-count">새로운 상품 등록</span>
              </div>
              <div className="action-icon">➕</div>
            </div>
          </div>
        </div>

        <div className="action-card order-management" onClick={handleOrderManagement}>
          <div className="action-content">
            <div className="action-main">
              <div className="action-text">
                <h4 className="action-title">주문 관리</h4>
                <span className="action-count">{dashboardData.totalOrders}개 주문 조회</span>
              </div>
              <div className="action-icon">🧾</div>
            </div>
          </div>
        </div>

        <div className="action-card user-management" onClick={handleUserManagement}>
          <div className="action-content">
            <div className="action-main">
              <div className="action-text">
                <h4 className="action-title">회원 관리</h4>
                <span className="action-count">회원 정보 및 권한 관리</span>
              </div>
              <div className="action-icon">👥</div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 주문 섹션 */}
      <div className="recent-orders-section">
        <h2 className="section-title">최근 주문</h2>
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>금액</th>
                <th>상품 수</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-message">
                    주문 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                dashboardData.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td>
                    <td>₩{order.amount.toLocaleString()}</td>
                    <td>{order.productCount}</td>
                    <td>{order.status}</td>
                    <td>
                      <button 
                        className="action-button"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                      >
                        조회
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

