import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signInAnonymously, updateProfile, signOut } from 'firebase/auth';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user?.displayName || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (role) => {
    if (role === "지수") {
      const pw = window.prompt("왜 내꺼로 로그인 하세여???");
      if (pw !== import.meta.env.VITE_PW_JISU) {
        alert("[WARNING]👹👹👹류현하 침입 시도 감지!!!👹👹👹");
        return;
      }
    }
    if (role === "현하") {
      const pw = window.prompt("🔒 현하님 비밀번호를 입력하세요");
      if (pw !== import.meta.env.VITE_PW_HYUNHA) {
        alert("❌ 비밀번호가 틀렸습니다!");
        return;
      }
    }
    try {
      setLoading(true);
      const uc = await signInAnonymously(auth);
      await updateProfile(uc.user, { displayName: role });
      setCurrentUser(role);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
