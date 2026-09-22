import { Users, UserSearch } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { ProfileAvatar } from "@/components/common/profile-avatar";
import { AUTHORITY_BADGE_CLASS, AUTHORITY_LABEL } from "@/constants/authority";
import { MEMBER_STATUS_BADGE_CLASS, MEMBER_STATUS_LABEL } from "@/constants/member";
import { formatYearMonthDay } from "@/lib/date";
import { cn } from "@/lib/utils";

import type { ManagedMember } from "../manage-types";

/**
 * 사원 목록 표.
 *
 * ⚠️ 컬럼은 **이름 · 팀 · 직급 · 권한 · 역할 · 상태 · 입사일**이다(WORKFLOW §9).
 *    "미완료 액션"은 없다 — 목록에서 셀 일이 아니다.
 * ⚠️ **이름만 왼쪽, 나머지는 가운데**다(저장소 표와 같은 규칙). 열 폭이 고정이라
 *    머리와 칸에 같은 정렬을 줘야 눈이 세로로 따라간다.
 * ⚠️ 아바타는 **공용 훅**(`useProfileAvatar`)이 만든다. 이름 첫 글자를 직접 그리면 같은 사람이
 *    화면마다 다르게 보여, 목록에서 색으로 사람을 알아보는 일이 안 된다.
 * ⚠️ **링크는 이름 칸에만** 둔다. 줄 전체를 `<a>`로 감쌀 수 없고(표 구조가 깨진다), 줄마다
 *    투명 오버레이를 얹으면 다른 칸의 글자를 드래그해 복사할 수 없다 — 대신 줄에 hover를
 *    줘서 어디를 눌러야 하는지 보이게 한다. 키보드는 한 줄에 한 번만 걸린다(§a11y).
 */

/**
 * 권한 칸 — 배지 하나와, 겸직이면 그 옆에 **방패 표식**.
 *
 * ⚠️ **Admin을 배지로 하나 더 붙이지 않는다.** `Member` `Admin`이 나란히 서면 크기·모양이
 *    같아 **둘 중 하나를 고른 것**처럼 읽힌다 — 실제로는 Member **이면서** Admin이다.
 *    온보딩 초대 줄이 이미 같은 이유로 방패 아이콘을 쓴다(`InviteAdminToggle`) —
 *    화면이 달라도 같은 것은 같게 보여야 한다.
 * ⚠️ 아이콘만 두면 뜻이 안 남는다 — 표에서 훑을 땐 `title`, 스크린 리더에는 글자로 준다(§a11y).
 */
function AuthorityCell({ member }: { member: ManagedMember }) {
  return (
    /*
      ⚠️ **묶음을 가운데 두지 않는다.** 그러면 방패가 있는 줄만 배지가 왼쪽으로 밀려,
         `Member`와 `Leader`의 가운데가 줄마다 어긋난다 — 저장소 표의 상태 점과 같은 문제다.
      ⚠️ **배지는 배지끼리, 방패는 방패끼리 한 세로선에 선다.** 배지를 고정폭 상자에 넣어
         그 안에서 가운데 정렬하고, 방패 자리도 **겸직이 아니어도 비워 둔다** —
         자리를 안 잡아 두면 있는 줄만 폭이 늘어 결국 같은 어긋남이 생긴다.
    */
    <span className="relative inline-flex w-[56px] items-center justify-center">
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] leading-none",
          AUTHORITY_BADGE_CLASS[member.authority],
        )}
      >
        {AUTHORITY_LABEL[member.authority]}
      </span>

      {/*
        ⚠️ 방패는 **절대배치**다. 흐름에 두면 묶음(배지+방패)의 가운데가 칸 가운데에 맞아,
           방패가 붙은 줄만 배지가 왼쪽으로 밀리고 **열 머리(`권한`)와도 어긋난다.**
           빼내면 가운데에 오는 건 배지뿐이라 머리글 바로 아래에 선다.
        ⚠️ 고정폭 상자(56px)의 **오른쪽 끝에서 같은 거리**에 두므로 방패끼리도 한 줄로 선다.
 ⚠️ 아이콘이 배지보다 떠 보여 ``로 내린다 — 배지는 글자가 상자 안에서
           아래쪽에 앉는데 아이콘은 정확히 가운데라, 같은 축이어도 눈에는 아이콘이 위로 뜬다.
      */}
      {member.isAdmin && (
        <span
          title="관리자 겸직"
          className="text-foreground/70 absolute top-1/2 left-full ml-1.5 -translate-y-1/2"
        >
          <ShieldCheck className="size-3.5" aria-hidden />
          <span className="sr-only">관리자 겸직</span>
        </span>
      )}
    </span>
  );
}

