const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

// 장바구니 조회
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }
    
    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '장바구니를 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 장바구니에 상품 추가
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: '상품 ID는 필수입니다.'
      });
    }
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.'
      });
    }

    // 재고 확인: 재고가 1개 미만이면 장바구니에 추가 불가
    const requestQty = parseInt(quantity);
    if (!Number.isFinite(requestQty) || requestQty < 1) {
      return res.status(400).json({
        success: false,
        message: '수량은 1 이상이어야 합니다.'
      });
    }

    if (!Number.isFinite(product.stock) || product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: '재고가 없는 상품은 장바구니에 추가할 수 없습니다.'
      });
    }
    
    let cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }
    
    // 할인 가격 계산
    const hasDiscount = product.discount && product.discount.enabled === 1 && product.discount.rate > 0;
    const itemPrice = hasDiscount 
      ? Math.round(product.price * (1 - product.discount.rate / 100))
      : product.price;
    
    // 이미 장바구니에 있는 상품인지 확인
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );
    
    if (existingItemIndex > -1) {
      // 기존 상품 수량 증가 시 재고 확인
      const currentQty = cart.items[existingItemIndex].quantity || 0;
      const newQty = currentQty + requestQty;

      if (newQty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `재고가 부족합니다. (현재 재고: ${product.stock}개, 요청 수량: ${newQty}개)`
        });
      }

      cart.items[existingItemIndex].quantity = newQty;
      cart.items[existingItemIndex].price = itemPrice;
    } else {
      // 새 상품 추가 시 재고 확인
      if (requestQty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `재고가 부족합니다. (현재 재고: ${product.stock}개, 요청 수량: ${requestQty}개)`
        });
      }

      cart.items.push({
        product: productId,
        quantity: requestQty,
        price: itemPrice
      });
    }
    
    await cart.save();
    await cart.populate('items.product');
    
    res.json({
      success: true,
      message: '장바구니에 상품이 추가되었습니다.',
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '장바구니에 상품을 추가하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 장바구니 상품 수량 변경
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: '수량은 1 이상이어야 합니다.'
      });
    }
    
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: '장바구니를 찾을 수 없습니다.'
      });
    }
    
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: '장바구니 항목을 찾을 수 없습니다.'
      });
    }

    // 관련 상품 정보 조회 (populate 되어 있지 않은 경우를 대비)
    let product = item.product;
    if (!product || !product.stock) {
      product = await Product.findById(item.product);
    }

    // 재고 확인
    if (product && Number.isFinite(product.stock)) {
      if (quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `재고가 부족합니다. (현재 재고: ${product.stock}개, 요청 수량: ${quantity}개)`
        });
      }

      if (product.stock <= 0) {
        return res.status(400).json({
          success: false,
          message: '재고가 없는 상품은 주문할 수 없습니다.'
        });
      }
    }
    
    item.quantity = parseInt(quantity);
    await cart.save();
    await cart.populate('items.product');
    
    res.json({
      success: true,
      message: '장바구니가 업데이트되었습니다.',
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '장바구니를 업데이트하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 장바구니 상품 삭제
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: '장바구니를 찾을 수 없습니다.'
      });
    }
    
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();
    await cart.populate('items.product');
    
    res.json({
      success: true,
      message: '장바구니에서 상품이 제거되었습니다.',
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '장바구니에서 상품을 제거하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 장바구니 비우기
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: '장바구니를 찾을 수 없습니다.'
      });
    }
    
    cart.items = [];
    await cart.save();
    
    res.json({
      success: true,
      message: '장바구니가 비워졌습니다.',
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '장바구니를 비우는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

