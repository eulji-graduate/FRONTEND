import { Users } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

/**
 * ⚠️ 제목은 사이드바와 **같은 말**(`구성원`)이다. 시안에는 `사람`이라고 적혀 있는데 그건
 *    옛 라벨이라, 그대로 두면 사이드바에서 누른 항목과 도착한 화면의 이름이 다르다.
 * ⚠️ 아이콘도 사이드바의 `people` 아이콘과 같은 `Users`다 — 다른 걸 쓰면 같은 화면이
 *    두 얼굴이 된다.
 * ⚠️ 사이드바에서 바로 닿는 화면이라 뒤로가기를 두지 않는다(§PageHeader).
 */
export default function PeopleLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="구성원" icon={Users} />
      {children}
    </>
  );
}
