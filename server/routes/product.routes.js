const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

// ============================================
// 공개 라우트 (인증 불필요)
// ============================================

// 모든 상품 조회 (필터링, 정렬, 페이지네이션 지원)
// GET /api/products?origin=브라질&type=원두&page=1&limit=10
router.get('/', productController.getAllProducts);

// SKU로 상품 조회
// GET /api/products/sku/COFFEE001
router.get('/sku/:sku', productController.getProductBySku);

// 특정 상품 조회 (조회수 자동 증가)
// GET /api/products/:id
router.get('/:id', productController.getProductById);

// ============================================
// 관리자 전용 라우트 (인증 + 관리자 권한 필요)
// ============================================

// 상품 생성 (Create)
// POST /api/products
// Headers: Authorization: Bearer <token>
router.post('/', authenticate, isAdmin, productController.createProduct);

// 상품 정보 전체 수정 (Update)
// PUT /api/products/:id
// Headers: Authorization: Bearer <token>
router.put('/:id', authenticate, isAdmin, productController.updateProduct);

// 상품 정보 부분 수정 (Update)
// PATCH /api/products/:id
// Headers: Authorization: Bearer <token>
router.patch('/:id', authenticate, isAdmin, productController.patchProduct);

// 상품 삭제 (Delete)
// DELETE /api/products/:id
// Headers: Authorization: Bearer <token>
router.delete('/:id', authenticate, isAdmin, productController.deleteProduct);

module.exports = router;

