// 여러 파일(AiReport/CharacterPet/CoupleCalendar/CoupleTamagotchi/CustomCalendar/
// DayPanel/EmotionThermometer/WorkScheduleCalendar)에 거의 동일하게 중복돼 있던
// 날짜 ↔ "YYYY-MM-DD" 변환 로직을 한 곳으로 모은 것.

export function toIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isoAddDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toIso(d);
}

export function daysBetween(iso1, iso2) {
  return Math.round((new Date(iso2 + 'T00:00:00') - new Date(iso1 + 'T00:00:00')) / 86400000);
}
