"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { retryMeetingSummaryAction } from "@/features/meeting/summary/actions";

import { fetchAnalysisStatusAction } from "./actions";
import {
  advance,
  ANALYSIS_POLL_INTERVAL_MS,
  expire,
  isExpired,
  isSettled,
  restart,
  restoreTracking,
  shouldPoll,
  startTracking,
} from "./analysis";
import { NOTIFICATION_DESTINATION } from "./destinations";
import { type NotificationEnvelope, toAnalysisSignal, toBannerNotification } from "./event";
import {
  dismissPasswordNotice,
  isPasswordNoticeDismissed,
  passwordNoticeId,
} from "./password-notice";
import {
  ANALYSIS_CARD_STATE,
  type AnalysisTracking,
  LOCAL_NOTIFICATION_KIND,
  type NotificationItem,
} from "./types";
import { useNotificationStream } from "./use-notification-stream";

/**
 * 알림 상태를 쥐고 있는 자리 — **셸에 한 번만** 마운트한다(`app/(shell)/layout.tsx`).
 *
 * ⚠️ **왜 화면이 아니라 셸인가.** 카드의 존재 이유가 "회의를 끝내고 다른 일을 해도 진행이
 *    따라온다"이다. 캡처 화면이 들고 있으면 목록으로 옮기는 순간 언마운트돼 사라진다 —
 *    지금 토스트와 똑같아진다.
 * ⚠️ **스트림도 여기 하나뿐이다.** 화면마다 열면 같은 알림이 배너에 여러 줄 뜬다
 *    (BE는 회원당 emitter 리스트 전부에 복사해 보낸다).
 */

