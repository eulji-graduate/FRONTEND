import type { Metadata } from "next";

import { DocPage } from "@/features/landing/components/doc-page";
import { TermsContent } from "@/features/legal/terms-content";

export const metadata: Metadata = { title: "이용약관 — Z" };

/** ⚠️ 본문은 `features/legal`에 있다 — 모달도 같은 글을 쓴다. */
export default function TermsPage() {
  return (
    <DocPage title="이용약관" description="Z를 쓰실 때 적용되는 약속입니다.">
      <TermsContent />
    </DocPage>
  );
}
