"use client";

import {
  Bell,
  CalendarPlus,
  CalendarX,
  Clock,
  FileText,
  Info,
  KeyRound,
  type LucideIcon,
  X,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NOTIFICATION_TYPE } from "@/constants/notification";
import { cn } from "@/lib/utils";

import { NOTIFICATION_DESTINATION } from "../destinations";
import { useNotificationCenter } from "../notification-provider";
import { LOCAL_NOTIFICATION_KIND, type NotificationItem } from "../types";

const NOTIFICATION_ICON: Record<string, LucideIcon> = {
  [NOTIFICATION_TYPE.MEETING_CREATED]: CalendarPlus,
  [NOTIFICATION_TYPE.MEETING_REMINDER]: Clock,
  [NOTIFICATION_TYPE.MEETING_CANCELED]: CalendarX,
  [NOTIFICATION_TYPE.NOTICE_CREATED]: FileText,
  [LOCAL_NOTIFICATION_KIND.PASSWORD_TEMP]: KeyRound,
};

/**
 * 헤더 종 아이콘 — 누르면 펼쳐지는 알림 목록(회의 개설·리마인더·취소·공지·임시 비밀번호 안내).
 *
 * ⚠️ **상단을 덮던 배너를 대신한다**(2026-08-16, #602 후속). 이전엔 오는 즉시 본문 위에
 *    얹혀 화면을 가렸다 — 지금은 종에 표식만 켜고, 목록은 눌러야 나온다.
 * ⚠️ **"전체보기"가 없다.** 알림 화면은 팀이 안 만들기로 했다(CLAUDE.md §렌더링·데이터) —
 *    이 팝오버가 알림이 뜨는 유일한 자리다.
 * ⚠️ **읽음·삭제 둘 다 로컬뿐이다**(`../types.ts`의 `NotificationItem` 주석). 서버에 그 API가
 *    없어 새로고침하면 다시 뜬다 — 생기면 `markNotificationRead`·`removeNotification`을
 *    액션 호출로 바꾸면 된다(컴포넌트는 그대로 둔다, §Mock → Live 격리막과 같은 이유).
 */