/**
 * 상태 칸 — 생김새는 `MEMBER_STATUS_BADGE_CLASS` 한 곳이 정한다.
 *
 * ⚠️ 전에는 넷이 사실상 같은 알약이라 `재직`과 `대기`가 글자 말고는 구분이 안 됐다.
 *    색이 아니라 **채움과 진하기**로 가른다(§디자인 토큰: 색으로 알리는 건 에러뿐).
 */
function StatusCell({ status }: { status: ManagedMember["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-[11px] leading-4",
        MEMBER_STATUS_BADGE_CLASS[status],
      )}
    >
      {MEMBER_STATUS_LABEL[status]}
    </span>
  );
}

export function MemberTable({
  members,
  isFiltered,
}: {
  members: ManagedMember[];
  /** 검색어·거르개가 걸린 목록인지 — 빈 자리에 할 말이 달라진다. */
  isFiltered?: boolean;
}) {
  if (members.length === 0) {
    /*
      ⚠️ **못 찾은 것과 아직 아무도 없는 것은 다음 할 일이 다르다**(§상태 세 장).
         조건이 걸린 목록에는 "검색어를 지워 보라"가 맞고, 조건이 없는데 비었으면
         지울 검색어가 없어 그 말이 거짓이 된다.
    */
    return isFiltered ? (
      <EmptyState
        bordered
        icon={UserSearch}
        title="찾는 사원이 없습니다."
        description="이름·팀·직급으로 찾습니다. 검색어를 지우면 전체가 보입니다."
      />
    ) : (
      <EmptyState
        bordered
        icon={Users}
        title="아직 등록된 사원이 없습니다."
        description="[계정 발급]으로 첫 사원을 등록해 주세요."
      />
    );
  }

  return (
    <div className="border-border overflow-x-auto border-t">
      {/*
        ⚠️ `table-fixed` — 이름 길이에 따라 열이 흔들리면 목록을 위아래로 훑을 때 눈이
           세로줄을 못 따라간다. 폭은 `colgroup`이 한 곳에서 정한다.
      */}
      <table className="w-full min-w-[880px] table-fixed border-collapse">
        {/*
          ⚠️ 폭을 **비율(%)로** 준다(저장소 표와 같은 규칙). px로 고정하면 남는 폭을 어느 한
             열이 통째로 먹는다 — 폭 없이 뒀던 `역할`이 화면에서 제일 넓었고(대부분 `없음`이다),
             그걸 이름으로 옮기자 이번엔 이름 칸만 600px가 되고 나머지가 오른쪽에 뭉쳤다.
             비율이면 화면이 넓어질 때 일곱 열이 **같이** 늘어난다.
          ⚠️ `입사일`은 `2020년 1월 2일`이 한 줄에 들어가는 몫을 준다. 좁게 뒀더니
             `2020년 1월 2` / `일`로 잘려 줄마다 높이가 달라졌다.
        */}
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[16%]" />
          <col className="w-[16%]" />
          <col className="w-[10%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className="text-muted-foreground bg-secondary/50 border-border border-b text-[12px] leading-4">
            {/*
              ⚠️ 머리글을 칸 왼쪽 끝에 붙이면 **아바타 위**에 선다 — 아래 칸에서 실제로 읽는
                 건 이름 글자인데 머리글이 그림 위에 있으면 두 줄이 따로 논다.
                 아바타 자리(28px)와 사이 간격(10px)을 그대로 비워 이름 글자 위에 세운다.
              ⚠️ 숫자를 손으로 맞추지 않는다 — 아래 칸과 **같은 값**(`size-7`·`gap-2.5`)을 쓴다.
                 아바타 크기를 바꾸면 두 곳이 같이 움직여야 한다.
            */}
            <th className="px-7 py-3 text-left font-normal">
              <span className="inline-flex items-center gap-2.5">
                <span className="w-7 shrink-0" aria-hidden />
                이름
              </span>
            </th>
            <th className="px-4 py-3 text-center font-normal">팀</th>
            <th className="px-4 py-3 text-center font-normal">직급</th>
            <th className="px-4 py-3 text-center font-normal">권한</th>
            {/* ⚠️ 팀 안의 세부 라벨이다 — 권한(Leader/Member)과 다른 열이다(WORKFLOW §9) */}
            <th className="px-4 py-3 text-center font-normal">역할</th>
            <th className="px-4 py-3 text-center font-normal">상태</th>
            <th className="px-4 py-3 text-center font-normal">입사일</th>
          </tr>
        </thead>

        <tbody>
          {members.map((member) => (
            <tr
              key={member.id}
              className="border-border hover:bg-secondary/50 border-b transition-colors last:border-b-0"
            >
              <th scope="row" className="px-7 py-3.5 text-left font-normal">
                <Link
                  href={`/manage/members/${member.id}`}
                  className="focus-visible:ring-ring flex items-center gap-2.5 rounded focus-visible:ring-2 focus-visible:outline-hidden"
                >
                  <ProfileAvatar userId={member.id} size={28} />
                  <span className="text-[13px] leading-5 font-medium">{member.name}</span>
                </Link>
              </th>
              {/* ⚠️ Owner는 팀이 없다 — 빈칸이 아니라 `-`로 적는다(WORKFLOW §9) */}
              <td className="text-muted-foreground px-4 py-3.5 text-center text-[13px] leading-5">
                {member.teamName ?? "-"}
              </td>
              <td className="px-4 py-3.5 text-center text-[13px] leading-5">{member.position}</td>
              {/* ⚠️ 배지만 든 칸에도 본문 크기를 준다 — 안 주면 셀이 기본 16px을 물려받아 줄 높이가 달라진다 */}
              <td className="px-4 py-3.5 text-center text-[13px] leading-5">
                <AuthorityCell member={member} />
              </td>
              <td className="text-muted-foreground px-4 py-3.5 text-center text-[13px] leading-5">
                {member.roleLabel ?? "없음"}
              </td>
              {/* ⚠️ 배지만 든 칸에도 본문 크기를 준다 — 안 주면 셀이 기본 16px을 물려받아 줄 높이가 달라진다 */}
              <td className="px-4 py-3.5 text-center text-[13px] leading-5">
                <StatusCell status={member.status} />
              </td>
              {/*
                ⚠️ **요일을 빼고 적는다.** 입사일이 무슨 요일이었는지는 쓸 데가 없는데,
                   그 세 글자 때문에 칸이 모자라 줄이 깨졌다(`formatYearMonthDay`).
                ⚠️ `whitespace-nowrap` — 폭을 넉넉히 줬어도 좁은 화면에서 다시 접히면
                   그 줄만 키가 커져 표가 들쭉날쭉해진다. 좁아지면 가로로 스크롤한다.
              */}
              <td className="text-muted-foreground px-4 py-3.5 text-center text-[13px] leading-5 whitespace-nowrap tabular-nums">
                <time dateTime={member.joinedAt}>{formatYearMonthDay(member.joinedAt)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
