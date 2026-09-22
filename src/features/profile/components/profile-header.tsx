"use client";

import { AUTHORITY, AUTHORITY_BADGE_CLASS, AUTHORITY_LABEL } from "@/constants/authority";
import { useProfileAvatar } from "@/hooks/use-profile-avatar";
import { cn } from "@/lib/utils";

import type { MyProfile } from "../types";
import { ProfileActionsMenu } from "./profile-actions-menu";

interface ProfileHeaderProps {
  profile: MyProfile;
}

/**
 * 권한별로 소속 표기가 다르다(§권한 — 축이 2개다).
 * OWNER=회사·대표 / LEADER=회사·팀·직책 / MEMBER=회사·팀·(역할 있으면)·직책.
 */
function formatAffiliation(profile: MyProfile): string {
  const { companyName, teamName, roleLabel, position, role } = profile;

  if (role === AUTHORITY.OWNER) return `${companyName} · 대표`;
  if (role === AUTHORITY.LEADER) return `${companyName} · ${teamName} · ${position}`;

  return roleLabel
    ? `${companyName} · ${teamName} · ${roleLabel} · ${position}`
    : `${companyName} · ${teamName} · ${position}`;
}

/**
 * 기본 정보 카드의 **머리** — 아바타·이름·이메일·역할 배지·소속. 편집 불가(읽기 전용, §명세 없음).
 *
 * ⚠️ **카드 안으로 들어왔다**(2026-08-11). 전에는 카드 밖 한 줄로 떠 있어서, 폭을 넓히자
 *    이름과 [로그아웃] 사이가 1400px씩 벌어진 빈 띠가 됐다 — 같은 사람을 말하는 값이라
 *    한 카드에 담고, 아래 값들과 선 하나로 나눈다.
 * ⚠️ **아바타는 이름 첫 글자가 아니라 `useProfileAvatar`가 그린다**(2026-08-14) — 목록·참석자
 *    칸의 아바타와 같은 훅이라, 이 화면에서만 다른 그림(글자)이 뜨는 일이 없다. 색을 정하는
 *    키도 그 훅과 같은 규칙으로 `profile.id`뿐이다(이름이 같아도 색이 갈리지 않는다).
 */
export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const avatar = useProfileAvatar(profile.id, 56);

  return (
    <div className="flex items-center gap-3.5 px-7 py-6">
      {avatar}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[17px] leading-[26px] font-semibold">{profile.name}</p>
        <p className="text-muted-foreground text-[12px] leading-4">{profile.email}</p>

        <div className="flex items-center gap-1.5 pt-0.5">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] leading-none",
              AUTHORITY_BADGE_CLASS[profile.role],
            )}
          >
            {AUTHORITY_LABEL[profile.role]}
          </span>
          <span className="text-muted-foreground/70 text-[11px]">{formatAffiliation(profile)}</span>
        </div>
      </div>

      {/*
        ⚠️ **나갈 문은 여기 하나뿐이다.** 사이드바 계정 줄(49px)에 끼우면 이름이 밀려 잘리고,
           로그아웃은 하루에 한 번 쓰는 일이라 늘 보이는 자리를 차지할 만큼 잦지 않다.
        ⚠️ **버튼 둘이 아니라 "⋯" 메뉴 하나다**(2026-08-19 — §profile-actions-menu 주석).
      */}
      <div className="flex shrink-0 items-center gap-2">
        <ProfileActionsMenu />
      </div>
    </div>
  );
}
