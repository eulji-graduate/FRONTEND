import type { Metadata } from "next";

import { DocPage } from "@/features/landing/components/doc-page";
import { PrivacyContent } from "@/features/legal/privacy-content";

export const metadata: Metadata = { title: "개인정보처리방침 — Z" };

/** ⚠️ 본문은 `features/legal`에 있다 — 모달도 같은 글을 쓴다. */
export default function PrivacyPage() {
  return (
    <DocPage title="개인정보처리방침" description="어떤 정보를 왜 다루는지 적어 둡니다.">
      <PrivacyContent />
    </DocPage>
  );
}
