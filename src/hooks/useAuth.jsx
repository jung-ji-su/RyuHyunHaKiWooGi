import { useState, useEffect } from 'react';
import { auth, functions } from '../firebase';
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

const verifyPinAndSignIn = httpsCallable(functions, 'verifyPinAndSignIn');
const UID_TO_NAME = { jisu: '지수', hyunha: '현하' };   // functions/index.js의 AUTH_UID와 같은 표

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      // uid는 커스텀 토큰 발급 시 ASCII('jisu'/'hyunha')로 고정하고, 화면/데이터에서 쓰는 이름("지수"/"현하")으로 바꿔 쓴다.
      // 그 외(예전 한글 uid 세션, 더 예전 익명 세션의 랜덤 uid)는 로그인 안 된 것으로 보고 세션도 지워서
      // 로그인 화면으로 보낸다 → PIN으로 다시 로그인하면 새 uid가 발급된다.
      const name = UID_TO_NAME[user?.uid] ?? null;
      setCurrentUser(name);
      if (user && !name) signOut(auth).catch(() => {});
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // PIN은 서버(Cloud Function)에서만 검증한다 — 클라이언트는 그 결과(커스텀 토큰)만 받는다.
  const login = async (role, pin) => {
    try {
      const result = await verifyPinAndSignIn({ user: role, pin });
      await signInWithCustomToken(auth, result.data.token);
      return { ok: true };
    } catch (e) {
      const code = e?.code || '';
      if (code.includes('resource-exhausted')) {
        return { ok: false, locked: true, message: e.message };
      }
      // PIN 불일치(permission-denied)와 서버 쪽 문제(internal 등)를 구분 —
      // 둘 다 같은 "PIN 틀림" 메시지로 뭉개면 실제 서버 장애를 PIN 오타로 오인하게 됨.
      if (!code.includes('permission-denied')) {
        return { ok: false, locked: false, serverError: true, message: e?.message || '서버 오류가 발생했어요.' };
      }
      return { ok: false, locked: false, message: e?.message || '로그인에 실패했어요.' };
    }
  };

  const logout = async () => {
    if (window.confirm("사용자를 전환하시겠습니까?")) {
      await signOut(auth);
      setCurrentUser(null);
      window.location.reload();
    }
  };

  return { currentUser, loading, login, logout };
}
