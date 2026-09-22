"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { LeaveGuard } from "@/components/common/leave-guard";

interface ReviewLeaveGuardProps {
  /** 확정 전이면 true — 사이드바 이동·뒤로 가기·탭 닫기를 전부 막는다. */
  isBlocked: boolean;
}

/**
 * 리뷰 화면 전용 이탈 방지 — [액션 분배 확정] 전에 나가려 하면 확인창을 한 번 거친다.
 * 막는 게 아니라 **확인**이다 — [나가기]를 고르면 그대로 나간다.
 *
 * ⚠️ **왜 확인을 받나:** 나가면 확정 안 된 초안(담당자·일정 수정, 반려, 직접 추가)이
 *    사라진다는 걸 미리 알려야 한다(사용자 확정, 2026-08-07). 미확정 액션은 "마이페이지"에서
 *    이어서 처리할 수 있다(같은 이슈에서 잇는 화면). ⚠️ **"내 액션"이 아니라 "마이페이지"다**
 *    (2026-08-07 정정) — "내 액션"(`/app/my/actions`)은 Owner가 접근 못 하는데, 회의
 *    Host는 Owner일 수 있어 Owner도 반드시 볼 수 있는 자리가 필요하다. 그래서 셸 공용 사이드바를 고치는 대신
 *    **이 화면 안에서 클릭·뒤로가기를 가로채는 쪽**을 택했다(공유 셸은 셸 담당자 영역 —
 *    CLAUDE.md §작업 영역).
 * ⚠️ **탭 닫기/새로고침/주소창 이동**은 `beforeunload`가 다른 종류의 이벤트라 별도로
 *    막는다(App Router의 클라이언트 내비게이션은 언로드가 아니라서 안 걸린다) —
 *    기존 `LeaveGuard`를 그대로 재사용한다.
 * ⚠️ **뒤로 가기**는 `popstate`가 이미 주소를 옮긴 뒤에 온다. 감시를 켤 때 더미 히스토리
 *    항목을 하나 더 쌓아 두고, 뒤로 가기가 오면 그 더미만 소비되게 해 주소가 안 바뀌도록
 *    막은 다음 확인창을 띄운다 — 취소하면 더미를 다시 쌓는다.
 * ⚠️ **나가기를 고를 때 `go(-2)`를 쓴다, `back()`(1칸) 아니다** — 더미가 원래 있던 진입
 *    이력과 **같은 주소**라서 1칸만 가면 더미만 사라지고 화면은 그대로다(실제로 안 나가짐).
 *    더미 + 진입 당시 항목까지 2칸을 지나야 진짜 이전 화면이 나온다.
 */
export function ReviewLeaveGuard({ isBlocked }: ReviewLeaveGuardProps) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingBack, setPendingBack] = useState(false);
  const bypassBackRef = useRef(false);
  /**
   * ⚠️ **Strict Mode 이중 실행 대비**(2026-08-10 버그#308). 개발 모드에서 React가 아래
   * popstate effect를 mount→cleanup→mount로 두 번 도는데, 1차 클린업의 `history.back()`이
   * 만드는 `popstate`는 비동기라 2차 mount가 새로 단 리스너가 이걸 "진짜 사용자가 뒤로
   * 갔다"로 착각해 진입 즉시 모달을 띄운다. `useRef`는 이 이중 실행 동안 값이 유지되므로,
   * 클린업이 `back()`을 부르기 직전에 표시해 두고 다음 리스너가 자기 신호를 구분해 무시한다.
   */
  const suppressNextPopRef = useRef(false);

  const isOpen = pendingHref !== null || pendingBack;

  // 사이드바를 포함한 모든 내부 링크 클릭을 가로챈다(캡처 단계 — Link 자체 핸들러보다 먼저 받는다).
  useEffect(() => {
    if (!isBlocked) return;

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return; // 새 탭으로 열려는 시도는 그대로 둔다
      }
      const anchor = (event.target as HTMLElement).closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      // ⚠️ 외부 링크·다운로드 링크는 그대로 둔다 — `router.push`는 우리 앱 내부 경로만
      //    다룰 수 있다. origin이 다르면 절대 URL을 넘겨도 이동이 깨진다.
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (anchor.origin !== window.location.origin) return;
      if (anchor.href === window.location.href) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${anchor.pathname}${anchor.search}${anchor.hash}`);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isBlocked]);

  // 뒤로 가기 — 더미 히스토리 항목으로 한 번 흡수한 뒤 확인창을 띄운다.
  useEffect(() => {
    if (!isBlocked) return;

    const hrefAtMount = window.location.href;
    window.history.pushState(null, "", hrefAtMount);

    function handlePopState() {
      if (suppressNextPopRef.current) {
        // 우리 자신의 클린업이 만든 back() — 사용자가 뒤로 간 게 아니니 조용히 넘긴다.
        suppressNextPopRef.current = false;
        return;
      }
      if (bypassBackRef.current) {
        bypassBackRef.current = false;
        return;
      }
      window.history.pushState(null, "", window.location.href);
      setPendingBack(true);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      // ⚠️ [확정]으로 화면이 바뀌어 언마운트된 경우(주소가 그대로다) 더미를 청산한다 —
      //    안 지우면 나중에 뒤로 가기를 두 번 눌러야 실제로 벗어난다. 링크·뒤로가기로 이미
      //    나간 경우는 주소가 바뀌어 있어 이 조건에 걸리지 않는다(중복 소비 방지).
      if (window.location.href === hrefAtMount) {
        suppressNextPopRef.current = true;
        window.history.back();
      }
    };
  }, [isBlocked]);

  function handleStay() {
    setPendingHref(null);
    setPendingBack(false);
  }

  function handleLeave() {
    if (pendingHref) {
      // ⚠️ `push`가 아니라 `replace`다 — 마운트 시 쌓은 더미 위에 새 경로를 또 쌓으면
      //    나간 뒤 뒤로 가기를 눌렀을 때 이 리뷰 화면을 한 번 더 거친다. `replace`는
      //    그 더미 자리를 목적지로 바꿔치기해 여분 없이 나간다.
      router.replace(pendingHref);
    } else if (pendingBack) {
      // ⚠️ 한 칸만 뒤로 가면 마운트 시 쌓아 둔 더미(같은 URL)에만 닿아 제자리다 —
      //    더미 한 칸 + 원래 있던 진입 이력 한 칸, 총 두 칸을 지나야 실제로 나간다.
      bypassBackRef.current = true;
      window.history.go(-2);
    }
    setPendingHref(null);
    setPendingBack(false);
  }

  return (
    <>
      <LeaveGuard hasUnsaved={isBlocked} />
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={(open) => !open && handleStay()}
        title="이 화면을 나갈까요?"
        description={
          <>
            확정하지 않으면 액션이 분배되지 않습니다.
            <br />
            미확정 상태로 나가도 &lsquo;마이페이지&rsquo;에서 이어서 처리할 수 있습니다.
          </>
        }
        confirmLabel="나가기"
        isDestructive
        onConfirm={handleLeave}
      />
    </>
  );
}
