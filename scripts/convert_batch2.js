const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname + '/..';

// JS.jpg/HY.jpg: 로그인 화면 아바타(88px, LoginScreen.jsx)가 코드 전체에서 가장 큰
// 표시 크기였다 — DiaryList(42/28px)·ScheduleList(18px)보다 큼. 3x = 264px.
const jobs = [
  ['src/assets/JS.jpg', 264],
  ['src/assets/HY.jpg', 264],
];

(async () => {
  for (const [rel, target] of jobs) {
    const src = path.join(ROOT, rel);
    const dst = src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    const meta = await sharp(src).metadata();
    // .rotate() 인자 없이 호출하면 EXIF Orientation 태그를 읽어 픽셀을 실제로 맞춰 돌리고
    // 태그를 지운다 — 이걸 안 하면 sharp가 원본 raw 픽셀 그대로 리사이즈해서(EXIF 무시)
    // 세로로 찍은 사진이 가로로 눕는다(브라우저 <img>는 EXIF를 반영해 정방향으로 보여주므로
    // 원본 jpg를 그냥 볼 때는 안 보이는 문제).
    await sharp(src)
      .rotate()
      .resize({ width: target, height: target, fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(dst);
    const beforeSize = fs.statSync(src).size;
    const afterSize = fs.statSync(dst).size;
    console.log(`${rel} (${meta.width}x${meta.height}) -> ${path.basename(dst)} | ${(beforeSize/1024).toFixed(0)}KB -> ${(afterSize/1024).toFixed(1)}KB`);
  }
})().catch(e => { console.error(e); process.exit(1); });
