// 네컷 사진 프레임 — 이미지 에셋 없이 색/그라디언트/패턴/도형/문구 조합만으로 구성(canvas에서 그린다).
// ⚠️ 이미 저장된 사진은 합성본(WebP)이라 여기를 바꿔도 영향 없다. 단 진행 중인 둘이 찍기 문서에는 frame id가 들어가니
//    기존 id(pink/lavender/cream/black)는 지우거나 이름을 바꾸지 말 것(없는 id는 getFrame이 첫 프레임으로 대체).
//
// 프레임 필드(모두 선택, 기본값은 photoCompose.js):
//   group  'basic' | 'style' | 'season'          season: SEASONS 키(시즌 프레임만)
//   bg     [색…] 세로 그라디언트(1개면 단색)       pattern {type:'dots'|'stripes'|'check', color, size, alpha}
//   edge   색 | [색,색] 사진 테두리(배열이면 그라디언트)  edgeW 두께  radius 모서리  double {color,gap,w} 이중 테두리  shadow 사진 그림자
//   kind   'plain' | 'polaroid'(아래 여백 넓게) | 'film'(양옆 필름 구멍)
//   pad/gap/top/footerH  여백·사진 간격·위쪽 장식 띠 높이·아래 문구 영역 높이
//   ink    하단 글자색   font 'jua'|'serif'|'mono'   footer 'both'(이름+날짜)|'date'(날짜만)|'text'(문구만)   defaultText 기본 문구
//   deco   ['snow','lights','holly','stars','sakura', 'dots'…]  dot 모서리 점 색
export const FRAMES = [
  // ── 기본 ──
  { id: 'pink',     group: 'basic', name: '핑크',   bg: ['#FFD6E3', '#FFB8D0'], edge: '#FFFFFF', ink: '#8A2A52', dot: '#FFFFFF' },
  { id: 'lavender', group: 'basic', name: '라벤더', bg: ['#E6DBFF', '#C9B6F5'], edge: '#FFFFFF', ink: '#4B2E8F', dot: '#FFFFFF' },
  { id: 'cream',    group: 'basic', name: '크림',   bg: ['#FFF6E3'],            edge: '#F2D9A8', ink: '#7A5A1E', dot: '#F2D9A8' },
  { id: 'black',    group: 'basic', name: '블랙',   bg: ['#1D1B26'],            edge: '#FFFFFF', ink: '#F4F0FF', dot: '#FFD66B' },
  { id: 'mintdots', group: 'basic', name: '민트 도트', bg: ['#D9F5EC'], pattern: { type: 'dots', color: '#FFFFFF', size: 36, alpha: 0.9 }, edge: '#FFFFFF', ink: '#1F6B57' },

  // ── 스타일 ──
  { id: 'stripe',   group: 'style', name: '스트라이프', bg: ['#FFFFFF'], pattern: { type: 'stripes', color: '#BFD9FF', size: 34, alpha: 1 }, edge: '#FFFFFF', edgeW: 10, radius: 6, shadow: true, ink: '#2F5FA8' },
  { id: 'picnic',   group: 'style', name: '피크닉 체크', bg: ['#FFF3F0'], pattern: { type: 'check', color: '#FF9C9C', size: 44, alpha: 0.55 }, edge: '#FFFFFF', edgeW: 10, radius: 4, shadow: true, ink: '#B03A3A' },
  { id: 'sunset',   group: 'style', name: '선셋',   bg: ['#FFE0B8', '#FFB3C7', '#C6A6FF'], edge: ['#FFD27A', '#FF7FA8'], edgeW: 12, radius: 16, ink: '#6A2F63' },
  { id: 'rainbow',  group: 'style', name: '파스텔 무지개', bg: ['#FFFFFF'], edge: ['#FFB3C7', '#FFE08A', '#A8E6CF', '#A8C8FF'], edgeW: 14, radius: 18, ink: '#6B5B95' },
  { id: 'gold',     group: 'style', name: '골드 이중', bg: ['#14131A'], edge: ['#F6E3A1', '#C9962E', '#F6E3A1'], edgeW: 6, radius: 2, double: { color: '#C9962E', gap: 9, w: 3 }, ink: '#F2DC9B', font: 'serif', dot: '#C9962E' },
  { id: 'polaroid', group: 'style', name: '폴라로이드', kind: 'polaroid', bg: ['#FBF9F4'], edge: '#FBF9F4', edgeW: 0, radius: 2, shadow: true, ink: '#5B5348', font: 'serif', footer: 'both' },
  { id: 'film',     group: 'style', name: '필름',   kind: 'film', bg: ['#16151A'], edge: '#2B2A31', edgeW: 6, radius: 2, ink: '#FF9A3C', font: 'mono', footer: 'date' },
  { id: 'night',    group: 'style', name: '별밤',   bg: ['#141B3D', '#2B2B6B'], deco: ['stars'], edge: '#E9E6FF', ink: '#E9E6FF', dot: '#FFE08A' },

  // ── 시즌(해당 시즌 테마가 켜져 있거나 그 달에만 노출) ──
  { id: 'xmasred',   group: 'season', season: 'christmas', name: '크리스마스 레드', bg: ['#B3262B', '#8E1B22'], top: 96, deco: ['snow', 'lights', 'drift'], edge: '#FFF8EC', edgeW: 9, ink: '#FFF8EC', defaultText: 'Merry Christmas' },
  { id: 'xmasgreen', group: 'season', season: 'christmas', name: '크리스마스 그린', bg: ['#1F6B45', '#13472E'], deco: ['snow', 'holly', 'drift'], edge: '#FFF8EC', edgeW: 9, double: { color: '#E8C25A', gap: 9, w: 3 }, ink: '#FFF8EC', defaultText: 'Merry Christmas' },
  { id: 'newyear',   group: 'season', season: 'newyear',   name: '새해', bg: ['#10142E', '#252052'], deco: ['stars'], edge: ['#F6E3A1', '#C9962E'], edgeW: 8, ink: '#F6E3A1', font: 'serif', defaultText: 'Happy New Year' },
  { id: 'sakura',    group: 'season', season: 'spring',    name: '벚꽃', bg: ['#FFF0F5', '#FFD9E6'], deco: ['sakura'], edge: '#FFFFFF', edgeW: 10, radius: 18, ink: '#B24A74', defaultText: 'Spring with you' },
];

