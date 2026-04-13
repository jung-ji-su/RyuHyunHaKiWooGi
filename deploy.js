const fs = require('fs');
const { execSync } = require('child_process');

// 1. 버전 업데이트 (public/version.json)
const versionFilePath = './public/version.json';
const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));

// 현재 버전에서 마지막 숫자 올리기 (예: 1.0.1 -> 1.0.2)
const versionArray = versionData.version.split('.');
versionArray[2] = parseInt(versionArray[2]) + 1;
const newVersion = versionArray.join('.');

versionData.version = newVersion;
fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));

console.log(`🚀 버전을 업데이트했습니다: ${newVersion}`);

try {
  // 2. 리액트 빌드
  console.log('📦 빌드 중입니다... 잠시만 기다려 주세요.');
  execSync('npm run build', { stdio: 'inherit' });

  // 3. 파이어베이스 배포
  console.log('🔥 파이어베이스 배포 중...');
  execSync('firebase deploy', { stdio: 'inherit' });

  console.log(`✅ 배포 성공! 현재 버전: ${newVersion}`);
} catch (error) {
  console.error('❌ 배포 중 오류가 발생했습니다:', error.message);
}