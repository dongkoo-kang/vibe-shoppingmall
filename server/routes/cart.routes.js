const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth.middleware');

// 모든 장바구니 라우트는 인증 필요
router.use(authenticate);

// 장바구니 조회
router.get('/', cartController.getCart);

// 장바구니에 상품 추가
router.post('/items', cartController.addToCart);

// 장바구니 상품 수량 변경
router.put('/items/:itemId', cartController.updateCartItem);

// 장바구니 상품 삭제
router.delete('/items/:itemId', cartController.removeFromCart);

// 장바구니 비우기
router.delete('/', cartController.clearCart);

module.exports = router;

