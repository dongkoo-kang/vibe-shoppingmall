// 임의의 문자와 숫자 조합 8자리 비밀번호 생성
exports.generateRandomPassword = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const allChars = letters + numbers;
  
  let password = '';
  
  // 최소 1개의 숫자와 1개의 문자를 포함하도록 보장
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += letters.charAt(Math.floor(Math.random() * letters.length));
  
  // 나머지 6자리 랜덤 생성
  for (let i = 2; i < 8; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // 비밀번호를 섞어서 랜덤하게 배치
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

