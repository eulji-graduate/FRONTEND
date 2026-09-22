import type { Metadata } from "next";

import { StatusActionLink, StatusScreen } from "@/components/common/status-screen";

export const metadata: Metadata = {
  title: "찾을 수 없는 화면 — Z",
};

/**
 * 없는 주소로 들어왔을 때(404).
 *
 * ⚠️ Next 기본 화면을 그대로 두지 않는다 — 회색 영문 화면이 뜨면 우리 서비스가 아닌 것처럼 보인다.
 * ⚠️ 셸을 쓰지 않는다. 어떤 라우트 그룹에서 떨어졌는지 알 수 없어, 이 화면만은 혼자 선다.
 * ⚠️ 401·403과 **같은 생김새**를 쓴다(`StatusScreen`) — 셋은 사용자에게 같은 순간이다.
 */
export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="요청하신 화면을 찾을 수 없습니다"
      description="주소가 변경되었거나 삭제된 화면입니다. 주소를 다시 확인해 주세요."
      action={<StatusActionLink href="/" label="홈으로 가기" />}
    />
  );
}
