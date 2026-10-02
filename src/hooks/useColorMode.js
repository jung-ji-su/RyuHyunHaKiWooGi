import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'colorMode'; // 'light' | 'dark' | 'system'
const LIGHT_THEME_COLOR = '#7B4FA6';
const DARK_THEME_COLOR = '#241F2E';

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
function applyTheme(effective, { transition = false } = {}) {
  const root = document.documentElement;
  if (transition) {
    root.classList.add('theme-transitioning');
    window.setTimeout(() => root.classList.remove('theme-transitioning'), 300);
  }
  root.setAttribute('data-theme', effective);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', effective === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

// 라이트/다크/시스템 전환 — 기본값은 시스템 설정을 따라가고, 사용자가 수동으로
// 고르면 localStorage에 저장돼 다음 방문에도 유지된다. index.html의 동기 스크립트가
// React 마운트 전에 같은 로직으로 한 번 먼저 적용해 두므로 첫 페인트에 깜빡임이 없다.
export function useColorMode() {
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'system'; } catch { return 'system'; }
  });
  const [effective, setEffective] = useState(() => resolveEffective(mode));

  useEffect(() => {
    const next = resolveEffective(mode);
    setEffective(next);
    applyTheme(next, { transition: true });
  }, [mode]);

  // mode가 'system'일 때만 OS 설정 변경을 실시간으로 반영
  useEffect(() => {
    if (mode !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = resolveEffective('system');
      setEffective(next);
      applyTheme(next, { transition: true });
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((next) => {
    setModeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);

  return { mode, effective, setMode };
}