interface NotificationContextValue {
  /** 종 드롭다운에 뜨는 목록 — 최신순 */
  notifications: NotificationItem[];
  /** 읽지 않은 개수 — 종 오른쪽 위 빨간 점을 이 값으로 켠다 */
  unreadCount: number;
  /**
   * 안 읽은 알림이 가리키는 목적지 집합 — 사이드바 "내 회의"·"공지" 점을 이 값으로 켠다
   * (`role-sidebar.tsx`). `NOTIFICATION_DESTINATION`과 같은 맵으로 구한다 — 종 목록이
   * 가는 곳과 사이드바가 켜지는 조건이 다른 맵이면 둘이 어긋난다.
   */
  unreadDestinations: Set<string>;
  /** 읽음 처리는 서버 API가 없다 — 리액트 쿼리 캐시에서만 뒤집는다 */
  markNotificationRead: (id: string) => void;
  /** 목록에서 지운다 — 서버에 삭제 API가 없다, 캐시에서 줄만 뺀다 */
  removeNotification: (id: string) => void;
  tracking: AnalysisTracking | null;
  /**
   * 회의 종료 직후 캡처 화면이 부른다 — 이 순간부터 카드가 뜬다.
   * ⚠️ `meetingId`는 **화면이 쓰는 문자열 id 그대로** 넘긴다(`Number()`로 바꾸지 않는다 —
   *    목 id가 `NaN`이 되어 카드가 멈춘다, `types.ts` 주석).
   */
  trackAnalysis: (meetingId: string, title: string) => void;
  dismissAnalysis: () => void;
  retryAnalysis: () => void;
  /**
   * 진짜 재분석(ANLZ-02) — `FAILED` 카드 전용. `retryAnalysis`(상태 재조회)와 다른 일이다 —
   * 이건 서버에 "실패한 계층부터 다시 돌려라"를 실제로 요청한다.
   */
  retryFailedSummary: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * ⚠️ **없으면 던진다.** 셸 밖(랜딩·온보딩)에서 부르면 카드가 조용히 안 뜨는데, 그건
 *    "종료했는데 아무 일도 안 일어난 화면"이라 원인을 못 찾는다(§정직성).
 */
export function useNotificationCenter(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("NotificationProvider 안에서만 쓸 수 있습니다.");
  return value;
}

/** 종 목록에 쌓아 두는 최대 줄 수 — 넘으면 오래된 것부터 밀려난다 */
const MAX_NOTIFICATIONS = 20;

/** ⚠️ 탭을 닫으면 같이 사라져야 한다 — `sessionStorage`인 이유는 `analysis.ts` 주석 참고 */
const TRACKING_STORAGE_KEY = "z:analysis-tracking";

/** 종 목록 캐시 키 — `NotificationBell`도 같은 프로바이더 트리 안이라 이 키를 다시 구독할 일이 없다 */
const NOTIFICATION_LIST_QUERY_KEY = ["notification-center", "list"] as const;

interface NotificationCenterProviderProps {
  children: ReactNode;
  /** 임시 비밀번호 항목의 종 목록 id·`localStorage` 키를 만드는 데 쓴다 */
  memberId: number | null;
  /** `/me`의 `passwordChanged: false` — 예전 `PasswordChangeBanner`가 켜지던 조건 그대로 */
  showPasswordChangeNotice: boolean;
}

function NotificationCenterProvider({
  children,
  memberId,
  showPasswordChangeNotice,
}: NotificationCenterProviderProps) {
  const queryClient = useQueryClient();
  /*
    ⚠️ **BE에 알림 목록 조회 API가 없다** — SSE로 들어오는 대로 이 캐시에 쌓기만 한다.
       그래서 `queryFn`은 절대 다시 안 불려야 한다(다시 불리면 쌓아 둔 목록이 빈 배열로
       덮인다) — `refetchOn*`을 전부 끈다. `staleTime`은 "그룹웨어라 몇 분은 봐도 되는
       화면"이라는 감으로 5분을 준다(실제로 재조회를 안 하니 상한이라기보다 의도 표시에
       가깝다), `gcTime`은 탭을 잠깐 벗어나도(다른 화면 이동) 쌓아 둔 목록이 안 날아가게
       30분으로 넉넉히 둔다.
  */
  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: NOTIFICATION_LIST_QUERY_KEY,
    queryFn: () => [],
    initialData: [],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const addNotification = useCallback(
    (notification: NotificationItem) => {
      queryClient.setQueryData<NotificationItem[]>(NOTIFICATION_LIST_QUERY_KEY, (prev = []) => {
        /* 재연결로 같은 알림이 다시 오면 한 줄로 접는다(§목록 — id로 중복을 거른다) */
        if (prev.some((item) => item.id === notification.id)) return prev;
        return [notification, ...prev].slice(0, MAX_NOTIFICATIONS);
      });
    },
    [queryClient],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      queryClient.setQueryData<NotificationItem[]>(NOTIFICATION_LIST_QUERY_KEY, (prev = []) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
    },
    [queryClient],
  );

  const removeNotification = useCallback(
    (id: string) => {
      queryClient.setQueryData<NotificationItem[]>(NOTIFICATION_LIST_QUERY_KEY, (prev = []) =>
        prev.filter((item) => item.id !== id),
      );
      /*
        ⚠️ **임시 비밀번호 항목만 지운 기록을 남긴다.** 서버가 `passwordChanged: false`를
           계속 주는 한 이 프로바이더는 마운트마다 같은 항목을 다시 만들어 넣는다 — 캐시에서만
           빼면 새로고침 한 번에 되살아난다(예전 `PasswordChangeBanner`와 같은 이유로
           `localStorage`에 남긴다).
      */
      if (memberId !== null && id === passwordNoticeId(memberId)) {
        dismissPasswordNotice(memberId);
      }
    },
    [queryClient, memberId],
  );

  /*
    ⚠️ **BE 알림이 아니라 여기서 합성해 넣는다** — SSE에는 이 값이 안 온다(`/me`의
       `passwordChanged`). 이미 지운 적 있으면(`localStorage`) 다시 안 넣는다.
    ⚠️ **`addNotification`이 중복을 막아 준다** — 같은 id가 이미 있으면 그대로 두므로,
       리렌더마다 이 효과가 다시 돌아도 목록에 두 번 안 쌓인다.
  */
  useEffect(() => {
    if (!showPasswordChangeNotice || memberId === null) return;
    if (isPasswordNoticeDismissed(memberId)) return;

    addNotification({
      id: passwordNoticeId(memberId),
      type: LOCAL_NOTIFICATION_KIND.PASSWORD_TEMP,
      /*
        ⚠️ **문장 사이에 줄바꿈을 직접 심는다**(2026-08-19, 가독성 지적). 팝오버 폭(320px)에서
           그냥 흘려보내면 어절 중간에서 꺾여 읽기 나쁘다 — 렌더링 쪽(`notification-bell.tsx`)의
           `whitespace-pre-line`이 이 줄바꿈을 그대로 살린다.
        ⚠️ **문장 자체도 줄였다**(같은 날 후속 — 원래 문구는 줄바꿈을 심어도 첫 문장이 혼자
           228px 폭을 넘어 3줄까지 늘어졌다). 뜻은 그대로 두고 "지금 쓰는 비밀번호는 발급받은
           비밀번호입니다" → "지금은 임시 비밀번호입니다"로 줄여 두 줄에 맞춘다.
      */
      message: "지금은 임시 비밀번호입니다.\n마이페이지에서 바꿔 주세요.",
      href: "/app/me",
      read: false,
      receivedAt: Date.now(),
    });
  }, [showPasswordChangeNotice, memberId, addNotification]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const unreadDestinations = useMemo(() => {
    const destinations = new Set<string>();
    for (const item of notifications) {
      if (item.read) continue;
      const destination = NOTIFICATION_DESTINATION[item.type];
      if (destination) destinations.add(destination);
    }
    return destinations;
  }, [notifications]);

  const [tracking, setTracking] = useState<AnalysisTracking | null>(null);

  /*
    ⚠️ **먼저 되살리고, 되살린 뒤부터 저장한다**(`features/onboarding/use-draft-sync.ts`와
       같은 순서). 반대로 하면 마운트 첫 렌더의 `null`이 보관함을 덮어써서, 새로고침할
       때마다 쫓던 회의가 날아간다.
    ⚠️ **마운트 뒤에 읽는다.** 렌더 중에 읽으면 서버가 그린 HTML과 어긋난다(hydration) —
       서버는 브라우저 저장소를 모른다. 한 번만 일어나는 동기화라 규칙을 끈다.
  */
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    const saved = restoreTracking(window.sessionStorage.getItem(TRACKING_STORAGE_KEY));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTracking(saved);

    setIsRestored(true);
  }, []);

