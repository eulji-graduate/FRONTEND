import { ListChecks } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

/**
 * 개인 액션 상세 전용 상단바.
 *
 * ⚠️ 이 도메인엔 **목록이 없다**(프로젝트 타임라인·대시보드에서만 들어온다). 전에는 그래서
 *    뒤로가기를 안 두고 본문 경로 줄에 맡겼는데, 그 줄을 걷어내면서(제목 위에 경로를 한 줄 더
 *    쓰지 않는다) **돌아갈 길이 아예 없어졌다.**
 * ⚠️ 화살표는 이제 **왔던 길**로 간다(`BackLink`) — 타임라인에서 왔으면 타임라인으로,
 *    대시보드에서 왔으면 대시보드로 돌아간다. 아래 `href`는 주소로 바로 들어왔을 때만 쓰는
 *    자리다. 목록이 없으니 그 액션이 속한 **프로젝트 쪽**으로 올려보낸다.
 */
export default function ActionsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader
        title="액션"
        icon={ListChecks}
        backTo={{ href: "/app/projects", label: "프로젝트" }}
      />
      {children}
    </>
  );
}
