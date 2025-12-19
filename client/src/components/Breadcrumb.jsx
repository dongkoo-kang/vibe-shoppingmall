import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import './Breadcrumb.css';
import { fetchProductById } from '../utils/productApi';
import { getOrder } from '../utils/orderApi';

function Breadcrumb() {
  const location = useLocation();
  const [productCategory, setProductCategory] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);
  
  // 상품 상세 페이지인 경우 상품 정보 가져오기
  useEffect(() => {
    const loadProductCategory = async () => {
      // /products/:id 패턴 확인
      const productMatch = location.pathname.match(/^\/products\/([a-f0-9]{24}|[^/]+)$/);
      if (productMatch && productMatch[1]) {
        const productId = productMatch[1];
        try {
          const res = await fetchProductById(productId);
          if (res.data && res.data.category && res.data.category.type) {
            setProductCategory(res.data.category.type);
          }
        } catch (err) {
          // 에러 발생 시 무시 (기본 라벨 사용)
          console.error('상품 정보를 불러오는 중 오류:', err);
        }
      } else {
        // 상품 상세 페이지가 아니면 카테고리 초기화
        setProductCategory(null);
      }
    };
    
    loadProductCategory();
  }, [location.pathname]);

  // 주문 상세/성공 페이지인 경우 주문 번호 가져오기
  useEffect(() => {
    const loadOrderNumber = async () => {
      const paths = location.pathname.split('/').filter(Boolean);
      if (paths[0] === 'orders' && paths[1]) {
        const orderId = paths[1];
        try {
          const res = await getOrder(orderId);
          if (res.data && res.data.orderNumber) {
            setOrderNumber(res.data.orderNumber);
          } else {
            setOrderNumber(null);
          }
        } catch (err) {
          console.error('주문 정보를 불러오는 중 오류:', err);
          setOrderNumber(null);
        }
      } else {
        setOrderNumber(null);
      }
    };

    loadOrderNumber();
  }, [location.pathname]);
  
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: '홈', path: '/' }];
    
    if (paths.length === 0) {
      return breadcrumbs;
    }

    // 주문 관련 페이지: 홈 > 주문목록 > 주문번호
    if (paths[0] === 'orders') {
      const orderId = paths[1];

      // 주문 목록 페이지 (/orders)
      if (!orderId) {
        breadcrumbs.push({
          label: '주문목록',
          path: '/orders',
          isLast: true,
        });
        return breadcrumbs;
      }

      // 주문 상세 / 주문 성공 페이지 (/orders/:id, /orders/:id/success 등)
      breadcrumbs.push({
        label: '주문목록',
        path: '/orders',
        isLast: false,
      });

      breadcrumbs.push({
        label: orderNumber || '주문정보',
        path: `/orders/${orderId}`,
        isLast: true,
      });

      return breadcrumbs;
    }
    
    let currentPath = '';
    
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      
      let label = path;
      
      // 경로에 따른 라벨 매핑
      if (path === 'products') {
        label = '상품 리스트';
      } else if (path === 'cart') {
        label = '장바구니';
      } else if (path === 'admin') {
        label = '관리자';
      } else if (path === 'login') {
        label = '로그인';
      } else if (path === 'signup') {
        label = '회원가입';
      } else if (path === 'change-password') {
        label = '비밀번호 변경';
      } else if (path === 'new') {
        label = '상품 등록';
      } else if (path === 'edit') {
        label = '상품 수정';
      } else if (!isNaN(path) || path.match(/^[a-f0-9]{24}$/i)) {
        // 숫자 ID 또는 MongoDB ObjectId인 경우 (상품 상세 등)
        const prevPath = paths[index - 1];
        if (prevPath === 'products') {
          // 상품 분류가 있으면 분류 표시, 없으면 기본 라벨
          label = productCategory || '상품 상세';
        } else if (prevPath === 'admin' && paths[index - 2] === 'products') {
          label = '상품 수정';
        } else {
          label = path;
        }
      }
      
      breadcrumbs.push({
        label,
        path: currentPath,
        isLast: index === paths.length - 1
      });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = getBreadcrumbs();
  
  // 홈 페이지에서는 breadcrumb 숨김
  if (location.pathname === '/') {
    return null;
  }
  
  return (
    <nav className="breadcrumb">
      <div className="breadcrumb-container">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.path} className="breadcrumb-item">
            {index > 0 && <span className="breadcrumb-separator"> &gt; </span>}
            {crumb.isLast ? (
              <span className="breadcrumb-current">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="breadcrumb-link">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}

export default Breadcrumb;

