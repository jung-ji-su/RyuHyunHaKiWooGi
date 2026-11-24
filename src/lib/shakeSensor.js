// 흔들기 센서 + 권한 UX (모듈 싱글턴). 크리스마스 눈(SnowFall)이 마운트돼 있는 동안만 켜지고, 눈이 흔들기에 반응한다.
//
// 상태(state): idle(꺼짐/미시작) · unsupported(센서 API 없음) · needs(iOS식: 사용자가 켜기를 눌러야 함) · listening(켜짐)
//              · off(사용자가 끔) · denied(거부) · nosensor(켰는데 센서 값이 안 옴: 데스크톱 등)
// 권한 UX 원칙(프로토타입에서 정한 것):
//  - 로드 직후에 묻지 않는다. 더보기 드로어 시즌 테마 아래 "켜기" 칩을 사용자가 누른 순간에만 시스템 프롬프트(iOS는 사용자 제스처 필수).
//  - 거부하면 localStorage에 기록하고 다시 묻지 않는다(칩은 설정에서 켜는 방법만 안내). 이후엔 눈은 정상으로 내리고 흔들기만 안 된다.
//  - Android/Chrome처럼 권한이 필요 없는 환경은 바로 듣기 시작(끌 수 있음).
//  - 센서 값은 기기 안에서 흔들기 판정에만 쓰고 어디에도 저장/전송하지 않는다.
import { ShakeDetector } from './shakeDetector';

const KEY = 'shakeSensorPref';            // 'on' | 'off' | 'denied'
const SENSITIVITY = 1.3;                  // "가장 센 설정": 기본(1.0, 임계 10 m/s²)보다 예민하게(임계 ≈7.7) — 걷기/뛰기 오탐 방지는 방향 반전 조건이 맡는다
const STRENGTH_FLOOR = 0.6;               // 가장 약하게 흔들어도 강도 0.6 이상으로 터지게(감지 강도 0.2~1 → 0.68~1)
const NO_SENSOR_MS = 2500;

let state = 'idle';
const stateCbs = new Set(), shakeCbs = new Set();
let detector = null, bound = false, lastValid = 0, watchTimer = 0, started = false;

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* 저장 불가 환경은 무시 */ } };
const supported = () => typeof window !== 'undefined' && typeof DeviceMotionEvent !== 'undefined';
// 최신 데스크톱 크롬에도 requestPermission이 있어서 함수 유무만으로는 iOS를 구분할 수 없다 → iOS 계열/터치 기기일 때만 "권한 필요"
const needsPermission = () => {
  if (typeof DeviceMotionEvent === 'undefined' || typeof DeviceMotionEvent.requestPermission !== 'function') return false;
  const iosLike = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iosLike || navigator.maxTouchPoints > 0;
};
const setState = (s) => { if (state !== s) { state = s; stateCbs.forEach((f) => f()); } };

function onMotion(e) {
  const a = e.acceleration, g = e.accelerationIncludingGravity, t = (e.timeStamp || performance.now()) / 1000;
  let ev = null;
  if (a && a.x != null) { lastValid = performance.now(); ev = detector.push(t, a.x, a.y, a.z, false); }
  else if (g && g.x != null) { lastValid = performance.now(); ev = detector.push(t, g.x, g.y, g.z, true); }
  if (ev && !document.hidden) {
    const s = Math.min(1, STRENGTH_FLOOR + (1 - STRENGTH_FLOOR) * ev.strength);
    shakeCbs.forEach((f) => f({ dx: ev.dx, dy: ev.dy, s }));
  }
}
function bind() {
  if (!detector) { detector = new ShakeDetector(); detector.setSensitivity(SENSITIVITY); }
  if (!bound) { window.addEventListener('devicemotion', onMotion); bound = true; }
  detector.reset(); lastValid = 0; setState('listening');
  clearTimeout(watchTimer);
  // 켰는데도 값이 안 오면(센서 없음/iOS에서 권한이 다시 필요) 거짓으로 "켜짐"이라 하지 않는다
  watchTimer = setTimeout(() => { if (!lastValid && state === 'listening') { unbind(); setState(needsPermission() ? 'needs' : 'nosensor'); } }, NO_SENSOR_MS);
}
function unbind() { if (bound) { window.removeEventListener('devicemotion', onMotion); bound = false; } clearTimeout(watchTimer); }

export const getSensorState = () => state;
export const subscribeSensor = (cb) => { stateCbs.add(cb); return () => stateCbs.delete(cb); };
export const onShake = (cb) => { shakeCbs.add(cb); return () => shakeCbs.delete(cb); };

// 눈이 마운트될 때 호출. 권한 프롬프트는 절대 여기서 띄우지 않는다.
export function startSensor() {
  if (started) return; started = true;
  if (!supported()) { setState('unsupported'); return; }
  const pref = read();
  if (pref === 'denied') { setState('denied'); return; }
  if (pref === 'off') { setState('off'); return; }
  if (needsPermission()) {
    if (pref === 'on') bind();            // 이전에 허용했다면 일단 들어본다(iOS가 권한을 기억하면 값이 오고, 아니면 NO_SENSOR_MS 뒤 'needs')
    else setState('needs');
  } else bind();                          // 권한이 필요 없는 환경은 바로 듣기
}
export function stopSensor() { started = false; unbind(); setState('idle'); }

// 사용자가 "켜기"를 누를 때만(사용자 제스처 안에서) 호출
export async function enableSensor() {
  if (!supported()) { setState('unsupported'); return; }
  if (needsPermission()) {
    try {
      const r = await DeviceMotionEvent.requestPermission();
      if (r === 'granted') { write('on'); bind(); } else { write('denied'); setState('denied'); }
    } catch { write('denied'); setState('denied'); }
  } else { write('on'); bind(); }
}
export function disableSensor() { write('off'); unbind(); setState('off'); }
