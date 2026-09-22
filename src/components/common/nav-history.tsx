"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * 이 탭에서 **앱 안으로 몇 칸 들어왔는지**.
 *
 * ⚠️ **불리언이 아니라 칸수다**(2026-08-10 고침). 전에는 "한 번이라도 움직였는가"만 봤는데,
 *    그 값은 **뒤로 간 뒤에도 안 줄었다** — 주소로 바로 연 목록에서 상세로 들어갔다가
 *    브라우저 뒤로가기로 목록에 돌아오면, 앱 안 이력이 다 소진됐는데도 여전히 참이라
 *    상단바 뒤로가기가 **앱 밖으로 나가 버렸다**. 들어온 만큼 나가면 0으로 돌아와야 한다.
 * ⚠️ 모듈 변수다 — 새로고침하면 0이 된다. 그게 맞다: 새로고침 뒤의 "뒤로"는 같은 화면으로
 *    돌아가는 것이라 이력이 없는 것과 같다.
 * ⚠️ `history.state.idx`를 쓰지 않는다. Next 16의 상태에는 그 값이 없다(내부 트리만 들어 있다) —
 *    실측으로 확인했다.
 */
let depth = 0;

/**
 * 방금 도착한 화면이 **뒤로/앞으로 눌러서** 온 것인지.
 *
 * ⚠️ `popstate`는 경로가 바뀌기 **전에** 온다. 표시를 남겨 뒀다가 경로가 바뀔 때 읽어야
 *    그 이동이 새로 들어간 것인지 되돌아온 것인지 가릴 수 있다.
 */
let arrivedByPop = false;

/**
 * 우리 주소에서 넘어왔고, **그 탭에 실제로 뒤로 갈 자리가 있는지**.
 *
 * ⚠️ **`startsWith`로 비교하지 않는다.** 경계 검사가 없어서 `https://z.example`이
 *    `https://z.example.evil.com`에도 걸린다 — 밖에서 들어온 사람을 "앱 안에서 왔다"고
 *    판정하면 뒤로가기가 그 바깥 사이트로 되돌아간다. `URL`로 파싱해 origin을 통째로 맞춘다.
 * ⚠️ **`history.length`를 함께 본다.** referrer가 우리 주소라고 뒤로 갈 자리가 있는 건
 *    아니다 — ⌘·가운데 클릭으로 새 탭에 열면 referrer는 그대로 넘어오지만 그 탭의 이력은
 *    한 칸뿐이다. 그때 `back()`을 부르면 링크 이동만 취소되고 아무 일도 안 일어나
 *    **버튼이 죽은 것처럼 보인다**(새 탭에서는 `href`로 가야 한다).
 * ⚠️ 이건 **문서를 통째로 새로 연 경우**만 본다(랜딩에서 링크를 눌러 들어온 것 등).
 *    앱 안에서 클라이언트로 옮겨 다닌 것은 `depth`가 센다 — 그때 `referrer`는 처음 문서의
 *    값 그대로 남아 있어서, 뒤로 가서 이력을 다 쓴 뒤에도 참으로 남지 않는다.
 */
function cameFromSameOrigin(): boolean {
  if (typeof document === "undefined" || !document.referrer) return false;
  if (window.history.length <= 1) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** 뒤로가기가 **왔던 길**로 갈 수 있는 상태인지 */
export function hasInAppHistory(): boolean {
  return depth > 0 || cameFromSameOrigin();
}

/**
 * 경로가 바뀔 때마다 칸수를 세는 잎사귀 — 화면에는 아무것도 안 그린다.
 *
 * ⚠️ **첫 렌더는 세지 않는다.** 그 화면에 막 들어온 것이지 이동한 게 아니다 — 주소로 바로
 *    들어온 사람에게 뒤로가기가 앱 밖으로 나가 버리면 안 된다.
 * ⚠️ **쿼리만 바뀌는 이동은 못 센다**(`usePathname`은 검색 문자열을 안 본다). 여기서
 *    `useSearchParams`를 쓰면 루트 레이아웃이 통째로 동적이 되므로 안 쓴다 —
 *    대신 **덜 세는 쪽**이라 판정이 틀려도 `href`로 떨어진다(앱 밖으로 나가지 않는다).
 *    탭 전환(`?tab=`)에서 뒤로가기가 한 칸 위로 가는 것이 그 대가다.
 */
export function NavHistoryTracker() {
  const pathname = usePathname();
  const isFirst = useRef(true);

  useEffect(() => {
    function markPop() {
      arrivedByPop = true;
    }
    window.addEventListener("popstate", markPop);
    return () => window.removeEventListener("popstate", markPop);
  }, []);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (arrivedByPop) {
      arrivedByPop = false;
      // ⚠️ 앞으로 가기도 `popstate`라 같이 줄어든다 — 덜 세는 쪽이라 안전하다(위 주석).
      depth = Math.max(0, depth - 1);
      return;
    }
    depth += 1;
  }, [pathname]);

  return null;
}
