const sharp = require('sharp');
const path = require('path');

const ROOT = 'C:/Users/jjsu9/OneDrive/바탕 화면/비둘기/TestFront';

// [파일, 목표 변 길이(px), alpha 보존 여부]
// 목표 = 실제 표시 최대 크기 * 3(@3x) — CharacterPet 72px→216px, 다마고치 74px→222px(224로 올림)
const jobs = [
  // CharacterPet.jsx 고양이 단계 이미지(실사진, 72px 표시 → 216px)
  ['src/assets/KakaoTalk_20260518_144322853.png', 216],
  ['src/assets/KakaoTalk_20260518_144429661.png', 216],
  ['src/assets/KakaoTalk_20260518_145359042.png', 216],
  ['src/assets/KakaoTalk_20260518_144400884.png', 216],
  ['src/assets/KakaoTalk_20260518_145513803.png', 216],
  ['src/assets/KakaoTalk_20260518_145131598.png', 216],
  // 다마고치 단계 이미지(public/assets, 74px 표시 → 224px)
  ['public/assets/1.hamzzi.png', 224],
  ['public/assets/2.hamzzi.png', 224],
  ['public/assets/3.hamzzi.png', 224],
  ['public/assets/4.hamzzi.png', 224],
  ['public/assets/5.hamzzi.png', 224],
];

(async () => {
  for (const [rel, target] of jobs) {
    const src = path.join(ROOT, rel);
    const dst = src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    const meta = await sharp(src).metadata();
    const resize = Math.max(meta.width, meta.height) > target;
    let pipeline = sharp(src).rotate(); // EXIF Orientation 반영(인자 없는 .rotate())
    if (resize) {
      pipeline = pipeline.resize({ width: target, height: target, fit: 'inside', withoutEnlargement: true });
    }
    await pipeline.webp({ quality: 85, alphaQuality: 100 }).toFile(dst);
    const fs = require('fs');
    const beforeSize = fs.statSync(src).size;
    const afterSize = fs.statSync(dst).size;
    console.log(`${rel} (${meta.width}x${meta.height}) -> ${path.basename(dst)} | ${(beforeSize/1024).toFixed(0)}KB -> ${(afterSize/1024).toFixed(1)}KB`);
  }
})().catch(e => { console.error(e); process.exit(1); });
