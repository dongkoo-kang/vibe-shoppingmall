const isDevelopment = import.meta.env.DEV;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ORDER_API_URL = `${API_BASE_URL}/orders`;

const getFetchOptions = (method = 'GET', body = null, auth = true) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (isDevelopment) {
    options.headers['Cache-Control'] = 'no-cache';
    options.headers['Pragma'] = 'no-cache';
    options.cache = 'no-store';
  }

  if (auth) {
    const token = localStorage.getItem('token');
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  return options;
};

// 주문 생성
export const createOrder = async (orderData) => {
  try {
    // Date 객체를 ISO 문자열로 변환
    const serializedData = JSON.parse(JSON.stringify(orderData, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }));

    const response = await fetch(
      `${ORDER_API_URL}`,
      getFetchOptions('POST', serializedData)
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.error || data.message || '주문 생성 중 오류가 발생했습니다.';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

// 주문 조회
export const getOrder = async (orderId) => {
  try {
    const response = await fetch(
      `${ORDER_API_URL}/${orderId}`,
      getFetchOptions('GET')
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '주문을 불러오는 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

// 주문 목록 조회
export const getOrders = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${ORDER_API_URL}${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, getFetchOptions('GET'));
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '주문 목록을 불러오는 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

// 주문 상태 변경 (관리자)
export const updateOrderStatus = async (orderId, statusData) => {
  try {
    const response = await fetch(
      `${ORDER_API_URL}/${orderId}/status`,
      getFetchOptions('PATCH', statusData)
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '주문 상태 변경 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

// 주문 취소 (관리자)
export const cancelOrder = async (orderId, cancelReason = '') => {
  try {
    const response = await fetch(
      `${ORDER_API_URL}/${orderId}/cancel`,
      getFetchOptions('PATCH', { cancelReason })
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '주문 취소 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

