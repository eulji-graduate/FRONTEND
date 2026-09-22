import { AUTHORITY } from "@/constants/authority";

import type { MyProfile } from "../types";

/** ⚠️ 목 데이터 — BE 연동 전. `getViewer()`(셸)와 별개로, 마이페이지 표시용 필드만 담는다. */
export const MY_PROFILE_MOCK: MyProfile = {
  // ⚠️ `getMockActor().id`(1)와 맞춘다 — 다른 목 화면(회의 참석자 등)에 이 사람이 같은 id로
  //    등장할 때 아바타 색이 갈리지 않는다(`useProfileAvatar`는 id만 본다).
  id: 1,
  name: "김서준",
  email: "seojun@techstart.kr",
  role: AUTHORITY.OWNER,
  companyName: "(주)테크스타트",
  teamName: "제품개발팀",
  // ⚠️ OWNER는 소속 표시에 팀 안 세부 역할을 쓰지 않는다("대표"로 고정 표시).
  roleLabel: null,
  position: "수석",
  joinedAt: "2021-03-02",
};
