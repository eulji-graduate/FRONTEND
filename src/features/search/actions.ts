"use server";

import type { SearchKind } from "./types";

/*
  ⚠️ **최근 "검색어" 기록은 서버 액션이 아니다**(2026-08-18, #422 후속). BE에 기록·조회 API가
     없어 실서버 호출은 늘 404였고, 목도 서버 메모리(재시작하면 사라짐)를 DB인 척 흉내 냈을
     뿐이다 — 그래서 로컬 저장소로 옮겼다(`lib/recent-search-storage.ts`, `search-input.tsx`가
     직접 부른다). 여기 남기면 "서버가 기록하는 것"으로 오해한다(§정직성).
*/

/**
 * 최근 본 항목 기록 — 검색/랜딩에서 결과 하나를 열 때(지금은 프로젝트만 실제 이동이라
 * 프로젝트 클릭에서만 불린다, `record-view-link.tsx`) 클라이언트가 부른다.
 * ⚠️ **이동을 막지 않는다.** 링크를 누른 김에 fire-and-forget으로 보내는 부가 기록이라,
 *    실패해도 페이지 이동은 그대로 진행된다.
 * ⚠️ 목엔 대응하는 저장소가 없다 — `SearchHome.recentlyViewed`가 정적 목이라 클릭해도
 *    안 바뀐다(§정직한 목업: 없는 걸 있는 척 안 한다).
 */
/*
  ⚠️ **`POST /api/v1/search/recent-views`도 BE에 없다.** 링크를 누를 때마다 404를 한 번씩
     내고 삼키느니 아무것도 안 보낸다.
  ⚠️ **호출부(`record-view-link.tsx`)와 인자는 그대로 둔다.** 기록이 되살아나는 날 이 함수 안만
     채우면 되고, 지금 링크 쪽을 걷어내면 나중에 클릭 지점을 화면마다 다시 찾아 심어야 한다 —
     그래서 지금은 안 쓰는 인자다(아래 규칙 해제는 그 뜻).
*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function recordRecentViewAction(kind: SearchKind, id: number): Promise<void> {}
