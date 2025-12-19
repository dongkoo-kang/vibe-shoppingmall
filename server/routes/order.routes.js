const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

// 모든 주문 라우트는 인증 필요
router.use(authenticate);

// 주문 생성
router.post('/', orderController.createOrder);

// 모든 주문 조회
router.get('/', orderController.getAllOrders);

// 주문 번호로 조회
router.get('/number/:orderNumber', orderController.getOrderByNumber);

// 특정 주문 조회
router.get('/:id', orderController.getOrderById);

// 주문 수정
router.put('/:id', orderController.updateOrder);

// 주문 상태 변경 (관리자 전용)
router.patch('/:id/status', isAdmin, orderController.updateOrderStatus);

// 주문 취소 (사용자)
router.patch('/:id/cancel', orderController.cancelOrder);

// 주문 삭제 (관리자 전용)
router.delete('/:id', isAdmin, orderController.deleteOrder);

module.exports = router;