  useEffect(() => {
    if (!isRestored) return;
    if (tracking) {
      window.sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(tracking));
    } else {
      window.sessionStorage.removeItem(TRACKING_STORAGE_KEY);
    }
  }, [isRestored, tracking]);

  /* ─────────────────────────────── 스트림 ─────────────────────────────── */

  const handleEvent = useCallback(
    (envelope: NotificationEnvelope) => {
      /*
      ⚠️ **여기가 소스 교체의 이음매였다.** `event.ts`의 `ANALYSIS_EVENT_STATE`가 채워지면서
         (2026-08-13, BE #460) `toAnalysisSignal`이 이제 실제 신호를 낸다 — 스트림이 카드를
         직접 움직이고, 폴링(`use-analysis-tracker`)은 스트림이 놓친 걸 늦게 잡는 보조가
         됐다. **카드·배너 컴포넌트는 한 줄도 안 바뀌었다.**
    */
      const signal = toAnalysisSignal(envelope);
      if (signal) {
        setTracking((prev) =>
          prev && prev.meetingId === signal.meetingId
            ? advance(prev, { ok: true, status: signal.status })
            : prev,
        );
        return;
      }

      const banner = toBannerNotification(envelope);
      if (!banner) return;
      addNotification({ ...banner, read: false, receivedAt: Date.now() });
    },
    [addNotification],
  );

  useNotificationStream(handleEvent);

  /* ─────────────────────────── 요약 진행 폴링(CAP-06) ─────────────────────────── */

  /*
    ⚠️ **한 번에 한 회의만 쫓는다.** 사람이 동시에 두 회의를 끝낼 수는 없고, 여러 장을
       쌓으면 화면 오른쪽 아래가 카드로 덮인다 — 새로 끝내면 앞 카드는 그 자리를 내준다.
  */
  const trackAnalysis = useCallback((meetingId: string, title: string) => {
    setTracking(startTracking(meetingId, title, Date.now()));
  }, []);

  const dismissAnalysis = useCallback(() => setTracking(null), []);

  const retryAnalysis = useCallback(() => {
    setTracking((prev) => (prev ? restart(prev, Date.now()) : prev));
  }, []);

  /*
    ⚠️ **`retryAnalysis`와 다른 함수다.** 저건 상태 조회를 다시 하는 것뿐이고(`UNAVAILABLE` 전용),
       이건 실제로 BE에 "실패한 계층부터 다시 돌려라"를 요청한다(ANLZ-02, `retryMeetingSummaryAction`
       — 마이페이지 「요약이 중단된 회의」의 [다시 분석]과 같은 액션). 성공하면 트래킹을
       `RUNNING`으로 되돌려 기존 폴링이 다시 진행 상황을 쫓게 한다.
    ⚠️ **`tracking`을 의존성에 둔다.** 요청 시점의 `meetingId`가 최신이어야 한다 — 그 사이
       다른 회의를 쫓기 시작했는데 옛 회의로 재분석을 걸면 안 된다.
  */
  const retryFailedSummary = useCallback(async () => {
    if (!tracking || tracking.state !== ANALYSIS_CARD_STATE.FAILED) return;
    const meetingId = tracking.meetingId;
    const result = await retryMeetingSummaryAction(meetingId);

    if (result.error) {
      toast.error(
        result.needsFullRerun
          ? "재개할 수 있는 지점이 없습니다. 회의를 다시 캡처해야 합니다."
          : result.error,
      );
      return;
    }

    if (result.pendingNote) toast(result.pendingNote);

    setTracking((prev) =>
      prev && prev.meetingId === meetingId ? restart(prev, Date.now()) : prev,
    );
  }, [tracking]);

  /*
    ⚠️ **의존성이 `tracking` 통째다.** 한 번 물어볼 때마다 `attempt`가 올라 새 객체가 되고,
       그때마다 이 효과가 다시 돌며 다음 한 번을 예약한다 — `setInterval` 하나로 돌리면
       응답이 늦을 때 요청이 겹쳐 쌓인다.
  */
  useEffect(() => {
    const current = tracking;
    if (!current || isSettled(current.state)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    /*
      ⚠️ **화살표 함수로 둔다.** `function` 선언은 끌어올려져서 위의 `if (!current) return`
         narrowing이 안쪽까지 안 따라온다(TS) — 타입을 느슨하게 푸는 대신 모양을 바꾼다.
    */
    const probe = async () => {
      const result = await fetchAnalysisStatusAction(current.meetingId, current.attempt);
      if (cancelled) return;
      /* 쫓는 회의가 그 사이 바뀌었으면(다른 회의를 끝냈다) 늦게 온 답은 버린다 */
      setTracking((prev) =>
        prev && prev.meetingId === current.meetingId ? advance(prev, result) : prev,
      );
    };

    /*
      ⚠️ **상한 판정을 타이머 안에서 한다.** 효과 본문에서 바로 `setTracking`을 부르면
         렌더가 연쇄로 한 번 더 돈다(`react-hooks/set-state-in-effect`) — 어차피 5초 뒤
         이 타이머가 깨어나므로 그 자리에서 접으면 된다.
      ⚠️ 접는 걸 빼먹으면 스피너가 영원히 돈다 — 그게 「요약 중」이라는 거짓말이다(§정직성).
    */
    const tick = () => {
      const now = Date.now();
      if (isExpired(current, now)) {
        setTracking((prev) =>
          prev && prev.meetingId === current.meetingId && !isSettled(prev.state)
            ? expire(prev)
            : prev,
        );
        return;
      }
      if (!shouldPoll(current, now, document.hidden)) return;
      void probe();
    };

    timer = setTimeout(tick, ANALYSIS_POLL_INTERVAL_MS);

    /*
      ⚠️ 숨은 탭에서는 예약이 지나가도 아무것도 안 한다 — 돌아오는 순간 이 핸들러가
         **기다리지 않고 바로** 한 번 물어본다. 안 그러면 화면을 다시 켰을 때 이미 끝난
         요약이 몇 초 더 「요약 중」으로 남는다.
    */
    const wake = () => {
      if (document.hidden) return;
      if (timer) clearTimeout(timer);
      tick();
    };

    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [tracking]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadDestinations,
        markNotificationRead,
        removeNotification,
        tracking,
        trackAnalysis,
        dismissAnalysis,
        retryAnalysis,
        retryFailedSummary,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

interface NotificationProviderProps {
  children: ReactNode;
  /**
   * 임시 비밀번호 안내를 넣으려면 필요하다 — 안 넘기면(테스트 등) 그 항목은 그냥 안 뜬다.
   * ⚠️ **기본값을 둔다.** 이 프로바이더를 직접 렌더하는 테스트가 이미 있어서(`.test.tsx`),
   *    필수로 만들면 그 테스트마다 값을 채워야 한다.
   */
  memberId?: number | null;
  showPasswordChangeNotice?: boolean;
}

/**
 * ⚠️ **쿼리 클라이언트는 이 프로바이더 안에서 만든다**(전역에 두지 않는다). 종 목록
 *    캐시가 여기서만 쓰이는 로컬 상태라 — 앱 전체 쿼리 클라이언트가 따로 필요해지면
 *    그때 루트로 올린다.
 */
export function NotificationProvider({
  children,
  memberId = null,
  showPasswordChangeNotice = false,
}: NotificationProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationCenterProvider
        memberId={memberId}
        showPasswordChangeNotice={showPasswordChangeNotice}
      >
        {children}
      </NotificationCenterProvider>
    </QueryClientProvider>
  );
}
