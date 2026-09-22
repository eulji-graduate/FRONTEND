"use client";

import { useProfileAvatar } from "@/hooks/use-profile-avatar";

import type { RoomMember } from "../types";

const AVATAR_SIZE = 12;
const OVERLAP_PX = 3;

interface AttendeeAvatarProps {
  memberId: number;
  name: string;
  offset: number;
}

/**
 * 아바타 하나 — `useProfileAvatar`는 훅이라 배열 순회 안에서 직접 못 부른다
 * (호출 개수가 참석자 수만큼 달라져 rules-of-hooks 위반). 그래서 참석자 한 명당
 * 이 컴포넌트를 하나씩 마운트해 각자 자기 훅을 한 번만 부르게 한다.
 */
function AttendeeAvatar({ memberId, name, offset }: AttendeeAvatarProps) {
  const avatar = useProfileAvatar(memberId, AVATAR_SIZE);

  return (
    <span
      title={name}
      aria-hidden
      style={{ marginLeft: offset === 0 ? 0 : -OVERLAP_PX }}
      className="block shrink-0"
    >
      {avatar}
    </span>
  );
}

interface AttendeeAvatarStackProps {
  memberIds: number[];
  members: RoomMember[];
  max?: number;
}

/** 참석자 아바타를 살짝 겹쳐 보여준다(+N은 마지막에 붙는다). 이름은 스크린리더용으로만 남긴다. */
export function AttendeeAvatarStack({ memberIds, members, max = 3 }: AttendeeAvatarStackProps) {
  const visible = memberIds.slice(0, max);
  const overflow = memberIds.length - visible.length;

  return (
    <span className="flex items-center">
      {visible.map((memberId, index) => (
        <AttendeeAvatar
          key={memberId}
          memberId={memberId}
          name={members.find((member) => member.id === memberId)?.name ?? `#${memberId}`}
          offset={index}
        />
      ))}
      {overflow > 0 && (
        <span
          style={{ marginLeft: -OVERLAP_PX }}
          className="text-muted-foreground flex size-3 shrink-0 items-center justify-center text-[8px] font-medium"
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
