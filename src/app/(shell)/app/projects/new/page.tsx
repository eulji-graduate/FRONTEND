import type { Metadata } from "next";
import Link from "next/link";

import { AccessDenied } from "@/components/common/access-denied";
import { createProjectAction } from "@/features/project/actions";
import { ProjectForm } from "@/features/project/components/project-form";
import { getCompanyTeamOptions } from "@/features/project/server";
import { roleHome } from "@/features/shell/home";
import { getViewer } from "@/features/shell/viewer";
import { canCreateProject } from "@/lib/permission";

export const metadata: Metadata = {
  title: "새 프로젝트",
};

export default async function AppProjectNewPage() {
  const viewer = await getViewer();
  /*
    ⚠️ 403이다 — 프로젝트를 누가 만드는지는 정책이라 숨길 값이 아니다(§정직성).
       서버 재검사는 **액션에서 한 번 더** 한다(§권한: 화면 가드는 UX일 뿐이다).
  */
  if (!canCreateProject(viewer)) return <AccessDenied homeHref={roleHome(viewer.role)} />;

  const teamOptions = await getCompanyTeamOptions();

  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      {/*
        ⚠️ **1440이다**(2026-08-11). 폼 한 장이라 720으로 뒀었는데, 사이드바로 오갈 때
           이 화면만 본문이 좁아져 튀었다 — 폭은 워크벤치 전체를 하나로 맞춘다.
        ⚠️ 대신 **긴 글 칸에는 상한을 건다**(폼 안에서). 한 줄이 1400px이면 눈이 다음 줄을 못 찾는다 —
           카드는 폭을 다 쓰되 안에서 본문/곁 두 칸으로 갈라 각 칸이 읽을 만한 폭을 갖는다.
        ⚠️ 폼 규격(720·960)을 안 쓰는 건 **팀 결정**이다(2026-08-11) — 사이드바로 오갈 때
           이 화면만 본문이 좁아져 튀는 게 더 나쁘다고 봤다.
      */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-[12px] leading-4">
            <Link href="/app/projects" className="hover:text-foreground">
              프로젝트
            </Link>{" "}
            &gt; 새 프로젝트
          </p>
          <h2 className="text-foreground text-[17px] leading-7 font-semibold tracking-[-0.3px]">
            새 프로젝트
          </h2>
        </div>

        <div className="border-border bg-card rounded-2xl border p-7">
          <ProjectForm
            action={createProjectAction}
            teamOptions={teamOptions}
            cancelHref="/app/projects"
          />
        </div>
      </div>
    </main>
  );
}
