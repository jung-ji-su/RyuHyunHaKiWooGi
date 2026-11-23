import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'colorMode'; // 'light' | 'dark' | 'system'
// 시즌 테마(지금은 크리스마스뿐) — 라이트/다크와 직교한다. 시즌이 켜져 있어도 낮/밤(라이트/다크)은
// 그대로 고를 수 있고, CSS는 [data-theme] 위에 [data-season]을 겹쳐서 값만 덮어쓴다.
// 저장된 값이 없으면 크리스마스가 기본(시즌이 끝나면 더보기에서 끄거나 DEFAULT_SEASON을 'none'으로).
const SEASON_KEY = 'seasonTheme'; // 'christmas' | 'none'
const DEFAULT_SEASON = 'christmas';
const THEME_COLORS = {
  'none:light': '#7B4FA6',
  'none:dark': '#241F2E',
  'christmas:light': '#2F7A5F',
  'christmas:dark': '#14231F',
};

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveEffective(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return systemPrefersDark() ? 'dark' : 'light';
}

// data-theme 속성과 PWA 상태바 theme-color를 실제로 적용.
// transition=true면 전환 순간에만 .theme-transitioning을 붙여 부드럽게 바뀌게 한다.
function applyTheme(effective, season, { transition = false } = {}) {
  const root = document.documentElement;
  if (transition) {
    root.classList.add('theme-transitioning');
    window.setTimeout(() => root.classList.remove('theme-transitioning'), 300);
  }
  root.setAttribute('data-theme', effective);
  if (season && season !== 'none') root.setAttribute('data-season', season);
  else root.removeAttribute('data-season');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[`${season || 'none'}:${effective}`] || THEME_COLORS['none:light']);
}

// 라이트/다크/시스템 전환 — 기본값은 시스템 설정을 따라가고, 사용자가 수동으로
// 고르면 localStorage에 저장돼 다음 방문에도 유지된다. index.html의 동기 스크립트가
// React 마운트 전에 같은 로직으로 한 번 먼저 적용해 두므로 첫 페인트에 깜빡임이 없다.
export function useColorMode() {
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'system'; } catch { return 'system'; }
  });
  const [effective, setEffective] = useState(() => resolveEffective(mode));
  const [season, setSeasonState] = useState(() => {
    try { return localStorage.getItem(SEASON_KEY) || DEFAULT_SEASON; } catch { return DEFAULT_SEASON; }
  });

  useEffect(() => {
    const next = resolveEffective(mode);
    setEffective(next);
    applyTheme(next, season, { transition: true });
  }, [mode, season]);

  // mode가 'system'일 때만 OS 설정 변경을 실시간으로 반영
  useEffect(() => {
    if (mode !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = resolveEffective('system');
      setEffective(next);
      applyTheme(next, season, { transition: true });
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode, season]);

  const setMode = useCallback((next) => {
    setModeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);

  const setSeason = useCallback((next) => {
    setSeasonState(next);
    try { localStorage.setItem(SEASON_KEY, next); } catch { /* 저장 실패해도 이번 세션엔 적용됨 */ }
  }, []);

  return { mode, effective, setMode, season, setSeason };
}
