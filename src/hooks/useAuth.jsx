import { useState, useEffect } from 'react';
import { auth, functions } from '../firebase';
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

const verifyPinAndSignIn = httpsCallable(functions, 'verifyPinAndSignIn');

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      // uid는 커스텀 토큰 발급 시 "지수"/"현하" 문자열 그대로 고정 — 그 외(예: 예전 익명 세션의
      // 랜덤 uid)는 로그인 안 된 것으로 취급해 자연스럽게 다시 로그인 화면으로 보낸다.
      const uid = user?.uid;
      setCurrentUser(uid === '지수' || uid === '현하' ? uid : null);
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
