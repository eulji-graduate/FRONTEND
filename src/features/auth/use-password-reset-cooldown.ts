"use client";

import { useEffect, useState } from "react";

/**
 * 비밀번호 찾기 재요청 쿨다운 — BE 담당자 요청(2026-08-18, PR #571 공지).
 *
 * ⚠️ **IP당 1분에 5회 제한을 클라이언트에서도 미리 막는다.** BE의 진짜 제한은 계정당
 *    하루 3회(성공도 센다)라 훨씬 빡빡하다 — 재요청 버튼을 연타하면 그 3회를 몇 초 안에
 *    다 쓴다. 60초 쿨다운으로 "실수로 두세 번 더 누르는 것"만 막는다 — 진짜 3회 제한
 *    자체는 서버가 최종적으로 지킨다(여기는 UX 보조일 뿐 보안 경계가 아니다).
 * ⚠️ **`localStorage`로 넘어간다**(2026-08-13 이후 새로고침·뒤로가기에도 유지). 컴포넌트
 *    상태로만 두면 [로그인으로 돌아가기] → 다시 [비밀번호 찾기]로 들어오는 순간 풀린다.
 * ⚠️ **이메일별로 나누지 않는다.** BE 제한의 더 빡빡한 축(IP)이 이메일과 무관하고, 이메일별로
 *    나누면 다른 이메일로 우회해 쿨다운을 무력화할 수 있다는 인상을 준다 — 실제로 계정당
 *    제한은 여전히 서버가 걸지만, 클라이언트 쪽 안내는 IP 관점(기기 하나)으로 통일한다.
 */
const COOLDOWN_SECONDS = 60;
const STORAGE_KEY = "z-find-password-last-attempt";

function readRemainingSeconds(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return 0;
  const attemptedAt = Number(raw);
  if (!Number.isFinite(attemptedAt)) return 0;
  const elapsedSeconds = (Date.now() - attemptedAt) / 1000;
  return Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsedSeconds));
}

/** 방금 실제로 서버에 보냈다는 표시 — 클라이언트 검증 실패(형식 오류)는 여기로 안 온다. */
export function markPasswordResetAttempt(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

/** 남은 쿨다운(초). 0이면 다시 보낼 수 있다. */
export function usePasswordResetCooldown(): number {
  const [remaining, setRemaining] = useState(readRemainingSeconds);

  useEffect(() => {
    const tick = () => setRemaining(readRemainingSeconds());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return remaining;
}
