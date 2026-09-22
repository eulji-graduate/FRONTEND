import type { ReactNode } from "react";

import { PROFILE_INFO_ROW_LABEL } from "@/constants/profile";
import { formatYearMonthDay } from "@/lib/date";

import type { MyProfile } from "../types";

interface InfoRow {
  label: string;
  value: string;
}

interface ProfileInfoCardProps {
  profile: MyProfile;
  /** 카드 머리 — 아바타 줄(`ProfileHeader`)이 들어온다. */
  header: ReactNode;
}

/** 기본 정보 표시용 필드 — 편집 기능은 명세가 없어 만들지 않는다(§명세에 없는 화면·기능은 안 만든다). */
function toRows(profile: MyProfile): InfoRow[] {
  return [
    { label: PROFILE_INFO_ROW_LABEL.NAME, value: profile.name },
    { label: PROFILE_INFO_ROW_LABEL.EMAIL, value: profile.email },
    { label: PROFILE_INFO_ROW_LABEL.TEAM, value: profile.teamName },
    { label: PROFILE_INFO_ROW_LABEL.POSITION, value: profile.position },
    /*
      ⚠️ **날짜는 우리 표기로 그린다**(§카피). 서버가 준 `2021-03-02`를 그대로 뿌리고 있어
         사원 관리(`2021년 3월 2일`)와 같은 값이 화면마다 다르게 보였다.
      ⚠️ 요일은 안 붙인다 — 지나간 입사일이 무슨 요일이었는지는 쓸 데가 없다
         (`member-profile-card`와 같은 판단).
    */
    { label: PROFILE_INFO_ROW_LABEL.JOINED_AT, value: formatYearMonthDay(profile.joinedAt) },
  ];
}

/** 마이페이지 "기본 정보" 카드 — 읽기 전용. */
export function ProfileInfoCard({ profile, header }: ProfileInfoCardProps) {
  const rows = toRows(profile);

  return (
    /*
      ⚠️ **카드 규격을 따른다**(2026-08-11). 머리가 `px-4 py-3`에 13px 글자라 다른 카드보다
         한 단 작았다 — 같은 화면에 선 카드끼리 머리 크기가 다르면 층이 어긋나 보인다(§DESIGN 2).
      ⚠️ **두 칸 격자다.** 값 다섯 개를 한 줄씩 쌓으니 카드 오른쪽 절반이 통째로 비었다 —
         값이 짧은 목록은 나란히 세우는 편이 낫다.
      ⚠️ 라벨은 위, 값은 아래다 — 사원 상세의 값 카드와 같은 결이다.
    */
    <section className="border-border bg-card overflow-hidden rounded-2xl border">
      {header}

      {/*
        ⚠️ **세 칸이다.** 두 칸으로 두니 값이 다섯 개뿐이라 카드가 세로로 늘어지고 오른쪽이
           남았다 — 값이 짧은 목록은 칸을 늘려 가로로 펴는 편이 낫다.
      */}
      <dl className="border-border grid gap-x-10 gap-y-6 border-t px-7 py-6 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-muted-foreground text-[12px] leading-4">{row.label}</dt>
            <dd className="truncate text-[13px] leading-5">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
