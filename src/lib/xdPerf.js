// 크리스마스 장식/눈의 "저사양 기기" 판정 — 코어 4개 이하이거나 메모리 2GB 이하면 장식 개수를 줄인다.
// (둘 다 지원 안 하는 브라우저는 일반 사양으로 본다.) 모듈 로드 시 한 번만 계산.
export const IS_LITE_DEVICE = typeof navigator !== 'undefined'
  && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2);
