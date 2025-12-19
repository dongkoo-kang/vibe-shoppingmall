const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

// 포트원(Iamport) 결제 검증을 위한 환경변수
const IAMPORT_API_KEY = process.env.IAMPORT_API_KEY;
const IAMPORT_API_SECRET = process.env.IAMPORT_API_SECRETKEY || process.env.IAMPORT_API_SECRET;

/**
 * 포트원 액세스 토큰 조회
 */
async function getIamportAccessToken() {
  if (!IAMPORT_API_KEY || !IAMPORT_API_SECRET) {
    throw new Error('포트원 API 키/시크릿이 설정되지 않았습니다. (IAMPORT_API_KEY, IAMPORT_API_SECRETKEY)');
  }

  const response = await fetch('https://api.iamport.kr/users/getToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imp_key: IAMPORT_API_KEY,
      imp_secret: IAMPORT_API_SECRET
    })
  });

  const data = await response.json();

  if (!response.ok || data.code !== 0) {
    throw new Error(data.message || '포트원 액세스 토큰 발급에 실패했습니다.');
  }

  return data.response.access_token;
}

/**
 * 포트원 결제 정보 조회
 * @param {string} impUid - 포트원 결제 고유 번호(imp_uid)
 */
async function getIamportPayment(impUid) {
  const accessToken = await getIamportAccessToken();

  const response = await fetch(`https://api.iamport.kr/payments/${impUid}`, {
    method: 'GET',
    headers: {
      'Authorization': accessToken
    }
  });

  const data = await response.json();

  if (!response.ok || data.code !== 0) {
    throw new Error(data.message || '포트원 결제 정보 조회에 실패했습니다.');
  }

  return data.response;
}

/**
 * 포트원 결제 검증
 * - 결제 상태가 paid 인지
 * - 결제 금액이 서버 계산 금액과 일치하는지
 */
async function verifyIamportPayment(impUid, expectedAmount) {
  const payment = await getIamportPayment(impUid);

  // 상태 검증 (paid 이어야 함)
  if (payment.status !== 'paid') {
    throw new Error(`포트원 결제 상태가 유효하지 않습니다. (status: ${payment.status})`);
  }

  // 금액 검증
  const paidAmount = Number(payment.amount || 0);
  if (Math.abs(paidAmount - Number(expectedAmount)) > 1) {
    throw new Error(`포트원 결제 금액이 주문 금액과 일치하지 않습니다. (결제 금액: ${paidAmount}, 주문 금액: ${expectedAmount})`);
  }

  return payment;
}

