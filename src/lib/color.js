// B.xxx/calendarColor.xxx가 CSS 변수(var(--c-xxx)) 문자열이 되면서
// 기존에 전역적으로 쓰이던 `${B.pants}44` 같은 hex-알파 접미사 패턴이
// 전부 유효하지 않은 CSS(`var(--c-pants)44`)가 됐다. alpha()는 그 호출부들을
// `rgba(var(--c-pants-rgb), 0.27)` 형태로 안전하게 변환해 주는 런타임 헬퍼다.
// var()가 아닌 일반 hex 리터럴이 들어오면 기존처럼 hex+알파 접미사로 동작해
// 하위 호환도 유지한다.
export function alpha(color, hexAlphaOrOpacity) {
  const isHexPair = typeof hexAlphaOrOpacity === 'string' && /^[0-9a-fA-F]{2}$/.test(hexAlphaOrOpacity);
  const op = isHexPair ? parseInt(hexAlphaOrOpacity, 16) / 255 : Number(hexAlphaOrOpacity);

  if (typeof color === 'string') {
    const m = /^var\((--[\w-]+)\)$/.exec(color.trim());
    if (m) return `rgba(var(${m[1]}-rgb), ${op.toFixed(3)})`;
    if (/^#[0-9a-fA-F]{6}$/.test(color) && isHexPair) return color + hexAlphaOrOpacity;
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color; // 숫자 opacity가 들어온 hex는 변환 못 하니 그대로
  }
  return color; // 알 수 없는 형식은 안전하게 원본 반환
}
