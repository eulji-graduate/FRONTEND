import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/common/access-denied";
import { LeaderHandoverActionList } from "@/features/leader-handover/components/leader-handover-action-list";
import { LeaderHandoverAssignForm } from "@/features/leader-handover/components/leader-handover-assign-form";
import { getLeaderHandoverDetail } from "@/features/leader-handover/server";
import { roleHome } from "@/features/shell/home";
import { getViewer } from "@/features/shell/viewer";
import { canManageLeaderHandovers } from "@/lib/permission";

export const metadata: Metadata = {
  title: "인수인계서 상세",
};

interface LeaderHandoverDetailPageProps {
  params: Promise<{ handoverId: string }>;
}

export default async function LeaderHandoverDetailPage({ params }: LeaderHandoverDetailPageProps) {
  const viewer = await getViewer();
  if (!canManageLeaderHandovers(viewer)) return <AccessDenied homeHref={roleHome(viewer.role)} />;

  const { handoverId } = await params;
  const handover = await getLeaderHandoverDetail(handoverId);
  if (!handover) notFound();

  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      {/*
        ⚠️ **상세 폭은 1440이다**(§DESIGN 4 — detail). 960으로 묶어 뒀더니 넓은 화면에서
           가운데 좁은 기둥 하나만 서고 좌우가 통째로 비었다 — 960은 **폼**의 폭이지
           표가 있는 상세의 폭이 아니다.
      */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        <div>
          <h2 className="text-[22px] leading-[30px] font-semibold tracking-[-0.4px]">
            {handover.title}
          </h2>
          <p className="text-muted-foreground pt-1 text-[13px] leading-5">
            {handover.formerLeaderName} · {handover.teamName}
          </p>
        </div>

        {/*
          ⚠️ **두 칸으로 가른다**(§DESIGN 4 — detail 2컬럼). 위아래로 쌓아 두니 폭을 넓히는 순간
             카드 둘이 각각 가로로만 늘어나 안이 헐거워졌다 — 왼쪽은 **읽는 것**(담긴 액션 표),
             오른쪽은 **하는 것**(귀속)이다. 글은 왼쪽에서 오른쪽으로 읽으므로 무엇이 담겼는지
             먼저 보고, 그다음에 누구에게 넘길지 고르는 순서가 된다.
          ⚠️ 곁 컬럼은 360px 고정이다. 비율로 두면 화면 폭에 따라 셀렉트·버튼이 늘었다 줄었다 한다.
          ⚠️ 좁은 화면에서는 한 줄로 떨어진다(`lg:`) — 그때는 하는 것이 위로 온다.
        */}
        <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <LeaderHandoverActionList actions={handover.actions} />
          </div>
          <div className="lg:w-[360px] lg:shrink-0">
            <LeaderHandoverAssignForm handover={handover} />
          </div>
        </div>
      </div>
    </main>
  );
}
