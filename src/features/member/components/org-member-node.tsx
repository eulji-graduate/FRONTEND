import { ProfileAvatar } from "@/components/common/profile-avatar";
import { AUTHORITY, AUTHORITY_LABEL } from "@/constants/authority";
import {
  MEMBER_STATUS,
  MEMBER_STATUS_BADGE_CLASS,
  MEMBER_STATUS_LABEL,
  ROLE_NONE_LABEL,
} from "@/constants/member";
import { cn } from "@/lib/utils";

import type { OrgMember } from "../org-types";
import { MatchText } from "./match-text";

/**
 * 조직도에 서는 사람 한 명.
 *
 * ⚠️ 아바타는 **공용 컴포넌트**다. 시안은 이름 첫 글자를 원에 넣었지만, 색이 그 사람의
 *    `id`에서 나와야 어느 화면에서든 같은 사람이 같은 색으로 보인다(§DESIGN 5).
 *    여기서 첫 글자를 직접 그리면 사원 관리 목록과 다른 얼굴이 된다.
 * ⚠️ 서버 컴포넌트로 둔다 — 누를 것이 없다. 상세로 가는 링크도 걸지 않는다:
 *    사원 상세(`/manage/members/:id`)는 Owner·Admin 전용이라 전원이 보는 이 화면에서
 *    링크를 걸면 대부분에게 막힌 문이 된다(§정직성).
 */

/**
 * 구조상 자리를 알리는 표식 — **Owner·Leader에만** 단다.
 *
 * ⚠️ Member는 기본값이라 전원에게 달면 아무것도 안 알린다. Admin 겸직도 안 단다 —
 *    권한이 아니라 덧붙는 플래그이고(§권한: 축이 2개다) 조직 구조와 무관하다.
 * ⚠️ 라벨은 `AUTHORITY_LABEL`에서 꺼낸다(§라벨 하드코딩 금지). 역할 워딩은 영어다.
 */
function AuthorityMark({ authority }: { authority: OrgMember["authority"] }) {
  if (authority !== AUTHORITY.OWNER && authority !== AUTHORITY.LEADER) return null;

  return (
    <span className="border-border text-muted-foreground shrink-0 rounded border px-1.5 py-px text-[11px] leading-4">
      {AUTHORITY_LABEL[authority]}
    </span>
  );
}

/**
 * 상태 뱃지 — **자리에 없는 사람에게만** 단다(휴직).
 *
 * ⚠️ **`대기`를 달지 않는다.** 그건 "휴직·오프보딩을 신청하고 승인을 기다리는" 상태인데
 *    (§constants/member), 이 화면은 **전 구성원이 본다**. 달아 두면 아직 승인도 안 난
 *    남의 휴직·퇴사 신청이 회사 전체에 공개된다 — 그 신청을 다루는 자리는 대표·관리자의
 *    사원 관리(`/manage/members/:id`)다(WORKFLOW §7).
 *    승인 전까지 그 사람은 **여전히 재직 중**이라, 여기서는 아무 표시도 안 하는 게 사실에 맞다.
 * ⚠️ **`RESIGNED`는 안 본다**(2026-08-14 정리). 오프보딩 최종 승인 시 BE가 그 자리에서
 *    `deleted_at`을 찍어 이후 모든 조회에서 빠진다(BE `MemberJpaEntity.offboard` 확인) —
 *    이 조직도 조회에 `RESIGNED` 상태 사람이 올 길이 없다. 휴직은 소프트 딜리트가 아니라
 *    그대로 유효하다.
 * ⚠️ 재직은 기본이라 안 단다. 생김새는 `MEMBER_STATUS_BADGE_CLASS` 한 곳이 정하고,
 *    색이 아니라 채움과 진하기로 층을 만든다(§디자인 토큰).
 */
function StatusMark({ status }: { status: OrgMember["status"] }) {
  if (status !== MEMBER_STATUS.VACATION) return null;

  return (
    <span
      className={cn(
        "shrink-0 rounded border px-1.5 py-px text-[11px] leading-4",
        MEMBER_STATUS_BADGE_CLASS[status],
      )}
    >
      {MEMBER_STATUS_LABEL[status]}
    </span>
  );
}

export function OrgMemberNode({ member, keyword }: { member: OrgMember; keyword: string }) {
  const isLead = member.authority === AUTHORITY.OWNER || member.authority === AUTHORITY.LEADER;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-3.5 py-3",
        // 그 팀을 맡는 사람은 한 단 진한 선으로 — 색이 아니라 명도로 가른다(§디자인 토큰)
        isLead ? "border-foreground/25" : "border-border",
      )}
    >
      <ProfileAvatar userId={member.id} size={32} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] leading-5 font-medium">
            <MatchText text={member.name} keyword={keyword} />
          </span>
          <AuthorityMark authority={member.authority} />
          {/* 상태는 오른쪽 끝으로 민다 — 이름 옆에 붙이면 이름 길이마다 자리가 흔들린다 */}
          <span className="ml-auto flex items-center">
            <StatusMark status={member.status} />
          </span>
        </div>

        {/*
          ⚠️ **`없음`은 화면에 안 그린다**(2026-08-19 재변경, 사용자 판단). 예전엔 직급만
             적었다가("팀장 · 없음"이 어색해서) "역할이 안 뜬 화면처럼 보인다"는 이유로 도로
             붙였는데, 다시 보니 이 카드형 자리에서는(표의 한 칸이 아니라 이름 바로 아래
             두 번째 줄) "없음"이 카드 대부분에 반복돼 오히려 더 거슬렸다. 값 자체는
             매퍼가 여전히 "없음"으로 채워 준다(§org-types) — 여기서 **그 값을 숨길 뿐**이고,
             검색(`search`가 "없음"을 훑는 것)도 그대로 동작한다.
          ⚠️ **가를 게 하나도 없으면 줄 자체를 안 그린다.** 직급도 없고(Owner) 역할도 `없음`이면
             빈 문단만 남아 카드 안에 의미 없는 빈 줄이 뜬다.
        */}
        {(member.position || member.roleLabel !== ROLE_NONE_LABEL) && (
          <p className="text-muted-foreground truncate text-[12px] leading-4">
            {member.position && <MatchText text={member.position} keyword={keyword} />}
            {member.position && member.roleLabel !== ROLE_NONE_LABEL && " · "}
            {member.roleLabel !== ROLE_NONE_LABEL && (
              <MatchText text={member.roleLabel} keyword={keyword} />
            )}
          </p>
        )}
      </div>
    </div>
  );
}
