import { NOTIFICATION_TYPE } from "@/constants/notification";

import { LOCAL_NOTIFICATION_KIND } from "./types";

/**
 * 종 항목을 눌렀을 때 갈 곳 — **그 회의·공지 상세가 아니라 목록 화면이다.**
 *
 * ⚠️ **BE가 실제로 어떤 회의·공지인지는 몰라도 된다.** 알림 자체엔 대상 id가 실려 오지만
 *    (`event.ts`), 그 상세로 바로 보내는 대신 종류별 목록 화면(내 회의 · 공지사항)으로만
 *    보낸다 — 팀이 이렇게 정했다(2026-08-16, #602 후속).
 * ⚠️ **사이드바 안 읽음 점도 같은 맵을 쓴다**(`role-sidebar.tsx`). "이 항목이 안 읽은
 *    알림과 같은 곳을 가리키는가"를 이 맵 하나로 판정해야 종 목록·사이드바가 서로 다른
 *    말을 안 한다.
 */
export const NOTIFICATION_DESTINATION: Record<string, string> = {
  [NOTIFICATION_TYPE.MEETING_CREATED]: "/app/meeting",
  [NOTIFICATION_TYPE.MEETING_REMINDER]: "/app/meeting",
  [NOTIFICATION_TYPE.MEETING_CANCELED]: "/app/meeting",
  [NOTIFICATION_TYPE.NOTICE_CREATED]: "/app/notice",
  /* SSE가 아니라 `/me` 조회값에서 프론트가 합성해 넣은 항목(`notification-provider.tsx`) */
  [LOCAL_NOTIFICATION_KIND.PASSWORD_TEMP]: "/app/me",
};
