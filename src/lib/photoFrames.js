// 네컷 사진 프레임 — 이미지 에셋 없이 색/그라디언트/문구만으로 구성(canvas에서 그린다).
// bg: 세로 그라디언트 색 목록(1개면 단색), edge: 사진 테두리색, ink: 하단 글자색, dot: 모서리 장식 점 색(없으면 생략)
export const FRAMES = [
  { id: 'pink',     name: '핑크',     bg: ['#FFD6E3', '#FFB8D0'], edge: '#FFFFFF', ink: '#8A2A52', dot: '#FFFFFF' },
  { id: 'lavender', name: '라벤더',   bg: ['#E6DBFF', '#C9B6F5'], edge: '#FFFFFF', ink: '#4B2E8F', dot: '#FFFFFF' },
  { id: 'cream',    name: '크림',     bg: ['#FFF6E3'],            edge: '#F2D9A8', ink: '#7A5A1E', dot: '#F2D9A8' },
  { id: 'black',    name: '블랙',     bg: ['#1D1B26'],            edge: '#FFFFFF', ink: '#F4F0FF', dot: '#FFD66B' },
];

export const LAYOUTS = [
  { id: 'strip', name: '세로 4컷', cols: 1, rows: 4, cw: 640, ch: 480 },   // 사진 4:3 가로형
  { id: 'grid',  name: '2×2 격자', cols: 2, rows: 2, cw: 480, ch: 640 },   // 사진 3:4 세로형
];

export const getFrame = (id) => FRAMES.find((f) => f.id === id) || FRAMES[0];
export const getLayout = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
