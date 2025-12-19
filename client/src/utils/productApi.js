const isDevelopment = import.meta.env.DEV;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const PRODUCT_API_URL = `${API_BASE_URL}/products`;

const getFetchOptions = (method = 'GET', body = null, auth = false) => {
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

export const fetchProducts = async (query = '') => {
  try {
    const response = await fetch(`${PRODUCT_API_URL}${query}`, getFetchOptions('GET'));
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '상품 목록을 불러오는 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

export const fetchProductById = async (id) => {
  try {
    const response = await fetch(`${PRODUCT_API_URL}/${id}`, getFetchOptions('GET'));
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '상품 정보를 불러오는 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

export const createProduct = async (productData) => {
  try {
    const response = await fetch(`${PRODUCT_API_URL}`, getFetchOptions('POST', productData, true));
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.message || (data.errors && data.errors[0]) || '상품 등록 중 오류가 발생했습니다.';
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

export const updateProduct = async (id, productData) => {
  try {
    const response = await fetch(`${PRODUCT_API_URL}/${id}`, getFetchOptions('PUT', productData, true));
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.message || (data.errors && data.errors[0]) || '상품 수정 중 오류가 발생했습니다.';
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

export const deleteProduct = async (id) => {
  try {
    const response = await fetch(`${PRODUCT_API_URL}/${id}`, getFetchOptions('DELETE', null, true));
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '상품 삭제 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};