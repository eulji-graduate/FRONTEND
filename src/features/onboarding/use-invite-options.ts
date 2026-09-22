"use client";

import { useEffect, useMemo, useState } from "react";

import { AUTHORITY } from "@/constants/domain";

import { loadDraft } from "./draft";
import { departmentRoles, rootDepartments } from "./tree";
import type { DepartmentNode, Position } from "./types";

/**
 * 3단계에서 고를 수 있는 것들 — 1·2단계에서 정한 값에서 뽑는다.
 *
 * 서버 저장이 아직 없어서 **임시 보관함(`draft.ts`)** 을 먼저 보고, 없으면 서버 값을 쓴다.
 * 연동되면 이 훅은 props만 보게 되고 보관함 부분은 사라진다.
 */
export function useInviteOptions(departments: DepartmentNode[], positions: Position[]) {
  const [source, setSource] = useState({ departments, positions });
  /**
   * 보관함을 아직 읽지 않았다는 표시.
   *
   * ⚠️ 첫 렌더의 선택지는 **props**라서, 보관함에만 있는 부서를 가리키는 초대 줄이
   *    "없는 부서"로 판정돼 기본값으로 밀려난다. 한 번 밀려나면 되돌릴 수 없다.
   *    그래서 출처가 확정되기 전에는 재매핑을 시작하지 않는다.
   */
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (!draft.departments && !draft.positions) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(true);
      return;
    }
    // sessionStorage는 첫 렌더 뒤에야 읽을 수 있다

    setSource({
      departments: draft.departments ?? departments,
      positions: draft.positions ?? positions,
    });

    setIsReady(true);
    // 첫 렌더에서 한 번만 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 소속은 부서(윗단) + 역할(아랫단)로 정한다. 팀장은 역할이 `리더`로 자동으로 정해진다.
  const departmentOptions = useMemo(() => rootDepartments(source.departments), [source]);

  const rolesOf = useMemo(
    () => (departmentId: string) => departmentRoles(source.departments, departmentId),
    [source],
  );

  const positionOptions = useMemo(
    () => source.positions.map((position) => ({ id: position.id, name: position.name })),
    [source],
  );

  /** 2단계에서 리더 권한이 붙은 직급 — 부서마다 한 명만 가질 수 있다 */
  const isLeaderPosition = useMemo(() => {
    const leaderIds = new Set(
      source.positions
        .filter((position) => position.role === AUTHORITY.LEADER)
        .map((position) => position.id),
    );
    return (positionId: string) => leaderIds.has(positionId);
  }, [source]);

  /*
    ⚠️ **기본 부서·직급을 내주지 않는다**(2026-08-04). 새 줄은 아무것도 안 고른 상태로 나고,
       화면에는 `선택`으로 뜬다 — 고르지 않은 값이 채워져 있으면 확인 없이 넘긴 줄이
       엉뚱한 부서로 초대장을 받는다.
  */

  return {
    /** 보관함까지 읽어 선택지가 확정됐는가 */
    isReady,
    /**
     * 실제로 쓰이는 1·2단계 값 — **보관함이 있으면 그쪽**이다.
     *
     * ⚠️ [완료]가 서버로 보내는 것도 이 값이어야 한다. props(서버 값)를 보내면
     *    화면에서 방금 고친 부서·직급이 아니라 **고치기 전 값**이 저장된다.
     */
    source,
    departmentOptions,
    rolesOf,
    positionOptions,
    isLeaderPosition,
  };
}
