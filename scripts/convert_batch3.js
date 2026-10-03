const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname + '/..';

// buri 마스코트 일러스트 22장 — 실제 코드 전체를 grep/read로 전수 조사해
// 각 물리 파일이 사용되는 모든 위치(별칭이 파일마다 달라도 물리 파일 기준으로 통합)의
// 최대 표시 px를 구하고, 3배(@3x)한 값. 애매한 경우(원본 크기와 비슷한 경우 등)는
// 넉넉하게 올림 처리. 전부 투명 배경 PNG → alpha 보존 WebP.
const jobs = [
  ['src/assets/494ea37cf81a6a1efb5dfab1783ab487f604e7b0e6900f9ac53a43965300eb9a.png', 360], // buri1, max 120px (DrawingGame/OmokGame)
  ['src/assets/cc187d26dc66195eaea58cecb8a4acde7154249a3890514a43687a85e6b6cc82.png', 192], // buri2, max 64px (SecretLetter)
  ['src/assets/image.png', 168],                                                            // buri3, max 56px (HomePage)
  ['src/assets/KakaoTalk_20260316_132913765.png', 168],                                      // buri4, max 56px (DiaryWrite)
  ['src/assets/KakaoTalk_20260316_132923854.png', 120],                                      // buri5, max 38px (LoginScreen) — 여유있게
  ['src/assets/KakaoTalk_20260316_132934584.png', 450],                                      // buri6, max 150px (GlobalStyle .buri-float b2 아님, OmokGame/DrawingGame 150px)
  ['src/assets/KakaoTalk_20260316_132945257.png', 240],                                      // buri7, max 80px (GameWishList)
  ['src/assets/KakaoTalk_20260316_132954818.png', 240],                                      // buri8, max 80px (App.jsx)
  ['src/assets/KakaoTalk_20260316_133007779.png', 192],                                      // buri9, max 64px (ScheduleList) — AccountBook의 로컬 변수명 "buri9"는 실제론 buri6 물리파일이라 혼동 주의
  ['src/assets/KakaoTalk_20260424_173902015.png', 120],                                      // buriPig, max 38px (LoadingScreen) — 여유있게
  ['src/assets/KakaoTalk_20260424_173849579.png', 110],                                      // buriGirl, max 34px (LoadingScreen) — 여유있게(원본 91x112에 근접)
  ['src/assets/KakaoTalk_20260424_173840927.png', 300],                                      // buriTired, max 100px (GlobalStyle .buri-float.b4)
  ['src/assets/KakaoTalk_20260424_173832207.png', 450],                                      // buriShocked, max 150px (GlobalStyle .buri-float.b2)
  ['src/assets/KakaoTalk_20260424_173820661.png', 130],                                      // buriFire, max 42px (DiaryWrite 감정 피커, buriAngry 별칭) — 여유있게
  ['src/assets/KakaoTalk_20260424_173810950.png', 130],                                      // buriHeart, max 42px (DiaryWrite emotions) — 여유있게
  ['src/assets/KakaoTalk_20260424_173800871.png', 168],                                      // buriFlower, max 56px (HomePage/App.jsx)
  ['src/assets/KakaoTalk_20260424_173752880.png', 130],                                      // buriSmile, max 42px (DiaryWrite emotions) — 여유있게
  ['src/assets/KakaoTalk_20260424_173745257.png', 130],                                      // buriCry, max 42px (DiaryWrite emotions) — 여유있게
  ['src/assets/KakaoTalk_20260424_173734582.png', 130],                                      // buriClover, max 42px (DiaryWrite emotions) — 여유있게
  ['src/assets/KakaoTalk_20260424_173724362.png', 110],                                      // buriBeard, max 36px (LoadingScreen) — 여유있게
  ['src/assets/KakaoTalk_20260424_173712715.png', 200],                                      // buriTongue, max 66px (LoginScreen topBuris)
  ['src/assets/KakaoTalk_20260424_173657493.png', 270],                                      // buriCouple, max 90px (DiaryList empty state)
];

(async () => {
  let totalBefore = 0, totalAfter = 0;
  for (const [rel, target] of jobs) {
    const src = path.join(ROOT, rel);
    const dst = src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    const meta = await sharp(src).metadata();
    const resize = Math.max(meta.width, meta.height) > target;
    let pipeline = sharp(src).rotate(); // 일러스트라 EXIF 영향 없지만 안전하게 통일
    if (resize) {
      pipeline = pipeline.resize({ width: target, height: target, fit: 'inside', withoutEnlargement: true });
    }
    await pipeline.webp({ quality: 85, alphaQuality: 100 }).toFile(dst);
    const beforeSize = fs.statSync(src).size;
    const afterSize = fs.statSync(dst).size;
    totalBefore += beforeSize; totalAfter += afterSize;
    console.log(`${path.basename(rel)} (${meta.width}x${meta.height}) -> ${path.basename(dst)} | ${(beforeSize/1024).toFixed(0)}KB -> ${(afterSize/1024).toFixed(1)}KB`);
  }
  console.log(`\nTOTAL: ${(totalBefore/1024).toFixed(0)}KB -> ${(totalAfter/1024).toFixed(1)}KB (${(100 - totalAfter/totalBefore*100).toFixed(1)}% 감소)`);
})().catch(e => { console.error(e); process.exit(1); });
