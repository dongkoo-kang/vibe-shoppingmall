import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminUserList.css';
import { getUsers } from '../../utils/userApi';
import { getOrders } from '../../utils/orderApi';

function AdminUserList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!token || !user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      // 사용자 목록 조회
      const usersRes = await getUsers({ page: 1, limit: 1000 });
      let userList = usersRes.data || usersRes.users || [];

      // 각 사용자별 최근 주문일 계산
      const ordersRes = await getOrders({ limit: 1000, sort: '-createdAt' });
      const orders = ordersRes.data || [];

      const lastOrderMap = {};
      orders.forEach((order) => {
        const userId = typeof order.user === 'object' && order.user !== null ? order.user._id || order.user.id : order.user;
        if (!userId) return;

        let orderDate = null;

        // 결제일시 우선, 없으면 주문일시 사용 (AdminOrderList와 동일한 로직)
        if (order.payment?.paidAt) {
          const paidAtDate = new Date(order.payment.paidAt);
          if (!Number.isNaN(paidAtDate.getTime())) {
            orderDate = paidAtDate;
          }
        }

        if (!orderDate && order.createdAt) {
          const createdAtDate = new Date(order.createdAt);
          if (!Number.isNaN(createdAtDate.getTime())) {
            orderDate = createdAtDate;
          }
        }

        if (!orderDate) return;

        if (!lastOrderMap[userId] || lastOrderMap[userId] < orderDate) {
          lastOrderMap[userId] = orderDate;
        }
      });

      const enhancedUsers = userList.map((u, index) => {
        const id = u._id || u.id;
        const lastOrderDate = id && lastOrderMap[id] ? lastOrderMap[id] : null;
        return {
          ...u,
          index: index + 1,
          lastOrderDate
        };
      });

      // 정렬: 등급(level) 내림차순, 최근 주문일 내림차순
      enhancedUsers.sort((a, b) => {
        const levelA = a.level || 1;
        const levelB = b.level || 1;
        if (levelA !== levelB) {
          return levelB - levelA;
        }
        const dateA = a.lastOrderDate ? new Date(a.lastOrderDate) : null;
        const dateB = b.lastOrderDate ? new Date(b.lastOrderDate) : null;
        if (dateA && dateB) return dateB - dateA;
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return 0;
      });

      setUsers(enhancedUsers);
    } catch (err) {
      console.error('회원 목록 조회 오류:', err);
      setError(err.message || '회원 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return '-';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const getLevelLabel = (level, role) => {
    // 관리자 계정은 등급 숫자와 상관없이 '관리자'로 표시
    if (role === 'admin') {
      return '관리자';
    }

    switch (level) {
      case 3:
        return 'VIP';
      case 2:
        return '우수';
      case 1:
      default:
        return '일반';
    }
  };

  const handleBackToDashboard = () => {
    navigate('/admin');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const name = (user.name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const phone = (user.phone || '').toLowerCase();
    return name.includes(query) || email.includes(query) || phone.includes(query);
  });

  return (
    <div className="admin-user-list">
      <div className="admin-user-container">
        <div className="admin-user-header">
          <h1 className="admin-user-title">회원 관리</h1>
          <button type="button" className="btn-secondary" onClick={handleBackToDashboard}>
            대시보드로
          </button>
        </div>

        {/* 검색 영역 */}
        <div className="admin-user-search">
          <div className="admin-user-search-input-wrapper">
            <span className="admin-user-search-icon">🔍</span>
            <input
              type="text"
              className="admin-user-search-input"
              placeholder="이름, 이메일, 연락처로 검색..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {error && <div className="admin-user-error">{error}</div>}

        {loading ? (
          <div className="admin-user-loading">회원 목록을 불러오는 중입니다...</div>
        ) : (
          <div className="admin-user-table-wrapper">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>이름</th>
                  <th>등급</th>
                  <th>연락처</th>
                  <th>이메일</th>
                  <th>최근 주문일</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="admin-user-empty">
                      {searchQuery.trim() ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => (
                    <tr key={user._id || user.id || idx}>
                      <td>{idx + 1}</td>
                      <td>{user.name || '-'}</td>
                      <td>{getLevelLabel(user.level, user.role)}</td>
                      <td>{user.phone || '-'}</td>
                      <td>{user.email || '-'}</td>
                      <td>{formatDate(user.lastOrderDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUserList;


