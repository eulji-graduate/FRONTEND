import { Crown, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import type { Metadata } from "next";

import { AUTHORITY_BADGE_CLASS } from "@/constants/authority";
import { DocPage } from "@/features/landing/components/doc-page";
import { PermissionTable } from "@/features/landing/components/permission-table";
import { ROLE_ACCESS } from "@/features/landing/roles";

export const metadata: Metadata = {
  title: "권한 매트릭스 — Z",
  description:
    "Owner · Leader · Member 세 권한과 겸직 Admin이 각각 무엇에 닿을 수 있는지 정리했습니다.",
};

/**
 * 역할별로 무엇에 닿는지 한 장으로 정리한 화면.
 *
 * 역할 소개를 먼저 짧게 읽히고, 그 아래에 **기능 × 역할 표**로 세부를 보여준다.
 * 표만 두면 처음 보는 사람이 각 역할이 무엇을 하는 자리인지 알 수 없다.
 */
const ROLE_STYLE = {
  Owner: { icon: Crown, chip: AUTHORITY_BADGE_CLASS.OWNER },
  Leader: { icon: UsersRound, chip: AUTHORITY_BADGE_CLASS.LEADER },
  Member: { icon: UserRound, chip: AUTHORITY_BADGE_CLASS.MEMBER },
  "+Admin": { icon: ShieldCheck, chip: "bg-role-admin-surface text-role-admin" },
} as const;

export default function RolesPage() {
  return (
    <DocPage
      title="권한 매트릭스"
      description="Z는 권한에 따라 보이는 화면이 다릅니다. 계정을 받으면 어떤 일을 할 수 있는지 미리 확인하세요."
      isDescriptionOneLine
    >
      {/* 역할 배지 토큰 색을 그대로 쓴다 — 앱 안에서 보게 될 색을 미리 익힌다 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {ROLE_ACCESS.map((role) => {
          const style = ROLE_STYLE[role.name as keyof typeof ROLE_STYLE] ?? ROLE_STYLE.Member;
          const Icon = style.icon;
          return (
            <section
              key={role.name}
              className="border-border bg-card ring-rgb-static relative rounded-xl border p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-[2px] hover:shadow-[0_10px_28px_-14px_rgba(124,58,237,0.32)]"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${style.chip}`}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[16px] leading-6 font-semibold">{role.name}</h2>
                  <span className="text-muted-foreground text-[12px] leading-5">{role.korean}</span>
                </div>
              </div>
              <p className="text-muted-foreground pt-2.5 text-[13px] leading-[21px] break-keep">
                {role.summary}
              </p>
            </section>
          );
        })}
      </div>

      <h2 className="pt-14 text-[20px] leading-7 font-semibold tracking-[-0.4px]">기능별 정리</h2>
      <p className="text-muted-foreground pt-1.5 pb-5 text-[13px] leading-[21px] break-keep">
        가로로 넘겨서 보실 수 있습니다.
      </p>

      <PermissionTable />

      {/* ⚠️ 화면 접근과 실제 권한은 다르다 — 숨김은 보안이 아니다(§권한) */}
      <p className="text-muted-foreground/70 pt-8 text-[12px] leading-[20px] break-keep">
        위 내용은 화면 접근 기준입니다. 실제 권한은 요청할 때마다 서버가 다시 확인합니다.
      </p>
    </DocPage>
  );
}
