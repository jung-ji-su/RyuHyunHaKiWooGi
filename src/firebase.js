// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // ⭐ 인증(Auth) 기능 추가

const firebaseConfig = {
  apiKey: "AIzaSyA6AD1G7MZdzZJxzwmwVezJv4QSLBdItqI",
  authDomain: "ryuhyunhakiwoogi.firebaseapp.com",
  projectId: "ryuhyunhakiwoogi",
  storageBucket: "ryuhyunhakiwoogi.firebasestorage.app",
  messagingSenderId: "15019135528",
  appId: "1:15019135528:web:90b671a40d90eec8c89b1d",
  measurementId: "G-M9WCYQDPYV"
};

// 1. Firebase 초기화
const app = initializeApp(firebaseConfig);

// 2. 외부에서 쓸 수 있도록 'export' (이게 다 있어야 App.js에서 에러가 안 납니다)
export const db = getFirestore(app);     // 데이터베이스
export const storage = getStorage(app); // 스토리지 (나중에 혹시 쓸 수 있으니 유지)
export const auth = getAuth(app);       // ⭐ 인증 (App.js에서 로그인 체크할 때 필수!)