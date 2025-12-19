import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 페이지 이동 시 스크롤을 상단으로 이동
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default ScrollToTop;

