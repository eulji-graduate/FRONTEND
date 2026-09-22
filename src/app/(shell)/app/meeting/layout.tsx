import type { ReactNode } from "react";

import { MeetingHeader } from "@/features/meeting/components/meeting-header";

/** 서버 컴포넌트로 유지 — 경로 따라 뒤로가기만 바뀌는 부분을 클라이언트 잎사귀로 분리했다. */
export default function MeetingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MeetingHeader />
      {children}
    </>
  );
}
