const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// 모든 사용자 조회
router.get('/', userController.getAllUsers);

// 특정 사용자 조회
router.get('/:id', userController.getUserById);

// 회원가입 (사용자 생성)
router.post('/', userController.createUser);

// 로그인
router.post('/login', userController.login);

// 비밀번호 초기화
router.post('/reset-password', userController.resetPassword);

// 사용자 정보 수정 (전체 업데이트)
router.put('/:id', userController.updateUser);

// 사용자 정보 부분 수정
router.patch('/:id', userController.patchUser);

// 비밀번호 변경
router.patch('/:id/password', userController.changePassword);

// 사용자 삭제
router.delete('/:id', userController.deleteUser);

module.exports = router;

