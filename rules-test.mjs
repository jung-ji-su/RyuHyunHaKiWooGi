// 보안 규칙 에뮬레이터 테스트(라이브에 영향 없음). 실행: JDK 21 필요
//   firebase emulators:exec --only firestore --project demo-rules "node rules-test.mjs"
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';
const env = await initializeTestEnvironment({ projectId: 'demo-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
const js = env.authenticatedContext('jisu').firestore();
const hy = env.authenticatedContext('hyunha').firestore();
const oldKo = env.authenticatedContext('지수').firestore();   // 예전 한글 uid 세션은 이제 거부돼야 한다
const other = env.authenticatedContext('stranger').firestore();
const anon = env.unauthenticatedContext().firestore();
const r = [];
const t = async (name, exp, p) => { try { await (exp ? assertSucceeds(p) : assertFails(p)); r.push('PASS ' + name); } catch (e) { r.push('FAIL ' + name + ' -> ' + String(e.message).slice(0, 80)); } };
await t('jisu diaries 쓰기 허용', true, setDoc(doc(js, 'diaries/a'), { x: 1 }));
await t('hyunha diaries 읽기 허용', true, getDoc(doc(hy, 'diaries/a')));
await t('jisu 하위 컬렉션 쓰기 허용', true, setDoc(doc(js, 'diaries/a/comments/c1'), { x: 1 }));
await t('hyunha photobooth 읽기 허용', true, getDoc(doc(hy, 'photobooth/p')));
await t('hyunha photoboothPending 쓰기 허용', true, setDoc(doc(hy, 'photoboothPending/active'), { x: 1 }));
await t('jisu buckets 쓰기 허용', true, setDoc(doc(js, 'buckets/b'), { x: 1 }));
await t('제3자 diaries 읽기 차단', false, getDoc(doc(other, 'diaries/a')));
await t('제3자 diaries 쓰기 차단', false, setDoc(doc(other, 'diaries/z'), { x: 1 }));
await t('비로그인 diaries 읽기 차단', false, getDoc(doc(anon, 'diaries/a')));
await t('예전 한글 uid 읽기 차단', false, getDoc(doc(oldKo, 'diaries/a')));
await t('jisu authAttempts 쓰기 차단', false, setDoc(doc(js, 'authAttempts/jisu'), { count: 0 }));
await t('jisu authAttempts 읽기 차단', false, getDoc(doc(js, 'authAttempts/jisu')));
await t('hyunha authAttempts 쓰기 차단', false, setDoc(doc(hy, 'authAttempts/hyunha'), { count: 0 }));
await t('authAttempts 하위 문서도 차단', false, setDoc(doc(js, 'authAttempts/jisu/x/y'), { a: 1 }));
console.log(r.join('\n'));
await env.cleanup();
process.exit(r.some((x) => x.startsWith('FAIL')) ? 1 : 0);
