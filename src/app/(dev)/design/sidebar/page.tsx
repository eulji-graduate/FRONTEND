import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NavPreview } from "@/features/shell/components/nav-preview";

export const metadata: Metadata = {
  title: "권한별 사이드바",
};

/**
 * 개발용 — 역할별 사이드바를 한 화면에 늘어놓는다.
 *
 * ⚠️ **명세에 없는 화면이다**(§라우트 그룹). 제품 화면이 아니라 배치를 비교하려고 둔 것이라,
 *    `(dev)` 그룹에 따로 두고 화면 안에도 개발용이라고 적는다 — 다음 사람이 제품 화면으로
 *    알고 링크를 걸면 안 된다.
 * ⚠️ **프로덕션에서는 없는 화면이다.** 로그인 없이 열리는 자리라 그대로 두면 역할별 메뉴
 *    구성이 통째로 드러난다 — 어떤 관리 기능이 있는지, 누가 무엇을 보는지가 다 적혀 있다.
 *    라우트 보호(`middleware.ts`)를 새로 두는 대신 여기서 404를 낸다: 개발용 화면 하나
 *    때문에 전역 가드를 켜면 개발 중 화면 확인이 막힌다(팀 결정).
 * ⚠️ 사이드바 어디에서도 여기로 가는 길을 두지 않는다. 주소를 아는 사람만 본다.
 * ⚠️ 지울지는 팀이 정한다. 배포 대상이 아니면 `(dev)` 폴더째 지우면 끝난다.
 */
export default function DesignSidebarPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <NavPreview />;
}
