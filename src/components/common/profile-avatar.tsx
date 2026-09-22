"use client";

import { useProfileAvatar } from "@/hooks/use-profile-avatar";

/**
 * `useProfileAvatar`를 **목록에서 쓰기 위한 껍데기**.
 *
 * ⚠️ 훅은 반복문 안에서 부를 수 없다 — 줄마다 아바타가 필요한 표에서는 이 컴포넌트를 쓴다.
 * ⚠️ 색은 그 사람의 id에서 나온다. 이름 첫 글자를 직접 그리지 않는다 — 같은 사람이
 *    화면마다 다르게 보이면 목록에서 색으로 사람을 알아볼 수 없다.
 */
export function ProfileAvatar({ userId, size }: { userId: string | number; size?: number }) {
  return useProfileAvatar(userId, size);
}
