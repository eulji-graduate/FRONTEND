import { ShieldCheck } from "lucide-react";

import { ProfileAvatar } from "@/components/common/profile-avatar";
import { AUTHORITY_BADGE_CLASS, AUTHORITY_LABEL } from "@/constants/authority";
import { MEMBER_STATUS_BADGE_CLASS, MEMBER_STATUS_LABEL } from "@/constants/member";
import { formatYearMonthDay } from "@/lib/date";
import { cn } from "@/lib/utils";

import { GRADE_LOCK_NOTE, gradeLockOf } from "../grade";
import type { ManagedMember } from "../manage-types";

/**
 * 왼쪽 위 — 이 사람이 누구인가.
 *
 * ⚠️ **읽기 전용**이다. 이름·이메일·연락처는 본인이 마이페이지에서 관리할 값이고,
 *    여기서 고치는 건 직급·권한뿐이다(아래 카드) — 한 화면에 두 성격을 섞지 않는다.
 * ⚠️ 사람 카드는 **가운데 정렬**이다. 이름 하나를 보여 주는 자리라 왼쪽에 붙이면 오른쪽이
 *    비고, 아바타가 작아져 목록에서 익힌 색을 알아보기 어렵다.
 * ⚠️ **연락처는 안 보여준다.** 받는 곳이 없다 — 계정 발급도 마이페이지도 전화번호를 묻지
 *    않는데 상세에만 값이 떠 있었다(목이 지어낸 값이다). 받은 적 없는 값을 보여주면
 *    관리자가 그 번호로 연락한다(§정직성). 마이페이지에서 본인이 넣게 되면 그때 되살린다.
 * ⚠️ 아바타는 **공용 훅**(`useProfileAvatar`)이 만든다 — 이름 첫 글자를 직접 그리면
 *    같은 사람이 화면마다 다른 색으로 보인다.
 * ⚠️ 팀이 없는 사람(Owner)은 `-`를 안 적는다. 이 줄은 표가 아니라 문장이라 빈칸 표시가
 *    오히려 어색하다 — 목록 표에서만 `-`로 채운다.
 */
export function MemberProfileCard({ member }: { member: ManagedMember }) {
  const lock = gradeLockOf(member);
  const rows = [
    { label: "이메일", value: member.email },
    // ⚠️ 팀 안의 세부 라벨이다 — 권한(위 배지)과 다른 값이라 줄을 나눈다(WORKFLOW §9)
    { label: "역할", value: member.roleLabel ?? "없음" },
    /*
      ⚠️ **ISO 원문을 화면에 찍지 않는다.** `2024-06-01`은 개발자용 표기다(§카피).
         요일은 붙이지 않는다 — 지나간 입사일이 무슨 요일이었는지는 쓸 데가 없다.
    */
    { label: "입사일", value: formatYearMonthDay(member.joinedAt) },
  ];

  return (
    <div className="flex flex-col gap-7">
      <section className="border-border bg-card flex flex-col items-center gap-2 rounded-2xl border px-7 py-7">
        <ProfileAvatar userId={member.id} size={64} />

        {/*
          ⚠️ `h1`이 아니라 `h2`다. 화면 제목(`사원 관리`)은 상단바가 `h1`으로 말한다 —
             한 화면에 `h1`이 둘이면 스크린리더가 "여기가 어디인지"를 두 번 다르게 듣는다(§a11y).
        */}
        <h2 className="pt-1 text-[17px] leading-[26px] font-semibold">{member.name}</h2>
        <p className="text-muted-foreground text-[13px] leading-5">
          {[member.teamName, member.position].filter(Boolean).join(" · ")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] leading-none",
              AUTHORITY_BADGE_CLASS[member.authority],
            )}
          >
            {AUTHORITY_LABEL[member.authority]}
          </span>
          {/* ⚠️ 목록 표·온보딩과 **같은 방패 표식**이다 — 배지를 하나 더 붙이면 둘 중 하나를
              고른 것처럼 읽힌다(Member **이면서** Admin이다) */}
          {member.isAdmin && (
            <span
              className="text-foreground/70 inline-flex shrink-0 items-center gap-1 text-[11px] leading-none"
              title="관리자 겸직"
            >
              <ShieldCheck className="size-3.5" aria-hidden />
              관리자 겸직
            </span>
          )}
          {/* ⚠️ 목록 표와 **같은 생김새**를 쓴다 — 화면이 달라도 같은 상태는 같게 보인다 */}
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[11px] leading-none",
              MEMBER_STATUS_BADGE_CLASS[member.status],
            )}
          >
            {MEMBER_STATUS_LABEL[member.status]}
          </span>
        </div>

        {/*
          ⚠️ **왜 고칠 칸이 없는지 여기서 말한다.** 잠긴 사람에게는 직급·권한 카드를 안
             그리는데, 아무 말도 없으면 보는 사람은 화면이 덜 그려진 줄 안다 — 카드를 하나 더
             세우는 대신(그 카드는 아무 일도 안 한다) 그 사람 카드가 한 줄로 답한다.
          ⚠️ 문구를 여기 박지 않는다. 잠기는 이유가 대표 하나뿐이 아니라 퇴사도 있어서,
             한 문장만 두면 퇴사자에게 "대표 계정은…"이라고 말하게 된다.
        */}
        {lock && (
          <p className="text-muted-foreground/80 pt-1 text-center text-[12px] leading-4 break-keep">
            {GRADE_LOCK_NOTE[lock]}
          </p>
        )}
      </section>

      {/* 값 카드 — 라벨 위, 값 아래. 마이페이지 기본 정보와 같은 결이다 */}
      <section className="border-border bg-card overflow-hidden rounded-2xl border">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={cn("flex flex-col gap-1 px-7 py-3.5", index > 0 && "border-border border-t")}
          >
            <p className="text-muted-foreground text-[12px] leading-4">{row.label}</p>
            <p className="truncate text-[13px] leading-5 tabular-nums">{row.value}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
