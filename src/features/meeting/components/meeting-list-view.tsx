import { CalendarPlus, Video } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { MeetingDirectory, MeetingListItem } from "../view-types";
import { MeetingCard } from "./meeting-card";

/**
 * 회의 목록 — 탭 두 개 + 회의 예약으로 이동하는 링크(WORKFLOW §3-2).
 *
 * ⚠️ **대면·비대면 회의를 여는 진입점이 여기 없다.** 회의 개설(대면·비대면 모두)은
 *    `/app/rooms`(회의 예약) 화면 하나로 모였다(2026-08-14 사이드바 개편) — 여기는
 *    이동 링크만 두고 목록만 보여준다.
 * ⚠️ 탭은 **주소로** 오간다(`?tab=`). 화면 상태로 두면 새로고침·뒤로 가기에서 탭이 날아간다.
 *    서버 컴포넌트라 클릭은 `Link`다 — 프로젝트 목록의 `?status=`와 같은 패턴.
 */

export const MEETING_TAB = {
  HOSTED: "hosted",
  INVITED: "invited",
} as const;
export type MeetingTab = (typeof MEETING_TAB)[keyof typeof MEETING_TAB];

const TAB_LABEL: Record<MeetingTab, string> = {
  hosted: "내가 개설한",
  invited: "참여해야 할",
};

/**
 * 회의 탭.
 *
 * ⚠️ **밑줄 탭이다**(2026-08-10 통일). 전에는 검은 알약이었는데, 이 앱의 다른 탭
 *    (검색 결과·팀 액션 상세)은 전부 밑줄이다 — 같은 것이 화면마다 다르면 오갈 때 눈이
 *    "이게 탭인가 버튼인가"를 다시 판단한다.
 * ⚠️ 개수는 **상자에 담지 않는다.** 알약 안에 또 알약을 넣으면 표식이 둘이 된다 —
 *    검색 탭과 같이 숫자만 옆에 둔다.
 */
function TabLink({ tab, isActive, count }: { tab: MeetingTab; isActive: boolean; count: number }) {
  return (
    <Link
      href={tab === MEETING_TAB.HOSTED ? "/app/meeting" : `/app/meeting?tab=${tab}`}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "focus-visible:ring-ring -mb-px flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2.5 text-[13px] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
        isActive
          ? "border-foreground text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {TAB_LABEL[tab]}
      <span className="tabular-nums">{count}</span>
    </Link>
  );
}

function MeetingEmptyState({ tab }: { tab: MeetingTab }) {
  const isHosted = tab === MEETING_TAB.HOSTED;

  return (
    /*
      ⚠️ 없다는 말만 두지 않는다 — 다음에 무엇을 하면 생기는지를 같이 적는다(§상태 세 장).
         두 탭은 비는 이유가 달라 문구도 다르다.
    */
    <div className="border-border bg-card rounded-2xl border">
      <EmptyState
        icon={Video}
        title={isHosted ? "아직 개설한 회의가 없습니다." : "참여할 회의가 없습니다."}
        description={
          isHosted
            ? "회의는 회의실 예약과 함께 만들어집니다 — 회의실 화면에서 시간대를 예약해 주세요."
            : "참석자로 지정되면 이 자리에 나타납니다."
        }
      />
    </div>
  );
}

interface MeetingListViewProps {
  directory: MeetingDirectory;
  tab: MeetingTab;
}

export function MeetingListView({ directory, tab }: MeetingListViewProps) {
  const items: MeetingListItem[] =
    tab === MEETING_TAB.HOSTED ? directory.hosted : directory.invited;

  return (
    <div className="flex flex-col gap-6">
      {/*
        ⚠️ 선(`border-b`)을 **이 바깥 줄**에 건다(2026-08-14, 회의 예약 이동 링크를 더하며 옮김).
           탭 두 개만 있을 때는 탭 상자에 걸어도 됐지만, 오른쪽에 링크를 나란히 두면 탭 상자
           너비만큼만 선이 그어져 링크 아래는 선이 끊긴다 — 줄 전체 폭으로 선을 그어야
           헤더 한 줄로 읽힌다. `TabLink`의 `-mb-px`는 가장 가까운 `border-b` 조상을 기준으로
           겹치므로 옮겨도 밑줄 탭 모양은 그대로다.
      */}
      <div className="border-border flex items-center justify-between gap-3 border-b">
        <div className="flex gap-1" role="group" aria-label="회의 거르기">
          <TabLink
            tab={MEETING_TAB.HOSTED}
            isActive={tab === MEETING_TAB.HOSTED}
            count={directory.hosted.length}
          />
          <TabLink
            tab={MEETING_TAB.INVITED}
            isActive={tab === MEETING_TAB.INVITED}
            count={directory.invited.length}
          />
        </div>
        {/*
          ⚠️ **이 화면에서 유일한 실행 동작이라 `ink`(주 버튼)를 쓴다**(2026-08-19, "너무
             밋밋하다"는 지적). `outline`은 곁다리 버튼용이다(§components/ui/button) — 탭
             옆에 다른 버튼이 없으니 이게 이 헤더의 주된 다음 걸음이다.
        */}
        <Link href="/app/rooms" className={cn(buttonVariants({ variant: "ink" }))}>
          <CalendarPlus aria-hidden />
          회의 예약으로 이동
        </Link>
      </div>

      {items.length === 0 ? (
        <MeetingEmptyState tab={tab} />
      ) : (
        /*
          ⚠️ **두 열까지만 넓힌다.** `auto-fill`로 두니 1440에서 넉 줄까지 벌어져 카드 하나가
             340px로 좁아졌다 — 제목이 잘리고 발치 정보가 두 줄로 접혔다. 회의 카드는
             읽을 게 있는 카드라 넓게 두는 편이 낫다(시안도 2열이다).
          ⚠️ `items-stretch`(기본값)를 깨지 않는다. 카드가 `h-full`이라 한 줄이 같은 높이로 선다.
        */
        <ul className="grid grid-cols-1 gap-7 lg:grid-cols-2">
          {items.map((meeting) => (
            <li key={meeting.id}>
              <MeetingCard meeting={meeting} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
