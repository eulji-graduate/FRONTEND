import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/common/access-denied";
import { AUTHORITY } from "@/constants/authority";
import { getCompanyOrg } from "@/features/company/server";
import { HandoverApprovalCard } from "@/features/member/components/handover-approval-card";
import { MemberActionList } from "@/features/member/components/member-action-list";
import { MemberGradeCard } from "@/features/member/components/member-grade-card";
import { MemberProfileCard } from "@/features/member/components/member-profile-card";
import { getManagedMember } from "@/features/member/manage-server";
import { buildTeamRoles } from "@/features/member/team-roles";
import { roleHome } from "@/features/shell/home";
import { getViewer } from "@/features/shell/viewer";
import { canApproveFinal, canChangeMemberGrade, canManageMembers } from "@/lib/permission";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "사원 상세",
};

/**
 * 사원 상세 — 왼쪽에 사람, 오른쪽에 그 사람의 일.
 *
 * ⚠️ **권한이 두 겹으로 갈린다**(WORKFLOW §11). 화면과 직급 변경은 Owner·Admin 둘 다,
 *    **승인·반려는 Owner 전용**이다. 판정을 여기서 한 번에 하고 각 카드에 내려보낸다 —
 *    카드가 스스로 `getViewer`를 부르면 같은 판정이 세 곳에 흩어진다.
 * ⚠️ 화면 가드는 UX일 뿐이고 **각 Server Action이 서버에서 다시 본다**(§권한).
 */
export default async function ManageMemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const id = Number(memberId);

  // ⚠️ 숫자가 아니면 조회하지 않는다 — `NaN`으로 부르면 목/BE가 엉뚱한 답을 줄 수 있다
  if (!Number.isInteger(id)) notFound();

  /* ⚠️ **판정이 먼저다** — 권한 없는 사람의 조회가 BE까지 나가면 안 된다(§권한) */
  const viewer = await getViewer();
  if (!canManageMembers(viewer)) return <AccessDenied homeHref={roleHome(viewer.role)} />;

  const detail = await getManagedMember(id);
  if (!detail) notFound();

  /*
    ⚠️ **직급 목록을 같이 받는다.** 손으로 적게 두면 회사에 없는 직급이 생긴다 —
       발급 창과 같은 이유다(직급에는 권한이 매여 있다).
    ⚠️ `getCompanySetting`이 아니다(2026-08-13 고침) — 그건 OWNER 전용 `GET /api/companies/me`를
       물고 있어, **Admin 겸직자가 사원 상세를 열면 403으로 페이지가 통째로 죽었다**(목록 페이지만
       고치고 이 화면을 빠뜨렸다). 여기 필요한 건 직급·팀 역할뿐이고 둘 다 전 역할에게 열려 있다.
  */
  const company = await getCompanyOrg();
  const positionNames = company.positions.map((position) => position.name);
  /* ⚠️ **이 사람 팀의 역할만** 준다 — 역할은 팀에 매여 있고 팀은 이 화면에서 안 바꾼다 */
  const roleOptions = buildTeamRoles(company.departments)[detail.member.teamName ?? ""] ?? [];

  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        {/*
          ⚠️ 곁 컬럼은 **360px**이다(DESIGN: 곁 컬럼 고정폭). 사람 카드는 폭이 늘어나도
             얻는 게 없다.
          ⚠️ **왼쪽은 이 사람, 오른쪽은 이 사람을 두고 할 일이다.** 직급·권한은 그 사람에게
             붙은 값이라 이름·이메일·입사일 바로 아래에 이어 붙는다 — 오른쪽 머리에 두면
             고를 게 셋뿐인 폼이 본 칸을 차지하고 정작 승인·액션이 아래로 밀린다.
          ⚠️ 폼이 좁은 칸에 들어가도 칸이 안 잘린다 — 카드가 `@container`로 제 폭을 보고
             한 열로 접는다(`member-grade-card`).
          ⚠️ 폼을 전폭에 두지 않는다 — 입력칸만 넓어지고 라벨과 값이 멀어진다.
        */}
        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="flex flex-col gap-7">
            <MemberProfileCard member={detail.member} />
            <MemberGradeCard
              member={detail.member}
              canEdit={canChangeMemberGrade(viewer)}
              positionNames={positionNames}
              roleOptions={roleOptions}
              currentRoleId={detail.roleId}
            />
          </div>

          <div className="flex flex-col gap-7">
            {/*
              ⚠️ 승인 카드는 **곁 컬럼 옆, 담당 액션 바로 위**다. 한때 맨 위 전폭에 띄웠는데,
                 폭이 1440까지 늘어난 카드에 값이 셋뿐이라 표가 허옇게 비었고 아래 칸들과
                 폭이 달라 화면이 두 겹으로 끊겼다.
              ⚠️ 그래도 **담당 액션보다는 위다.** 인계 액션이 몇 건인지 말하는 카드라
                 그 목록 바로 앞에 붙어야 두 값이 이어져 읽힌다.
              ⚠️ 신청이 있을 때만 그린다. 빈 카드를 두면 늘 처리할 게 있는 것처럼 보인다.
              ⚠️ Admin 겸직자에게도 **카드는 보이되 버튼만 없다** — 무슨 일이 진행 중인지는
                 알아야 계정 발급·직급 변경을 할 때 헷갈리지 않는다(WORKFLOW §11).
            */}
            {detail.pendingHandover && (
              <HandoverApprovalCard
                memberId={detail.member.id}
                memberName={detail.member.name}
                memberAuthority={detail.member.authority}
                handover={detail.pendingHandover}
                canApprove={canApproveFinal(viewer)}
                /*
                  ⚠️ **신청 당시** 권한을 쓴다(`pendingHandover.requesterAuthority`) —
                     지금 권한(`detail.member.authority`)을 쓰면 팀장 공석 중 승급된
                     사람의 예전 일반 팀원 신청이 "팀장 본인 신청"으로 잘못 보인다
                     (CodeRabbit 지적, 2026-08-09).
                */
                isRequesterLeader={detail.pendingHandover.requesterAuthority === AUTHORITY.LEADER}
              />
            )}

            <MemberActionList actions={detail.actions} />
          </div>
        </div>
      </div>
    </div>
  );
}
