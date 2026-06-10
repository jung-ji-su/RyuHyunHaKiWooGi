const fs = require('fs');
const { execSync } = require('child_process');

// 1. 버전 업데이트 (public/version.json)
const versionFilePath = './public/version.json';
const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));

const versionArray = versionData.version.split('.');
versionArray[2] = parseInt(versionArray[2]) + 1;
const newVersion = versionArray.join('.');

versionData.version = newVersion;
fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));

// 2. changelog.json 업데이트 (public/changelog.json)
const changelogPath = './public/changelog.json';
let changelog = [];
try { changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8')); } catch {}

const notes = process.argv[2] || '';
changelog.unshift({
  version: newVersion,
  date: new Date().toISOString(),
  notes,
});
if (changelog.length > 30) changelog = changelog.slice(0, 30);
fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2));

console.log(`🚀 버전을 업데이트했습니다: ${newVersion}`);
if (notes) console.log(`📝 배포 메모: ${notes}`);

try {
  // 3. 리액트 빌드
  console.log('📦 빌드 중입니다... 잠시만 기다려 주세요.');
  execSync('npm run build', { stdio: 'inherit' });

  // 4. 파이어베이스 배포
  console.log('🔥 파이어베이스 배포 중...');
  execSync('firebase deploy', { stdio: 'inherit' });

  console.log(`✅ 배포 성공! 현재 버전: ${newVersion}`);
} catch (error) {
  console.error('❌ 배포 중 오류가 발생했습니다:', error.message);
}
