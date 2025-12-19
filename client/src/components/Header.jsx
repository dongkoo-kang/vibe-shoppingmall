import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';
import { getCart } from '../utils/cartApi';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItemCount, setCartItemCount] = useState(0);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');
  const isLoggedIn = user && token;
  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    const loadCartCount = async () => {
      if (isLoggedIn && !isAdmin) {
        try {
          const res = await getCart();
          const items = res.data?.items || [];
          setCartItemCount(items.length);
        } catch (err) {
          // 에러 발생 시 무시 (인증 오류 등)
          setCartItemCount(0);
        }
      } else {
        setCartItemCount(0);
      }
    };

    loadCartCount();
    
    // 장바구니 업데이트 이벤트 리스너
    const handleCartUpdate = () => {
      loadCartCount();
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    // 주기적으로 체크 (다른 탭에서 변경된 경우 대비)
    const interval = setInterval(loadCartCount, 5000);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      clearInterval(interval);
    };
  }, [isLoggedIn, isAdmin, location.pathname]);

  const handleContact = () => {
    window.location.href =
      'mailto:admin@gmail.com?subject=%5BCoffee%20Co.%5D%20문의&body=문의 내용을 작성해 주세요.';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('needsPasswordChange');
    navigate('/');
    window.location.reload();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="brand-name" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            Coffee Co.
          </h1>
          
          <form className="header-search" onSubmit={handleSearch}>
            <input
              type="text"
              className="search-input"
              placeholder="상품명 또는 브랜드 입력"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-btn">
              🔍
            </button>
          </form>
        </div>

        <nav className="main-nav">
          <button
            type="button"
            className="nav-link"
            onClick={() => navigate('/')}
          >
            홈
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => navigate('/products')}
          >
            상품
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={handleContact}
          >
            문의
          </button>
        </nav>
        
        <div className="header-right">
          {isLoggedIn ? (
            <>
              <span className="welcome-message">
                환영합니다. {user.name}님
                {!isAdmin && user.level && (
                  <span className="user-level">
                    <img 
                      src={`/level${user.level}.png`} 
                      alt={`Level ${user.level}`} 
                      className="level-icon" 
                    />
                    {user.level === 3 && (
                      <span className="vip-text">VIP</span>
                    )}
                  </span>
                )}
              </span>
              
              {isAdmin ? (
                <>
                  <button 
                    className="header-btn admin-btn"
                    onClick={() => navigate('/admin')}
                  >
                    관리자 메뉴
                  </button>
                  <button 
                    className="header-btn logout-btn small"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="header-btn"
                    onClick={() => navigate('/cart')}
                  >
                    장바구니{cartItemCount > 0 && `(${cartItemCount})`}
                  </button>
                  
                  <button 
                    className="header-btn"
                    onClick={() => navigate('/orders')}
                  >
                    주문목록
                  </button>
                  
                  <button 
                    className="header-btn"
                    onClick={() => {
                      // 정보변경 기능은 추후 구현
                      alert('정보변경 기능은 준비 중입니다.');
                    }}
                  >
                    정보변경
                  </button>
                  
                  <button 
                    className="header-btn logout-btn small"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button 
                className="header-btn"
                onClick={() => navigate('/login')}
              >
                로그인
              </button>
              <button 
                className="header-btn"
                onClick={() => navigate('/signup')}
              >
                회원가입
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;

