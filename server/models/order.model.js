const mongoose = require('mongoose');

// 주문 항목 스키마
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, '상품 정보는 필수입니다.']
  },
  productName: {
    type: String,
    required: [true, '상품명은 필수입니다.']
  },
  productSku: {
    type: String,
    required: [true, '상품 코드는 필수입니다.']
  },
  quantity: {
    type: Number,
    required: [true, '수량은 필수입니다.'],
    min: [1, '수량은 1 이상이어야 합니다.']
  },
  unitPrice: {
    type: Number,
    required: [true, '단가는 필수입니다.'],
    min: [0, '단가는 0 이상이어야 합니다.']
  },
  subtotal: {
    type: Number,
    required: [true, '소계는 필수입니다.'],
    min: [0, '소계는 0 이상이어야 합니다.']
  }
}, { _id: true });

// 배송 정보 스키마
const shippingInfoSchema = new mongoose.Schema({
  recipientName: {
    type: String,
    required: [true, '수령인 이름은 필수입니다.'],
    trim: true,
    maxlength: [50, '수령인 이름은 50자 이하여야 합니다.']
  },
  recipientPhone: {
    type: String,
    required: [true, '수령인 전화번호는 필수입니다.'],
    trim: true,
    match: [/^[0-9-]+$/, '유효한 전화번호를 입력해주세요.']
  },
  postalCode: {
    type: String,
    required: [true, '우편번호는 필수입니다.'],
    trim: true
  },
  address1: {
    type: String,
    required: [true, '주소는 필수입니다.'],
    trim: true,
    maxlength: [200, '주소는 200자 이하여야 합니다.']
  },
  address2: {
    type: String,
    trim: true,
    maxlength: [200, '상세주소는 200자 이하여야 합니다.']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [50, '시/도는 50자 이하여야 합니다.']
  },
  country: {
    type: String,
    default: '대한민국',
    trim: true
  },
  deliveryRequest: {
    type: String,
    trim: true,
    maxlength: [200, '배송 요청사항은 200자 이하여야 합니다.']
  }
}, { _id: false });

