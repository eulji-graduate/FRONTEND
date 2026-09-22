import "server-only";

import { INITIAL_DEPARTMENTS } from "./mock/departments";
import { INITIAL_POSITIONS } from "./mock/positions";
import type { DepartmentNode, Position } from "./types";

/**
 * 부서 트리 조회 — **격리막**(CLAUDE.md).
 * 컴포넌트는 `DepartmentNode`(UI 계약)만 알고, 목/실서버 분기는 여기서 끝낸다.
 * 연동할 때 고칠 곳은 이 파일과 매퍼뿐이고 컴포넌트는 건드리지 않는다.
 */
export async function getDepartments(): Promise<DepartmentNode[]> {
  return INITIAL_DEPARTMENTS;
}

/** 직급 목록 조회 — 격리막. 연동 시 이 함수와 매퍼만 고친다. */
export async function getPositions(): Promise<Position[]> {
  return INITIAL_POSITIONS;
}

/*
  ⚠️ **연동 후에도 목 씨앗을 그대로 쓴다.** 온보딩은 부서·직급이 **아직 하나도 없는** 회사가
     처음 만드는 자리다 — 불러올 서버 값이 없다(`GET /api/teams`는 온보딩 전에 빈 목록이다).
     여기 값은 "서버에서 받아 온 데이터"가 아니라 **처음 화면에 깔아 주는 예시**다.
  ⚠️ 그래서 `isMock` 분기를 지웠다. 분기를 남겨 두면 목을 끄는 순간 1·2단계가 통째로 터진다.
  ⚠️ 실제 저장은 3단계 [완료] 한 번뿐이다(`actions.ts` → `POST /api/companies/me/onboarding`).
     빈 트리로 시작하기로 바꾸려면 이 두 함수만 `[]`로 돌리면 된다.
*/
