const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: [true, '상품 코드(SKU)는 필수입니다.'],
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, '상품 이름은 필수입니다.'],
    trim: true,
    maxlength: [200, '상품 이름은 200자 이하여야 합니다.']
  },
  price: {
    type: Number,
    required: [true, '상품 가격은 필수입니다.'],
    min: [0, '상품 가격은 0 이상이어야 합니다.']
  },
  size: {
    type: String,
    required: [true, '사이즈는 필수입니다.'],
    enum: {
      values: ['100g', '250g', '500g', '1kg', '2kg', 'BOX'],
      message: '유효한 사이즈를 선택해주세요.'
    }
  },
  category: {
    origin: {
      type: String,
      required: [true, '원산지는 필수입니다.'],
      enum: {
        values: ['브라질', '콜롬비아', '에티오피아', '케냐', '탄자니아AA', '탄자니아', '에티오피아 하라', '자마에키 블루 마운틴'],
        message: '유효한 원산지를 선택해주세요.'
      }
    },
    type: {
      type: String,
      required: [true, '종류는 필수입니다.'],
      enum: {
        values: ['원두', '분쇄원두', '드립'],
        message: '유효한 종류를 선택해주세요.'
      }
    }
  },
  body: {
    type: Number,
    required: [true, '바디감은 필수입니다.'],
    min: [1, '바디감은 1 이상이어야 합니다.'],
    max: [5, '바디감은 5 이하여야 합니다.']
  },
  acidity: {
    type: Number,
    required: [true, '산미는 필수입니다.'],
    min: [1, '산미는 1 이상이어야 합니다.'],
    max: [5, '산미는 5 이하여야 합니다.']
  },
  image: {
    type: String,
    required: [true, '이미지는 필수입니다.'],
    trim: true
  },
  description: {
    type: String,
    default: null,
    trim: true
  },
  salePeriod: {
    start: {
      type: Date,
      default: Date.now
    },
    end: {
      type: Date,
      default: new Date('9999-12-31T23:59:59')
    }
  },
  discount: {
    enabled: {
      type: Number,
      enum: [0, 1],
      default: 0
    },
    rate: {
      type: Number,
      default: 0,
      min: [0, '할인율은 0 이상이어야 합니다.'],
      max: [100, '할인율은 100 이하여야 합니다.']
    }
  },
  event: {
    enabled: {
      type: Number,
      enum: [0, 1],
      default: 0
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    }
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, '재고는 0 이상이어야 합니다.']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  salesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 할인 가격 계산 가상 필드
productSchema.virtual('discountedPrice').get(function() {
  if (this.discount.enabled === 1 && this.discount.rate > 0) {
    return Math.round(this.price * (1 - this.discount.rate / 100));
  }
  return this.price;
});

// 이벤트 진행 중 여부 확인 가상 필드
productSchema.virtual('isEventActive').get(function() {
  if (this.event.enabled === 0) return false;
  const now = new Date();
  if (this.event.startDate && this.event.endDate) {
    return now >= this.event.startDate && now <= this.event.endDate;
  }
  return false;
});

// 판매 중 여부 확인 가상 필드
productSchema.virtual('isOnSale').get(function() {
  const now = new Date();
  return now >= this.salePeriod.start && now <= this.salePeriod.end && this.isActive;
});

// SKU 인덱스 생성
productSchema.index({ sku: 1 }, { unique: true });

// 검색을 위한 복합 인덱스
productSchema.index({ 'category.origin': 1, 'category.type': 1 });
productSchema.index({ isActive: 1, 'salePeriod.end': 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

