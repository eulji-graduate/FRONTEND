import { StatusActionLink, StatusScreen } from "@/components/common/status-screen";

interface AccessDeniedProps {
  /** 돌아갈 곳 — 권한마다 집이 다르다(`roleHome`). */
  homeHref: string;
  /** 무엇을 못 여는지. 화면 이름을 그대로 넣지 않는다 — "이 화면"으로 충분하다. */
  title?: string;
  description?: string;
}

/**
 * 403 — **권한이 없어 못 여는 화면.**
 *
 * ⚠️ **`notFound()`로 때우지 않는다**(2026-08-11). 권한이 없는 화면에 `찾을 수 없습니다`를
 *    띄우면 화면이 거짓말을 한다(§정직성) — 주소는 맞는데 자격이 없는 것이라, 그 둘은 다음에
 *    할 일이 다르다. 없는 주소는 고쳐 봐야 소용없고, 권한은 **요청하면 열린다.**
 * ⚠️ 404·401과 **한 벌**이다(`StatusScreen`). 셸 안에서 뜨므로 화면 높이가 아니라
 *    남은 높이를 채운다 — 사이드바가 남아 있어야 나갈 길이 뒤로가기 하나로 줄지 않는다.
 * ⚠️ **없는 리소스는 여전히 `notFound()`다.** 남의 회사 문서 id를 찍어 봤을 때까지 "권한이
 *    없습니다"라고 답하면, 그 id가 **있다는 사실**을 알려 주는 셈이다.
 */
export function AccessDenied({ homeHref, title, description }: AccessDeniedProps) {
  return (
    <StatusScreen
      isInsideShell
      code="403"
      title={title ?? "접근 권한이 없습니다"}
      description={
        description ??
        "이 화면은 허용된 권한에서만 열 수 있습니다. 권한이 필요하시면 대표 또는 관리자에게 요청해 주세요."
      }
      action={<StatusActionLink href={homeHref} label="내 대시보드로 가기" />}
    />
  );
}
