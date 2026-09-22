"use client";

import { type ReactElement, useMemo } from "react";

import { pickPaletteColor } from "@/lib/palette";

/**
 * 사람마다 **항상 같은** 원형 프로필 아바타.
 *
 * BE에 프로필 이미지·색 필드가 없어 프론트가 만든다. 계정이 생긴 뒤로는 어느 화면에서든
 * 같은 색이 나와야 한다 — 그래야 목록에서 얼굴 대신 색으로 사람을 알아본다.
 *
 * ⚠️ **키는 그 사람의 id 하나뿐이다.** 전에는 부르는 쪽이 두 번째 인자를 마음대로 넘겨서
 *    (`name+id` / `name+department`) **같은 사람이 화면마다 다른 색**으로 나왔다.
 *    이름·부서·직급은 바뀔 수 있는 값이라 키에 넣으면 그때 색이 통째로 바뀐다 —
 *    id만 쓰면 이름을 고쳐도 색이 그대로다.
 * ⚠️ 팔레트는 `lib/palette`가 정본이다. 프로젝트 태그도 같은 것을 쓴다 — 두 벌로 들고 있으면
 *    같은 화면에 두 가지 초록이 뜬다.
 * ⚠️ 색은 **CSS 변수 이름**으로 나온다(`var(--tag-teal-bg)`). hex를 코드로 들고 있으면
 *    다크모드에서 안 따라간다(§디자인 토큰).
 */

/**
 * 원 안을 채우는 사람 실루엣.
 *
 * ⚠️ **어깨를 큰 원으로 그린다.** 전에는 사다리꼴 `path`가 `x 16~84`까지 뻗었는데, 그 높이에서
 *    바깥 원은 `23~77`밖에 안 돼 **양옆이 뭉텅 잘리고** 바닥에는 빈틈이 남았다.
 *    어깨를 원(`cy=95 r=32`)으로 두면 바깥 원의 곡선과 결이 맞아 잘린 자국 없이 채워진다.
 * ⚠️ `viewBox`가 정사각이라 `preserveAspectRatio`를 건드릴 필요가 없다 — `slice`로 늘리면
 *    비정사각 크기에서 얼굴이 찌그러진다.
 */
interface ProfileSilhouetteProps {
  /** 실루엣을 칠할 색 — 그 사람의 id에서 뽑은 팔레트 색이다 */
  color: string;
}

function ProfileSilhouette({ color }: ProfileSilhouetteProps) {
  return (
    <svg viewBox="0 0 100 100" className="block size-full" aria-hidden="true">
      {/* 머리 */}
      <circle cx="50" cy="37" r="16" fill={color} />
      {/* 어깨 — 아래로 넘치는 만큼은 바깥 원이 다듬는다 */}
      <circle cx="50" cy="95" r="32" fill={color} />
    </svg>
  );
}

/**
 * 그대로 렌더링하면 되는 원형 아바타.
 *
 * @param userId 그 사람의 id — **색을 정하는 유일한 키**다. 이름·부서를 넣지 않는다
 * @param size   지름(px). 기본 40
 *
 * @example
 * const avatar = useProfileAvatar(member.id, 28);
 * return <div className="flex items-center gap-2">{avatar}<span>{member.name}</span></div>;
 */
export function useProfileAvatar(userId: string | number, size: number = 40): ReactElement {
  const { bgColor, textColor } = useMemo(() => pickPaletteColor(String(userId)), [userId]);

  return useMemo(
    () => (
      <span
        className="block shrink-0 overflow-hidden rounded-full"
        style={{ width: size, height: size, backgroundColor: bgColor }}
      >
        <ProfileSilhouette color={textColor} />
      </span>
    ),
    [size, bgColor, textColor],
  );
}
