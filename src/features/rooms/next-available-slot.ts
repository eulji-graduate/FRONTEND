import { RESERVATION_DURATION_MINUTES } from "./constants";

/**
 * 우측 상단 "예약하기" 버튼이 여는 기본 슬롯 — 지금 시각을 30분 단위로 올려 잡는다.
 * ⚠️ 회의실·요일별 예약 현황은 안 본다 — 그건 예약 모달을 연 뒤 캘린더에서 이미 확인할 수 있고,
 *    이 계산은 "언제 열지"만 정한다(어느 회의실인지는 모달에서 고른다). 이 값은 **초기
 *    제안**일 뿐이다 — 모달이 직접 고를 수 있는 날짜·시간 피커를 열어 준다(2026-08-14).
 * ⚠️ **운영 시간 밖으로 밀어내는 로직은 없다**(2026-08-15, BE PR #523 — 회의실 운영시간
 *    개념 자체를 없앴다). 예전엔 09:00~18:00 밖이면 다음 날 09:00으로 넘겼는데, 이제 회의실은
 *    항상 이용 가능이라 그럴 이유가 없다 — 그냥 지금 시각을 30분 단위로 올림한 값을 그대로 쓴다.
 */
export function getNextAvailableSlot(now: Date): Date {
  const slot = new Date(now);
  slot.setSeconds(0, 0);

  const remainder = slot.getMinutes() % RESERVATION_DURATION_MINUTES;
  if (remainder !== 0) {
    slot.setMinutes(slot.getMinutes() + (RESERVATION_DURATION_MINUTES - remainder));
  }

  return slot;
}
