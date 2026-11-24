// 일기 → 햄찌 먹이 보너스 (2026-11-24)
//
// 오늘(서울 기준 날짜) "내가" 쓴 일기 1편당 밥 +1회, 간식 +1회. 하루 최대 DIARY_BONUS_CAP편까지만 인정.
//  - 각자 자기 일기만 자기 펫에게 적용된다(상대 일기는 해당 없음).
//  - 보너스는 저장하지 않고 diaries 컬렉션에서 매번 "오늘 내가 쓴 편수"로 계산한다 → 일기를 지우면 자동으로 줄고,
//    쓰고-지우고-쓰기를 반복해도 오늘 편수 상한(2)을 넘길 수 없다(이미 먹인 건 되돌리지 않음).
//  - createdAt(서버 시각) 기준이라 날짜를 거꾸로 적어 보너스를 늘릴 수 없다.
//  - 복합 인덱스가 필요 없도록 createdAt 내림차순 최근 N건만 읽고 클라이언트에서 거른다(DiaryList와 같은 단일 필드 정렬).
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { toIso } from './date';

export const DIARY_BONUS_CAP = 2;
const RECENT_LIMIT = 40; // 하루에 이만큼 넘게 쓰는 일은 없다고 보고 최근 40건만 본다

export const diaryBonusFor = (todayCount) => Math.max(0, Math.min(DIARY_BONUS_CAP, todayCount || 0));

// 오늘 user가 쓴 일기 편수. 읽기에 실패하면 0(보너스 없음)으로 안전하게 처리.
export async function fetchTodayDiaryCount(db, user, today = toIso()) {
  try {
    const snap = await getDocs(query(collection(db, 'diaries'), orderBy('createdAt', 'desc'), limit(RECENT_LIMIT)));
    let n = 0;
    snap.forEach((d) => {
      const x = d.data();
      const t = x.createdAt?.toDate ? x.createdAt.toDate() : null;
      if (x.author === user && t && toIso(t) === today) n++;
    });
    return n;
  } catch (e) {
    console.error('오늘 일기 편수 조회 실패:', e);
    return 0;
  }
}