// 결제 정보 스키마
const paymentInfoSchema = new mongoose.Schema({
  method: {
    type: String,
    required: [true, '결제 방법은 필수입니다.'],
    enum: {
      values: ['card', 'bank_transfer', 'virtual_account', 'mobile', 'kakao_pay', 'naver_pay', 'toss_pay'],
      message: '유효한 결제 방법을 선택해주세요.'
    }
  },
  status: {
    type: String,
    required: [true, '결제 상태는 필수입니다.'],
    enum: {
      values: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
      message: '유효한 결제 상태를 선택해주세요.'
    },
    default: 'pending'
  },
  amount: {
    type: Number,
    required: [true, '결제 금액은 필수입니다.'],
    min: [0, '결제 금액은 0 이상이어야 합니다.']
  },
  paidAt: {
    type: Date,
    default: null
  },
  transactionId: {
    type: String,
    trim: true
  },
  refundReason: {
    type: String,
    trim: true,
    maxlength: [500, '환불 사유는 500자 이하여야 합니다.']
  },
  refundedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

// 주문 스키마
const orderSchema = new mongoose.Schema({
  // 주문자 정보
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '주문자 정보는 필수입니다.']
  },
  
  // 주문 번호 (고유 번호, 자동 생성)
  orderNumber: {
    type: String,
    required: [true, '주문 번호는 필수입니다.'],
    unique: true,
    trim: true,
    uppercase: true
  },
  
  // 주문 상태
  status: {
    type: String,
    required: [true, '주문 상태는 필수입니다.'],
    enum: {
      values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      message: '유효한 주문 상태를 선택해주세요.'
    },
    default: 'pending'
  },
  
  // 주문 항목들
  items: {
    type: [orderItemSchema],
    required: [true, '주문 항목은 필수입니다.'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: '주문 항목은 최소 1개 이상이어야 합니다.'
    }
  },
  
  // 배송 정보
  shipping: {
    type: shippingInfoSchema,
    required: [true, '배송 정보는 필수입니다.']
  },
  
  // 결제 정보
  payment: {
    type: paymentInfoSchema,
    required: [true, '결제 정보는 필수입니다.']
  },
  
  // 금액 정보
  subtotal: {
    type: Number,
    required: [true, '상품 금액은 필수입니다.'],
    min: [0, '상품 금액은 0 이상이어야 합니다.']
  },
  shippingFee: {
    type: Number,
    default: 0,
    min: [0, '배송비는 0 이상이어야 합니다.']
  },
  totalAmount: {
    type: Number,
    required: [true, '총 금액은 필수입니다.'],
    min: [0, '총 금액은 0 이상이어야 합니다.']
  },
  
  // 주문 메모/요청사항
  orderNotes: {
    type: String,
    trim: true,
    maxlength: [500, '주문 메모는 500자 이하여야 합니다.']
  },
  
  // 배송 추적 번호
  trackingNumber: {
    type: String,
    trim: true
  },
  
  // 배송 시작일
  shippedAt: {
    type: Date,
    default: null
  },
  
  // 배송 완료일
  deliveredAt: {
    type: Date,
    default: null
  },
  
  // 취소/환불 정보
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelReason: {
    type: String,
    trim: true,
    maxlength: [500, '취소 사유는 500자 이하여야 합니다.']
  }
}, {
  timestamps: true, // createdAt, updatedAt 자동 생성
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 주문 번호 자동 생성 미들웨어
// validate 단계에서 주문 번호를 생성하여 required 검증을 통과하도록 함
orderSchema.pre('validate', async function(next) {
  if (this.orderNumber) return next();

  try {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const lastOrder = await this.constructor
      .findOne({ orderNumber: new RegExp(`^ORD-${dateStr}-`) })
      .sort({ orderNumber: -1 });

    let sequence = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const lastSequence = parseInt(lastOrder.orderNumber.slice(-6));
      if (!isNaN(lastSequence)) sequence = lastSequence + 1;
    }

    this.orderNumber = `ORD-${dateStr}-${String(sequence).padStart(6, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

// 총 금액 계산 미들웨어
orderSchema.pre('save', function(next) {
  // items의 subtotal 합계 계산
  const calculatedSubtotal = this.items.reduce((total, item) => {
    return total + (item.subtotal || 0);
  }, 0);
  
  // subtotal이 설정되지 않았거나 items가 변경된 경우 재계산
  if (!this.subtotal || Math.abs(this.subtotal - calculatedSubtotal) > 0.01) {
    this.subtotal = calculatedSubtotal;
  }
  
  // 총 금액 계산 (상품 금액 + 배송비)
  this.totalAmount = this.subtotal + this.shippingFee;
  
  // 결제 금액도 총 금액과 동일하게 설정 (결제 정보가 없는 경우)
  if (!this.payment || !this.payment.amount) {
    if (!this.payment) {
      this.payment = {};
    }
    this.payment.amount = this.totalAmount;
  }
  
  next();
});

// 주문 상태별 가상 속성
orderSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

orderSchema.virtual('isConfirmed').get(function() {
  return this.status === 'confirmed';
});

orderSchema.virtual('isProcessing').get(function() {
  return this.status === 'processing';
});

orderSchema.virtual('isShipped').get(function() {
  return this.status === 'shipped';
});

orderSchema.virtual('isDelivered').get(function() {
  return this.status === 'delivered';
});

orderSchema.virtual('isCancelled').get(function() {
  return this.status === 'cancelled';
});

orderSchema.virtual('isRefunded').get(function() {
  return this.status === 'refunded';
});

// 결제 완료 여부 확인 가상 속성
orderSchema.virtual('isPaid').get(function() {
  return this.payment && this.payment.status === 'completed';
});

// 인덱스 설정
orderSchema.index({ user: 1, createdAt: -1 }); // 사용자별 주문 조회
// orderNumber는 unique: true로 인덱스가 자동 생성됨
orderSchema.index({ status: 1, createdAt: -1 }); // 상태별 주문 조회
orderSchema.index({ 'payment.status': 1 }); // 결제 상태별 조회
orderSchema.index({ createdAt: -1 }); // 최신 주문 조회

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

