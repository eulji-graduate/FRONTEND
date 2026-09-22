import type { ReactNode } from "react";

import { AnalysisProgressCard } from "@/features/notification/components/analysis-progress-card";
import { NotificationProvider } from "@/features/notification/notification-provider";
import { guardWorkspaceEntry } from "@/features/onboarding/guard";
import { shouldShowPasswordChangeBanner } from "@/features/profile/server";
import { RoleSidebar } from "@/features/shell/components/role-sidebar";
import { dashboardFor, navFor } from "@/features/shell/nav-config";
import { getViewer } from "@/features/shell/viewer";

/*
  ⚠️ 로그인 뒤 화면은 전부 사람마다 데이터가 다르다 — 정적으로 굳히면 build 시점에 그린
     누군가의 화면이 HTML로 박제돼 다음 사람에게 그대로 나간다(`api.ts`가 `no-store`를 기본으로
     두는 것과 같은 이유). 이 그룹 하위 전체가 이 한 줄로 덮인다 — 페이지마다 따로 안 붙인다.
*/
export const dynamic = "force-dynamic";

/**
 * 로그인 뒤 화면이 모두 쓰는 셸 — **사이드바는 여기 한 번만** 그린다.
 *
 * ⚠️ `(role)`(역할·관리 화면) · `(app)`(공용 워크벤치)이 이 아래에 나란히 들어온다.
 *    괄호는 URL에 안 들어가므로 주소는 `/owner`·`/manage/billing`·`/app/meeting`이다.
 *    두 그룹을 오갈 때 사이드바가 다시 마운트되지 않아 깜빡이지 않는다.
 * ⚠️ 역할마다 **레이아웃이 아니라 `sections`만** 갈아 끼운다(CLAUDE.md §라우트 그룹).
 *    지금은 OWNER 구성뿐이다 — 로그인이 붙으면 세션의 역할로 고른다(지금 사용자는 목).
 */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  /*
    ⚠️ 둘을 **같이 기다린다.** 앞뒤로 세우면 사이드바 하나 그리는 데 두 번 기다린다.
    ⚠️ 사용자는 `getViewer()`가 준다 — 전에는 여기에 `{ name: "대표 계정", role: OWNER }`를
       손으로 적고 있었다. 로그인이 붙으면 그 파일 하나만 바뀐다(#67).
       반대로 **사용자를 못 읽으면 그건 터뜨린다.** 누군지 모르는 채로 그린 사이드바는
       메뉴·권한이 틀린 화면이라, 조용히 넘기면 더 나쁘다.
  */
  /*
    ⚠️ **온보딩을 안 끝냈으면 워크스페이스에 못 들어온다.** 부서·직급이 하나도 없는 회사에서
       셸을 그리면 사이드바 메뉴는 뜨는데 안쪽 화면마다 빈 목록이 나온다 — 무엇이 잘못됐는지
       알 수 없는 상태다. 판정은 `isOnboarded`(BE가 매번 DB에서 읽는 값) 하나로 끝난다.
    ⚠️ `redirect`는 예외를 던진다 — `Promise.all` **앞**에서 끝낸다.
  */
  await guardWorkspaceEntry();

  const [viewer, showPasswordChangeBanner] = await Promise.all([
    getViewer(),
    shouldShowPasswordChangeBanner(),
  ]);
  /*
    ⚠️ **역할이 목록을 정한다.** 전에는 `OWNER_NAV` 하나를 모두에게 줘서, 팀장·사원으로
       로그인해도 대표 메뉴가 그대로 떴다. `is_admin` 겸직도 아무 표시가 없었다.
    ⚠️ **"공지" 항목 점은 여기서 안 켠다**(2026-08-16, #602 후속). 예전엔 `getUnreadNoticeCount()`
       (실서버 미구현이라 늘 0)로 이 자리에서 계산했는데, 이제 `RoleSidebar`가 종 드롭다운의
       안 읽은 알림으로 직접 켠다(`role-sidebar.tsx`) — `sections`는 정적 구성 그대로 넘긴다.
  */
  const sections = navFor(viewer);

  return (
    // ⚠️ `h-screen-z` — 화면 배율이 걸려도 셸이 아래에서 안 잘린다(DECISIONS §화면 배율)
    /*
      ⚠️ **알림은 셸이 쥔다**(#442). 회의를 끝내고 화면을 옮겨도 요약 진행 카드가 따라오려면
         상태가 화면이 아니라 여기 있어야 한다 — 캡처 화면이 들고 있으면 목록으로 가는 순간
         언마운트돼 사라져서, 몇 초 만에 사라지던 예전 토스트와 똑같아진다.
      ⚠️ SSE 연결도 **여기 하나뿐**이다(`useNotificationStream`). 화면마다 열면 같은 알림이
         배너에 여러 줄 뜬다 — BE가 회원당 emitter 전부에 복사해 보내기 때문이다.
      ⚠️ 클라이언트 프로바이더가 **`children`을 감싼다**(§렌더링·데이터 — client가 server를
         import하지 않고 `children`으로 받는다). 안쪽 화면은 그대로 서버 컴포넌트다.
    */
    <div className="app-shell bg-background h-screen-z flex overflow-hidden">
      {/*
        ⚠️ **사이드바도 이 안으로 들어왔다**(2026-08-16, #602 후속). "내 회의"·"공지" 점을
           `RoleSidebar`가 종 드롭다운의 안 읽은 알림에서 직접 읽으려면 그 컨텍스트
           안에 있어야 한다 — `NotificationProvider`는 컨텍스트·쿼리 클라이언트만 얹을 뿐
           DOM 래퍼가 없어서, 감싸는 자리를 옮겨도 flex 레이아웃은 그대로다.
      */}
      <NotificationProvider
        memberId={viewer.id}
        showPasswordChangeNotice={showPasswordChangeBanner}
      >
        <RoleSidebar sections={sections} home={dashboardFor(viewer.role)} user={viewer} />

        {/*
          상단바는 여기서 그리지 않는다 — 제목·액션이 도메인마다 달라서
          각 도메인의 `layout.tsx`가 `PageHeader`를 그린다.
          ⚠️ **점 그리드를 깔지 않는다**(2026-08-05 변경). 로그인 뒤 일하는 화면이라 바탕이
             조용해야 표·카드가 먼저 읽힌다 — 온보딩·결제·랜딩은 처음 만나는 화면이라 그대로 둔다.
          ⚠️ 대신 **사이드바·상단바·본문을 `bg-background` 한 색으로 묶고 카드만 띄운다.**
             라이트에서 `--background`와 `--card`가 둘 다 흰색이라, 바탕을 안 내리면 카드와
             바탕을 나누는 게 보더선 하나뿐이라 화면이 통째로 하얗게 뜬다.
             ⚠️ **본문만 내리면 안 된다.** 그러면 껍데기와 본문이 서로 다른 색이 되어
             화면이 셋으로 조각나 보인다(DECISIONS §셸 표면에 적힌 첫 실패). 넷을 한 색으로
             두고, 나누는 건 **선 하나**(사이드바 오른쪽·상단바 아래)에 맡긴다.
        */}
        {/*
          ⚠️ **본문을 덮던 오버레이가 없어졌다**(2026-08-16, #602 후속). 회의 개설·리마인더·
             취소·공지는 `PageHeader`의 종(`NotificationBell`) 드롭다운으로, 발급받은 비밀번호
             안내도 그 목록 안 항목 하나(`showPasswordChangeNotice`)로 옮겼다 — 흐름 밖
             오버레이 div 자체가 더는 필요 없다.
        */}
        <div className="bg-background relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
        {/* 요약 진행 — 우하단 고정이라 어느 화면에 있든 같은 자리에 남는다 */}
        <AnalysisProgressCard />
      </NotificationProvider>
    </div>
  );
}
