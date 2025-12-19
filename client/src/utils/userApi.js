import { API_URL as USER_API_URL } from '../config/api';

// 전체 사용자 목록 조회 (관리자용)
export const getUsers = async ({ page = 1, limit = 100, sort = '-level,-lastOrderDate' } = {}) => {
  try {
    const token = localStorage.getItem('token');

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });

    const response = await fetch(`${USER_API_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      const message = data.message || '회원 목록을 불러오는 중 오류가 발생했습니다.';
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};