// 주문 생성 (장바구니에서)
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shipping, payment, orderNotes } = req.body;

    // 필수 필드 검증
    if (!shipping || !payment) {
      return res.status(400).json({
        success: false,
        message: '배송 정보와 결제 정보는 필수입니다.'
      });
    }

    // 장바구니 조회
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '장바구니가 비어있습니다.'
      });
    }

    // 재고 확인 및 주문 항목 생성
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.product;
      const quantity = cartItem.quantity;
      const currentStock = product.stock || 0;

      // 재고 확인
      if (currentStock < quantity) {
        return res.status(400).json({
          success: false,
          message: `상품 "${product.name}"의 재고가 부족합니다. (주문 수량: ${quantity}개 / 현재 재고: ${currentStock}개)`
        });
      }

      // 할인 가격 계산
      const hasDiscount = product.discount && product.discount.enabled === 1 && product.discount.rate > 0;
      const unitPrice = hasDiscount 
        ? Math.round(product.price * (1 - product.discount.rate / 100))
        : product.price;

      const itemSubtotal = unitPrice * quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: itemSubtotal
      });
    }

    // 배송비 계산 (기본 3000원)
    const shippingFee = 3000;
    const totalAmount = subtotal + shippingFee;

    // ===== 결제 검증 및 중복 주문 체크 =====
    // 1) 중복 주문 체크 (transactionId 기준)
    if (payment.transactionId) {
      const existingOrder = await Order.findOne({
        'payment.transactionId': payment.transactionId
      });

      if (existingOrder) {
        return res.status(409).json({
          success: false,
          message: '이미 처리된 주문입니다. (중복 결제 또는 새로고침으로 인한 재요청)',
          data: {
            orderId: existingOrder._id,
            orderNumber: existingOrder.orderNumber
          }
        });
      }
    }

    // 2) 포트원 결제 검증 (imp_uid 기반)
    //    - IAMPORT_API_KEY / IAMPORT_API_SECRETKEY 가 설정된 경우에만 수행
    if (IAMPORT_API_KEY && IAMPORT_API_SECRET && payment.transactionId) {
      try {
        await verifyIamportPayment(payment.transactionId, totalAmount);
      } catch (verifyError) {
        console.error('포트원 결제 검증 실패:', verifyError);
        return res.status(400).json({
          success: false,
          message: verifyError.message || '결제 검증에 실패했습니다.'
        });
      }
    }

    // 3) 기본 결제 상태 검증 (백업용)
    if (!payment.status || payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '결제가 완료되지 않은 주문입니다.'
      });
    }

    // 4) 기본 금액 검증 (클라이언트에서 전달한 금액과 서버 계산 금액 비교)
    if (payment.amount !== undefined && payment.amount !== null) {
      if (Math.abs(Number(payment.amount) - Number(totalAmount)) > 1) {
        return res.status(400).json({
          success: false,
          message: `결제 금액이 주문 금액과 일치하지 않습니다. (결제 금액: ${payment.amount}, 주문 금액: ${totalAmount})`
        });
      }
    }

    // 주문 생성
    // payment.paidAt이 문자열인 경우 Date 객체로 변환
    let paidAtDate = null;
    if (payment.paidAt) {
      if (payment.paidAt instanceof Date) {
        paidAtDate = payment.paidAt;
      } else if (typeof payment.paidAt === 'string') {
        paidAtDate = new Date(payment.paidAt);
        // 유효한 날짜인지 확인
        if (isNaN(paidAtDate.getTime())) {
          paidAtDate = new Date();
        }
      } else {
        paidAtDate = new Date();
      }
    } else {
      paidAtDate = new Date();
    }

    const order = new Order({
      user: userId,
      items: orderItems,
      shipping: shipping,
      payment: {
        method: payment.method || 'card',
        status: payment.status || 'completed',
        amount: totalAmount,
        paidAt: paidAtDate,
        transactionId: payment.transactionId || null
      },
      subtotal: subtotal,
      shippingFee: shippingFee,
      totalAmount: totalAmount,
      orderNotes: orderNotes || null
    });

    try {
      await order.save();
    } catch (saveError) {
      console.error('주문 저장 오류:', saveError);
      console.error('주문 데이터:', JSON.stringify(order, null, 2));
      throw saveError;
    }

    // 재고 차감
    for (const cartItem of cart.items) {
      const product = await Product.findById(cartItem.product._id);
      if (product) {
        product.stock -= cartItem.quantity;
        product.salesCount = (product.salesCount || 0) + cartItem.quantity;
        await product.save();
      }
    }

    // 장바구니 비우기
    cart.items = [];
    await cart.save();

    // 주문 정보 populate
    await order.populate('items.product');
    await order.populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: '주문이 생성되었습니다.',
      data: order
    });
  } catch (error) {
    console.error('주문 생성 오류 상세:', error);
    console.error('에러 스택:', error.stack);
    res.status(500).json({
      success: false,
      message: '주문 생성 중 오류가 발생했습니다.',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// 모든 주문 조회 (사용자별 또는 관리자 전체)
exports.getAllOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const filter = {};
    
    // 일반 사용자는 자신의 주문만 조회
    if (userRole !== 'admin') {
      filter.user = userId;
    }

    // 상태 필터링
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate('items.product', 'name image sku')
      .populate('user', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '주문 목록을 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 특정 주문 조회
exports.getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('items.product')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.'
      });
    }

    // 일반 사용자는 자신의 주문만 조회 가능
    if (userRole !== 'admin' && order.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '주문 조회 권한이 없습니다.'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '주문을 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 주문 번호로 조회
exports.getOrderByNumber = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() })
      .populate('items.product')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.'
      });
    }

    // 일반 사용자는 자신의 주문만 조회 가능
    if (userRole !== 'admin' && order.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '주문 조회 권한이 없습니다.'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '주문을 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 주문 수정
exports.updateOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;
    let updateData = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.'
      });
    }

    // 일반 사용자는 자신의 주문만 수정 가능 (단, 취소만 가능)
    if (userRole !== 'admin') {
      if (order.user.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: '주문 수정 권한이 없습니다.'
        });
      }
      // 일반 사용자는 배송 정보와 주문 메모만 수정 가능
      const allowedFields = ['shipping', 'orderNotes'];
      const filteredData = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });
      updateData = filteredData;
    }

    // 취소된 주문이나 배송 완료된 주문은 수정 불가
    if (order.status === 'cancelled' || order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: '취소되었거나 배송 완료된 주문은 수정할 수 없습니다.'
      });
    }

    Object.assign(order, updateData);
    await order.save();

    await order.populate('items.product');
    await order.populate('user', 'name email');

    res.json({
      success: true,
      message: '주문이 수정되었습니다.',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '주문 수정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 주문 상태 변경
exports.updateOrderStatus = async (req, res) => {
  try {
    const userRole = req.user.role;
    const { id } = req.params;
    const { status, trackingNumber, shippedAt, deliveredAt } = req.body;

    // 관리자만 주문 상태 변경 가능
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '주문 상태 변경 권한이 없습니다.'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: '주문 상태는 필수입니다.'
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.'
      });
    }

    order.status = status;

    // 배송 시작
    if (status === 'shipped' && trackingNumber) {
      order.trackingNumber = trackingNumber;
      order.shippedAt = shippedAt ? new Date(shippedAt) : new Date();
    }

    // 배송 완료
    if (status === 'delivered') {
      order.deliveredAt = deliveredAt ? new Date(deliveredAt) : new Date();
    }

    // 취소
    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      // 재고 복구
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          product.salesCount = Math.max(0, (product.salesCount || 0) - item.quantity);
          await product.save();
        }
      }
    }

    await order.save();

    await order.populate('items.product');
    await order.populate('user', 'name email');

    res.json({
      success: true,
      message: '주문 상태가 변경되었습니다.',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '주문 상태 변경 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 주문 취소 (사용자)
exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { cancelReason } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.'
      });
    }

    // 자신의 주문만 취소 가능
    if (order.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '주문 취소 권한이 없습니다.'
      });
    }

    // 이미 취소되었거나 배송 완료된 주문은 취소 불가
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '이미 취소된 주문입니다.'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: '배송 완료된 주문은 취소할 수 없습니다.'
      });
    }

    // 배송 중이거나 배송 완료 직전인 경우 취소 불가
    if (order.status === 'shipped') {
      return res.status(400).json({
        success: false,
        message: '배송 중인 주문은 취소할 수 없습니다. 고객센터로 문의해주세요.'
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    if (cancelReason) {
      order.cancelReason = cancelReason;
    }

    // 결제 상태도 취소로 변경
    if (order.payment) {
      order.payment.status = 'cancelled';
    }

    // 재고 복구
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        product.salesCount = Math.max(0, (product.salesCount || 0) - item.quantity);
        await product.save();
      }
    }

    await order.save();

    await order.populate('items.product');
    await order.populate('user', 'name email');

    res.json({
      success: true,
      message: '주문이 취소되었습니다.',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '주문 취소 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 주문 삭제 (관리자만)
exports.deleteOrder = async (req, res) => {
  try {
    const userRole = req.user.role;
    const { id } = req.params;

    // 관리자만 주문 삭제 가능
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '주문 삭제 권한이 없습니다.'
      });
    }

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '주문이 삭제되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '주문 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