export function NotificationBell() {
  const { notifications, unreadCount, markNotificationRead, removeNotification } =
    useNotificationCenter();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={unreadCount > 0 ? `알림, 읽지 않은 알림 ${unreadCount}개` : "알림"}
            className="relative"
          >
            <Bell />
            {/* ⚠️ 색으로 알리는 건 안 읽음뿐(사이드바 공지 점과 같은 표식, DESIGN §5) */}
            {unreadCount > 0 && (
              <span
                aria-hidden
                className="bg-destructive absolute top-1.5 right-1.5 size-[7px] rounded-full"
              />
            )}
          </Button>
        }
      />
      <PopoverContent align="end" sideOffset={8} className="w-80 gap-0 p-0">
        {/* ⚠️ 제목·부제를 한 줄에 나란히 둔다(2026-08-19) — 두 줄로 쌓으면 머리가 필요 이상 두꺼워진다 */}
        <div className="flex items-baseline justify-between gap-2 px-3.5 py-2.5">
          <p className="text-[14px] leading-5 font-semibold">알림</p>
          <p className="text-muted-foreground shrink-0 text-[12px] leading-4">
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : "새 알림이 없습니다"}
          </p>
        </div>

        {notifications.length === 0 ? (
          <p className="text-muted-foreground border-border border-t px-3.5 py-6 text-center text-[12px] leading-4">
            아직 온 알림이 없습니다.
          </p>
        ) : (
          <ul className="border-border max-h-80 overflow-y-auto border-t">
            {notifications.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onRead={markNotificationRead}
                onRemove={removeNotification}
              />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  item,
  onRead,
  onRemove,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const Icon = NOTIFICATION_ICON[item.type] ?? Info;
  const destination = NOTIFICATION_DESTINATION[item.type] ?? null;

  /*
    ⚠️ **시각을 뺐다**(2026-08-19, "점은 있어야 하는데 31분 전은 없어야" — 시각·점·X 셋을
       한 줄에 몰아넣은 게 오히려 더 지저분했다는 지적). 안 읽음 표시는 **아이콘 위 점 배지**
       하나로 충분하다 — 시각은 종 목록치고 그리 중요한 정보가 아니고(그래서 쓰던
       `date-fns` 상대 시각 계산도 통째로 없앤다), 빼고 나니 줄이 아이콘+메시지 하나로
       단순해진다.
    ⚠️ **원이 아니라 둥근 사각형이다**(2026-08-19 재수정). `EmptyState`가 이미 정해 둔
       규칙 — 원은 `ProfileAvatar`(사람) 전용이고, 사람이 아닌 아이콘은 둥근 사각형을
       쓴다. 원으로 담으면 "이 알림을 보낸 사람"처럼 은근히 잘못 읽힌다.
  */
  const rowContent = (
    <>
      <span className="bg-secondary relative flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Icon className="text-muted-foreground size-[18px]" aria-hidden />
        {!item.read && (
          <>
            <span
              className="bg-destructive border-popover absolute -top-1 -right-1 size-[9px] rounded-full border-2"
              aria-hidden
            />
            <span className="sr-only">안 읽음</span>
          </>
        )}
      </span>
      {/*
        ⚠️ `whitespace-pre-line` — 메시지 안에 `\n`이 있으면(비밀번호 안내 등) 그 자리에서
           줄을 가른다. 없는 메시지는 여느 텍스트처럼 폭에 맞춰 자연스럽게 흐른다.
      */}
      <span className="min-w-0 flex-1 text-[13px] leading-5 font-medium break-keep whitespace-pre-line">
        {item.message}
      </span>
    </>
  );

  /*
    ⚠️ **지우기 버튼은 클릭 영역 밖 형제다.** `<Link>`/`<button>` 안에 또 `<button>`을 넣으면
       중첩 인터랙티브 엘리먼트라 접근성 트리·클릭 판정이 깨진다 — `<li>`를 기준으로 절대
       배치해 세로 가운데에 나란히 둔다.
    ⚠️ **안 읽음은 옅은 배경도 함께 진다**(2026-08-19, "왼쪽에 쏠려 보인다"는 지적). 점 하나만
       오른쪽 끝에 찍혀 있으면 아이콘·글자는 왼쪽에, 나머지는 빈 채로 남아 줄 전체가
       한쪽으로 쏠려 보였다 — 줄 전체에 옅은 톤을 깔면 그 폭 전체가 "안 읽음"이라는
       한 덩어리로 읽힌다(색이 아니라 명도로 구분, §디자인 토큰).
  */
  const rowClassName = cn(
    "border-border not-first:border-t hover:bg-foreground/[0.06] flex w-full items-center gap-3 px-3.5 py-2.5 pr-9 text-left transition-colors",
    !item.read && "bg-foreground/[0.025]",
  );

  return (
    <li className="group relative">
      {destination ? (
        <Link href={destination} onClick={() => onRead(item.id)} className={rowClassName}>
          {rowContent}
        </Link>
      ) : (
        <button type="button" onClick={() => onRead(item.id)} className={rowClassName}>
          {rowContent}
        </button>
      )}

      {/*
        ⚠️ **평소엔 투명, 줄에 호버해야 보인다.** `opacity-0`만 쓰고 `hidden`을 안 쓰는 건
           키보드로 탭했을 때도 걸려야 하기 때문 — 그런데 그 경로는 `group-focus-within`이
           아니라 **버튼 자신의 `focus-visible`** 이어야 한다. 팝오버가 열리면 첫 줄(이 링크)로
           포커스를 옮기는데, `group-focus-within`을 쓰면 그 순간 이 버튼이 호버 없이도
           계속 떠 있었다 — 버튼 자신이 포커스를 받을 때만 뜨게 좁힌다.
      */}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="알림 지우기"
        onClick={() => onRemove(item.id)}
        className="text-muted-foreground absolute top-1/2 right-2 shrink-0 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <X aria-hidden />
      </Button>
    </li>
  );
}
