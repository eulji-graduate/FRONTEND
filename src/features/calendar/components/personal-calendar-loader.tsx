"use client";

export { PersonalCalendar as PersonalCalendarLoader } from "./personal-calendar";

/**
 * ⚠️ 예전엔 여기서 `next/dynamic({ ssr: false })`로 갈라 실었다 — `react-big-calendar`가
 *    무거워서였다(CLAUDE.md §최적화). 그 라이브러리를 걷어낸 뒤로는 `MonthGrid`가
 *    `date-fns` + Tailwind뿐이라 **가를 이유가 없어졌고**, 남겨 두니 청크 하나가 안 오면
 *    화면이 "불러오는 중"에서 영영 멈췄다(§정직성: 조용히 안 되는 척 금지).
 * ⚠️ 이 파일을 지우지 않고 다시 내보내기만 하는 건 부르는 쪽(`calendar-board.tsx`)의
 *    이름을 그대로 두기 위해서다 — 나중에 다시 갈라 실을 자리이기도 하다.
 */
