const isDevelopment = import.meta.env.DEV;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const CART_API_URL = `${API_BASE_URL}/cart`;

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

export const getCart = async () => {
  try {
    const response = await fetch(`${CART_API_URL}`, getFetchOptions('GET'));
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '장바구니를 불러오는 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

export const addToCart = async (productId, quantity = 1) => {
  try {
    const response = await fetch(
      `${CART_API_URL}/items`,
      getFetchOptions('POST', { productId, quantity })
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '장바구니에 상품을 추가하는 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

export const updateCartItem = async (itemId, quantity) => {
  try {
    const response = await fetch(
      `${CART_API_URL}/items/${itemId}`,
      getFetchOptions('PUT', { quantity })
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '장바구니를 업데이트하는 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

export const removeFromCart = async (itemId) => {
  try {
    const response = await fetch(
      `${CART_API_URL}/items/${itemId}`,
      getFetchOptions('DELETE')
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '장바구니에서 상품을 제거하는 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

export const clearCart = async () => {
  try {
    const response = await fetch(`${CART_API_URL}`, getFetchOptions('DELETE'));
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '장바구니를 비우는 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