export const GROUPS = [
  { id: 'basic', name: '기본' },
  { id: 'style', name: '스타일' },
  { id: 'season', name: '시즌' },
];

// 시즌 정의: theme은 앱의 시즌 테마(data-season) 값, months는 노출 달. 새 시즌은 여기에 한 줄 + FRAMES에 프레임만 넣으면 된다.
export const SEASONS = {
  christmas: { name: '크리스마스', theme: 'christmas', months: [12] },
  newyear:   { name: '새해',       months: [1] },
  spring:    { name: '벚꽃',       months: [3, 4] },
};

const seasonOn = (key, seasonTheme, now) => {
  const s = SEASONS[key]; if (!s) return false;
  return (!!s.theme && s.theme === seasonTheme) || s.months.includes(now.getMonth() + 1);
};

// 지금 고를 수 있는 프레임(시즌 프레임은 기간/테마 조건). 이미 선택·진행 중인 프레임 id는 getFrame으로 항상 찾을 수 있다.
export const visibleFrames = (seasonTheme, now = new Date()) => FRAMES.filter((f) => !f.season || seasonOn(f.season, seasonTheme, now));

export const LAYOUTS = [
  { id: 'strip', name: '세로 4컷', cols: 1, rows: 4, cw: 640, ch: 480 },   // 사진 4:3 가로형
  { id: 'grid',  name: '2×2 격자', cols: 2, rows: 2, cw: 480, ch: 640 },   // 사진 3:4 세로형
];

export const getFrame = (id) => FRAMES.find((f) => f.id === id) || FRAMES[0];
export const getLayout = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
