import type { ReactNode } from "react";

import { NoticeHeader } from "@/features/notice/components/notice-header";

interface NoticeLayoutProps {
  children: ReactNode;
}

/** 서버 컴포넌트로 유지 — 경로에 따라 뒤로가기를 바꾸는 부분만 `NoticeHeader`(클라이언트 잎사귀)로 분리했다. */
export default function NoticeLayout({ children }: NoticeLayoutProps) {
  return (
    <>
      <NoticeHeader />
      {children}
    </>
  );
}
