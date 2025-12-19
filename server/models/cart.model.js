const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, '상품 정보는 필수입니다.']
  },
  quantity: {
    type: Number,
    required: [true, '수량은 필수입니다.'],
    min: [1, '수량은 1 이상이어야 합니다.']
  },
  price: {
    type: Number,
    required: [true, '가격은 필수입니다.'],
    min: [0, '가격은 0 이상이어야 합니다.']
  }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '사용자 정보는 필수입니다.'],
    unique: true
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
    min: [0, '총 금액은 0 이상이어야 합니다.']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 총 금액 계산 미들웨어
cartSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  next();
});

// 상품 정보 populate
cartSchema.virtual('itemsWithProduct', {
  ref: 'Product',
  localField: 'items.product',
  foreignField: '_id'
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;

