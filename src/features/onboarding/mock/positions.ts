import { AUTHORITY } from "@/constants/domain";

import type { Position } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전. 온보딩 진입 시 보여줄 기본 예시 직급이다.
 * Owner·Admin은 기업 승인 때 시스템이 계정을 발급하므로 여기에 없다.
 */
export const INITIAL_POSITIONS: Position[] = [
  { id: "lead", name: "팀장", role: AUTHORITY.LEADER },
  { id: "gwajang", name: "과장", role: AUTHORITY.MEMBER },
  { id: "daeri", name: "대리", role: AUTHORITY.MEMBER },
  { id: "staff", name: "사원", role: AUTHORITY.MEMBER },
];
