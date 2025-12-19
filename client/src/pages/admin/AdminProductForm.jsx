import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchProductById, createProduct, updateProduct } from '../../utils/productApi';
import './AdminProductForm.css';

const ORIGINS = ['브라질', '콜롬비아', '에티오피아', '케냐', '탄자니아AA', '탄자니아', '에티오피아 하라', '자마에키 블루 마운틴'];
const TYPES = ['원두', '분쇄원두', '드립'];
const SIZES = ['100g', '250g', '500g', '1kg', '2kg', 'BOX'];

// Cloudinary 환경 변수 (Vite 기준)
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

function AdminProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    price: '',
    stock: '',
    size: '',
    origin: '',
    type: '',
    body: 3,
    acidity: 3,
    roastLevel: '',
    tasteNote: '',
    description: '',
    image: '',
    saleStart: '',
    saleEnd: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [showSizeNotice, setShowSizeNotice] = useState(false);
  const [discountEnabled, setDiscountEnabled] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [eventEnabled, setEventEnabled] = useState(0);
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');

  // 관리자 권한 확인, Cloudinary 스크립트 로딩, 수정 모드일 때 상품 로딩
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!token || !user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    // Cloudinary 업로드 위젯 스크립트 로딩
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
      script.async = true;
      script.onload = () => {
        setIsWidgetReady(true);
      };
      script.onerror = () => {
        console.error('Cloudinary 위젯 로딩 실패');
      };
      document.body.appendChild(script);
    } else {
      setIsWidgetReady(true);
    }

    const loadProduct = async () => {
      try {
        if (isEditMode) {
          const res = await fetchProductById(id);
          const p = res.data;
          setFormData({
            sku: p.sku || '',
            name: p.name || '',
            price: p.price?.toString() || '',
            stock: p.stock?.toString() || '',
            size: p.size || '100g',
            origin: p.category?.origin || '',
            type: p.category?.type || '',
            body: p.body || 3,
            acidity: p.acidity || 3,
            roastLevel: p.roastLevel || '',
            tasteNote: p.tasteNote || '',
            description: p.description || '',
            image: p.image || '',
            saleStart: p.salePeriod?.start ? p.salePeriod.start.substring(0, 10) : '',
            saleEnd: p.salePeriod?.end ? p.salePeriod.end.substring(0, 10) : '',
          });
          if (!p.size) {
            setShowSizeNotice(true);
          }

          setDiscountEnabled(p.discount?.enabled ?? 0);
          setDiscountRate(p.discount?.rate ?? 0);
          setEventEnabled(p.event?.enabled ?? 0);
          setEventStart(p.event?.startDate ? p.event.startDate.substring(0, 10) : '');
          setEventEnd(p.event?.endDate ? p.event.endDate.substring(0, 10) : '');
        }
      } catch (error) {
        alert(error.message || '상품 정보를 불러오는 중 오류가 발생했습니다.');
        navigate('/admin/products');
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode) {
      loadProduct();
    } else {
      setLoading(false);
    }
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    if (value === '' || /^[0-9]+$/.test(value)) {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleRangeChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = '상품명을 입력해주세요.';
    if (!formData.sku.trim()) newErrors.sku = 'SKU(상품 코드)를 입력해주세요.';
    if (!formData.price) newErrors.price = '가격을 입력해주세요.';
    if (!formData.stock) newErrors.stock = '재고를 입력해주세요.';
    if (!formData.size) newErrors.size = '사이즈를 선택해주세요.';
    if (!formData.origin) newErrors.origin = '원산지를 선택해주세요.';
    if (!formData.type) newErrors.type = '종류를 선택해주세요.';
    if (!formData.image.trim()) newErrors.image = '이미지 URL을 입력해주세요.';

    if (discountEnabled === 1 && (!discountRate || discountRate <= 0)) {
      newErrors.discountRate = '할인이 활성화된 경우 1~100 사이의 할인율을 입력해주세요.';
    }

    if (eventEnabled === 1) {
      if (!eventStart || !eventEnd) {
        newErrors.event = '이벤트가 활성화된 경우 시작일과 종료일을 모두 선택해주세요.';
      } else if (new Date(eventStart) >= new Date(eventEnd)) {
        newErrors.event = '이벤트 종료일은 시작일보다 늦어야 합니다.';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      sku: formData.sku.trim(),
      name: formData.name.trim(),
      price: Number(formData.price),
      stock: Number(formData.stock),
      size: formData.size,
      category: {
        origin: formData.origin,
        type: formData.type,
      },
      body: Number(formData.body),
      acidity: Number(formData.acidity),
      image: formData.image.trim(),
      description: formData.description.trim() || null,
      salePeriod: {
        start: formData.saleStart ? new Date(formData.saleStart) : undefined,
        end: formData.saleEnd ? new Date(formData.saleEnd) : undefined,
      },
      discount: {
        enabled: discountEnabled,
        rate: Number(discountRate) || 0,
      },
      event: {
        enabled: eventEnabled,
        startDate: eventStart || null,
        endDate: eventEnd || null,
      },
    };

    try {
      if (isEditMode) {
        await updateProduct(id, payload);
        alert('상품이 수정되었습니다.');
      } else {
        await createProduct(payload);
        alert('상품이 등록되었습니다.');
      }
      navigate('/admin/products');
    } catch (error) {
      alert(error.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      navigate('/admin/products');
    } else {
      navigate('/admin');
    }
  };

  const handleAutoSku = () => {
    // 간단한 자동 SKU 생성 (날짜+시간 기반)
    const now = new Date();
    const auto = `COF${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now
      .getHours()
      .toString()
      .padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    setFormData((prev) => ({ ...prev, sku: auto }));
    setErrors((prev) => ({ ...prev, sku: '' }));
  };

  const handleOpenUploadWidget = () => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      alert('Cloudinary 설정이 필요합니다. .env 파일에 VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET 값을 설정해주세요.');
      return;
    }

    if (!isWidgetReady || !window.cloudinary) {
      alert('이미지 업로드 위젯을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url'],
        multiple: false,
        folder: 'products',
        maxFiles: 1,
      },
      (error, result) => {
        if (!error && result && result.event === 'success') {
          const url = result.info.secure_url;
          setFormData((prev) => ({ ...prev, image: url }));
          setErrors((prev) => ({ ...prev, image: '' }));
        } else if (error) {
          console.error('Cloudinary 업로드 오류:', error);
          alert('이미지 업로드 중 오류가 발생했습니다.');
        }
      }
    );

    widget.open();
  };

  if (loading) {
    return (
      <div className="admin-page-container">
        <div className="admin-page-inner">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-inner">
        <div className="admin-page-header">
          <button className="back-link" onClick={() => navigate('/admin/products')}>
            ← 상품 목록으로 돌아가기
          </button>
          <h1 className="admin-page-title">{isEditMode ? '상품 수정' : '새 상품 추가'}</h1>
        </div>

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            <div className="form-column">
              <div className="form-group">
                <label>
                  상품명 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="예: 에티오피아 예가체프"
                />
                {errors.name && <div className="error-message">{errors.name}</div>}
              </div>

              <div className="form-group">
                <label>
                  가격 (₩) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleNumberChange}
                  placeholder="예: 15000"
                />
                {errors.price && <div className="error-message">{errors.price}</div>}
              </div>

              <div className="form-group">
                <label>
                  원산지 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="origin"
                  list="origin-list"
                  value={formData.origin}
                  onChange={handleChange}
                  placeholder="예: 에티오피아"
                />
                <datalist id="origin-list">
                  {ORIGINS.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
                {errors.origin && <div className="error-message">{errors.origin}</div>}
              </div>

              <div className="form-group">
                <label>상품 설명</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="상품에 대한 상세 설명을 입력해주세요"
                  rows={5}
                />
              </div>
            </div>

            <div className="form-column">
              <div className="form-group sku-group">
                <label>
                  SKU (상품 코드) <span className="required">*</span>
                </label>
                <div className="sku-row">
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="예: COF2401A001"
                  />
                  <button type="button" className="sku-auto-btn" onClick={handleAutoSku}>
                    자동 생성
                  </button>
                </div>
                {errors.sku && <div className="error-message">{errors.sku}</div>}
              </div>

              <div className="form-group">
                <label>
                  재고 (개) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="stock"
                  value={formData.stock}
                  onChange={handleNumberChange}
                  placeholder="예: 25"
                />
                {errors.stock && <div className="error-message">{errors.stock}</div>}
              </div>

              <div className="form-group">
                <label>
                  사이즈 <span className="required">*</span>
                </label>
                <select name="size" value={formData.size} onChange={handleChange}>
                  <option value="">선택하세요</option>
                  {SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.size && <div className="error-message">{errors.size}</div>}
                {showSizeNotice && !errors.size && (
                  <div className="info-message">
                    기존에 등록된 상품입니다. 사이즈를 확인 후 필요하면 수정해주세요.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>
                  종류 <span className="required">*</span>
                </label>
                <select name="type" value={formData.type} onChange={handleChange}>
                  <option value="">선택하세요</option>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.type && <div className="error-message">{errors.type}</div>}
              </div>

              <div className="form-group">
                <label>
                  이미지 URL <span className="required">*</span>
                </label>
                <div className="image-upload-row">
                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="Cloudinary 업로드 또는 직접 URL 입력"
                  />
                  <button
                    type="button"
                    className="sku-auto-btn"
                    onClick={handleOpenUploadWidget}
                  >
                    이미지 업로드
                  </button>
                </div>
                {errors.image && <div className="error-message">{errors.image}</div>}
                {formData.image && (
                  <div className="image-preview">
                    <img src={formData.image} alt="상품 이미지 미리보기" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group slider-group">
              <label>바디감 (1~5)</label>
              <div className="slider-row">
                <input
                  type="range"
                  min="1"
                  max="5"
                  name="body"
                  value={formData.body}
                  onChange={handleRangeChange}
                />
                <span className="slider-value">{formData.body}</span>
              </div>
            </div>

            <div className="form-group slider-group">
              <label>산미 (1~5)</label>
              <div className="slider-row">
                <input
                  type="range"
                  min="1"
                  max="5"
                  name="acidity"
                  value={formData.acidity}
                  onChange={handleRangeChange}
                />
                <span className="slider-value">{formData.acidity}</span>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>할인 설정</label>
              <div className="toggle-row">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={discountEnabled === 1}
                    onChange={(e) => setDiscountEnabled(e.target.checked ? 1 : 0)}
                  />
                  <span>할인 적용</span>
                </label>
              </div>
              {discountEnabled === 1 && (
                <div className="discount-row">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(e.target.value)}
                    placeholder="할인율 (%)"
                  />
                  <span className="suffix">%</span>
                </div>
              )}
              {errors.discountRate && <div className="error-message">{errors.discountRate}</div>}
            </div>

            <div className="form-group">
              <label>이벤트 설정</label>
              <div className="toggle-row">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={eventEnabled === 1}
                    onChange={(e) => setEventEnabled(e.target.checked ? 1 : 0)}
                  />
                  <span>이벤트 적용</span>
                </label>
              </div>
              {eventEnabled === 1 && (
                <div className="event-dates">
                  <input
                    type="date"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                  />
                  <span className="tilde">~</span>
                  <input
                    type="date"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                  />
                </div>
              )}
              {errors.event && <div className="error-message">{errors.event}</div>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>판매 시작일</label>
              <input
                type="date"
                name="saleStart"
                value={formData.saleStart}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>판매 종료일</label>
              <input
                type="date"
                name="saleEnd"
                value={formData.saleEnd}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-btn"
              disabled={isSubmitting}
            >
              {isEditMode ? '상품 수정' : '상품 추가'}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminProductForm;

