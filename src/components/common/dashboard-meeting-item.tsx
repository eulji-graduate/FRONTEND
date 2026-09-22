import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  MEETING_STATUS_BADGE_CLASS,
  MEETING_STATUS_LABEL,
  type MeetingStatus,
} from "@/constants/meeting";
import { pickPaletteColor } from "@/lib/palette";
import { cn } from "@/lib/utils";

/**
 * 대시보드 "회의" 위젯 한 줄의 UI 계약 — 오너·팀장 대시보드가 **공용**으로 쓴다.
 * 라벨은 2단이다:
 *   - `originLabel`(항상): 회의의 소속·권한 — 오너 개설="Owner", 팀 회의=부서명("개발팀").
 *   - `hostLabel`(선택): **개설자(주최자) 사람** — 비오너 회의만. 오너 회의는 개설 주체를
 *     "Owner"로 추상화하므로 없다. 이 규칙은 나중의 회의 목록·탭에도 그대로 적용된다.
 */
export interface DashboardMeeting {
  id: string;
  title: string;
  projectTag: string;
  status: MeetingStatus;
  /** 회의실 장소 이름(예: "회의실 A") */
  room: string;
  scheduledAt: string;
  attendeeCount: number;
  /**
   * 소속·권한 라벨 — 오너 개설="Owner", 팀 회의=부서명("개발팀").
   * ⚠️ 선택 필드다 — MEET-03(`GET /api/meetings/upcoming`) 응답엔 개설자 소속 정보가 없어
   *    이 값을 못 채우는 화면이 있다(마이 대시보드 "참석 회의"). 없으면 배지를 안 그린다.
   */
  originLabel?: string;
  /** 개설자 사람 — 팀장이면 "김서준(팀장)", 팀원이면 "이하윤". 오너 회의는 없음(undefined) */
  hostLabel?: string;
}

/**
 * 회의 한 줄 높이(px). 대시보드 박스 높이가 이 값 × 최대 수에서 나오므로 한 곳에 둔다.
 * 박스에 정확히 N건이 채워져 스크롤이 안 생기게 하는 기준이다.
 *
 * ⚠️ **72에서 56으로 줄였다**(2026-08-10). 태그를 제목 위에 한 줄 더 쌓느라 두 단이었는데,
 *    오른쪽 메타는 한 줄이라 왼쪽만 두 줄이 되어 **줄의 가운데 축이 서로 안 맞았다**.
 *    한 줄로 세우면 그 높이가 필요 없다.
 */
export const MEETING_ITEM_HEIGHT = 56;

/**
 * 대시보드 카드의 **머리 줄 높이**(px) — `px-7 pt-6 pb-3` + 아래 보더.
 *
 * ⚠️ 화면에서는 이 값을 안 쓴다. 카드는 내용만큼 자란다 — 이건 **로딩 뼈대**가
 *    본문과 같은 높이로 서게 하는 데만 쓴다(DESIGN §4: loading은 본문과 같은 골격).
 * ⚠️ 오너·팀장·사원 대시보드가 각자 `45`로 적어 두고 있었는데 **실제는 65**였다.
 *    그 20px 차이 때문에 회의 카드의 마지막 줄이 잘려 나갔다 — 세 곳에 흩어진 값을
 *    한 자리로 모은다.
 */
export const DASHBOARD_BOX_HEADER_HEIGHT = 65;

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

/** 카피 규칙: 날짜 `8월 5일(화) 10:00` 포맷(CLAUDE.md §디자인 토큰). 테스트를 위해 export. */
export function formatMeetingDate(dateIso: string): string {
  const date = new Date(dateIso);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${date.getMonth() + 1}월 ${date.getDate()}일(${WEEKDAY_LABEL[date.getDay()]}) ${hour}:${minute}`;
}

/**
 * 회의 상태 색 — 상태 흐름(예정→진행중→완료)이 한눈에 보이게 색으로 구분한다(토큰이라 다크 자동).
 * 예정=파랑(primary) · 진행중=초록(success) · 완료=회색(muted).
 */
/*
  ⚠️ **회의 상태 배지를 여기서 따로 정하지 않는다**(2026-08-10). 여기는 파랑·초록 색으로,
     목록 카드는 명도로 갈라 놓아서 **같은 `예정`이 화면마다 다르게 보였다** —
     `constants/meeting.ts`의 주석은 "두 화면이 같은 맵을 쓴다"고 적혀 있었는데 사실이 아니었다.
  ⚠️ 그리고 색은 이 화면에서 쓸 수 없다. 바로 옆에 프로젝트 태그(팔레트 색)가 서 있어
     무엇을 구분하는 색인지 알 수 없어진다 — 그 이유로 목록에서 한 번 걷어낸 색이다.
*/

interface DashboardMeetingItemProps {
  meeting: DashboardMeeting;
  /** 목록의 첫 항목이 아니면 위쪽 구분선을 그린다 */
  showDivider: boolean;
}

/**
 * 좌: 프로젝트 태그 · 회의명 · 개설 라벨 / 우: 회의실 · 시간 · 참석 + 상태.
 *
 * ⚠️ **한 줄이다.** 태그를 제목 위에 얹으면 왼쪽만 두 단이 되는데 오른쪽 메타는 한 줄이라,
 *    두 덩어리의 가운데가 서로 어긋나 보였다(DESIGN §3: 열마다 축이 따로 선다).
 * ⚠️ 색은 **팔레트에서 뽑는다**(`pickPaletteColor`). 전에는 데이터가 들고 온 생 HEX에
 *    투명도를 붙여(`${color}1a`) 칩 배경을 만들었는데, 팔레트 값은 라이트·다크가 다른
 *    CSS 변수라 **hex를 들고 있으면 테마를 못 따라간다**(§palette). 다크에서 칩이 거의
 *    검게 깔렸다. 태그 이름만 있으면 같은 색이 나오므로 색을 데이터로 나를 이유도 없다.
 */
export function DashboardMeetingItem({ meeting, showDivider }: DashboardMeetingItemProps) {
  const color = pickPaletteColor(meeting.projectTag);

  return (
    <li
      className={cn(showDivider && "border-border border-t")}
      style={{ height: MEETING_ITEM_HEIGHT }}
    >
      <Link
        href={`/app/meeting/${meeting.id}`}
        className="hover:bg-foreground/[0.04] flex h-full items-center transition-colors"
      >
        {/* 프로젝트 색 왼쪽 막대 — 행 위아래 끝에 딱 붙는 얇은 세로선(DESIGN §5: 어느 프로젝트인지) */}
        <span
          className="h-full w-1 shrink-0"
          style={{ backgroundColor: color.solidColor }}
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* 칩 규격은 회의 목록 카드(`meeting-card.tsx`)와 같다 — 같은 것이 화면마다 다르면 안 된다 */}
            <span
              className="shrink-0 rounded px-1.5 py-px text-[11px] leading-4 font-medium"
              style={{ backgroundColor: color.bgColor, color: color.textColor }}
            >
              {meeting.projectTag}
            </span>
            <span className="truncate text-[13px] leading-5">{meeting.title}</span>
            {/* 소속·권한 라벨(값이 있을 때만) + 개설자 라벨(비오너 회의만) */}
            {meeting.originLabel && (
              <Badge variant="secondary" className="shrink-0">
                {meeting.originLabel}
              </Badge>
            )}
            {meeting.hostLabel && (
              <Badge variant="outline" className="shrink-0">
                {meeting.hostLabel}
              </Badge>
            )}
          </div>

          {/*
            우: 회의실 · 시간 · 참석 · 상태.

            ⚠️ **값마다 자기 열에 선다**(DESIGN §3: 열마다 축이 따로 선다). 전에는 넷을 한 덩이로
               묶어 오른쪽에 붙였는데, 값 길이가 제각각이라(`회의실 A` 42px·`대회의실` 42px,
               `8월 5일` 90px·`8월 12일` 98px, `진행중` 45px·`완료` 35px) **덩어리 왼쪽 끝이
               줄마다 11px씩 흔들렸다** — 세로선이 하나도 안 생겨 오른쪽이 뭉쳐 보였다.
               상자 폭을 고정하면 회의실은 회의실끼리, 시간은 시간끼리 한 줄에 선다.
            ⚠️ 날짜·참석은 **오른쪽 정렬**이다. 사람이 훑는 건 끝에 오는 값(`10:00`·`4명`)이라
               그쪽을 맞춰야 눈이 한 세로선을 따라간다.
            ⚠️ 가운뎃점(`·`)을 걷어냈다. 열이 갈리면 구분자가 할 일이 없고, 점까지 있으면
               값 사이가 8px로 좁아져 넷이 한 덩이로 뭉친다.
            ⚠️ **덩어리에 폭을 주고(520) 그 안에서 벌린다**(`justify-between`). 처음엔 값에 딱
               맞는 폭에 16px 간격이었는데, 넷이 합쳐 300px도 안 돼 **오른쪽 끝에 뭉치고 줄
               가운데가 400px 넘게 비었다** — 제목은 왼쪽 끝, 값은 오른쪽 끝이라 눈이 그 사이를
               건너뛰어야 했다. 간격만 벌려서는 덩어리가 그대로 오른쪽에 붙어 있어 안 풀린다.
            ⚠️ **열은 그래도 안 흔들린다.** 제목 칸이 `flex-1`이라 이 덩어리의 왼쪽 끝은 줄마다
               같은 자리다 — 그 안에서 상자 폭이 고정이므로 회의실은 회의실끼리, 시간은
               시간끼리 한 세로선에 선다.
            ⚠️ 회의실도 **오른쪽 정렬**로 바꿨다. 왼쪽 정렬이면 상자를 넓힌 만큼 회의실만
               왼쪽으로 떨어져 나가 열 넷이 다시 어긋난다.
          */}
          {/*
            ⚠️ **줄어들 수 있게 둔다**(`shrink`, 2026-08-10 리뷰). `shrink-0`이라 창이 좁아지면
               이 덩어리가 520px을 고집해 **오른쪽 값들이 화면 밖으로 밀려 잘렸다** — 가로
               스크롤을 주는 목록도 아니다(§디자인 토큰: 고정 폭 대신 최대 폭).
            ⚠️ 줄어들어도 **열은 안 흔들린다.** 한 화면의 줄들은 담는 폭이 같아서 같은 만큼
               줄어들고, 안쪽 상자 폭은 그대로다 — 좁아지면 회의실 이름만 말줄임된다.
          */}
          <div className="text-muted-foreground flex w-[520px] max-w-full items-center justify-between text-[12px] leading-4">
            <span className="w-[76px] truncate text-right">{meeting.room}</span>
            <span className="w-[124px] text-right tabular-nums">
              {formatMeetingDate(meeting.scheduledAt)}
            </span>
            <span className="w-[64px] text-right tabular-nums">참석 {meeting.attendeeCount}명</span>
            <span
              className={cn(
                /*
                  ⚠️ **`border`를 켜 둔다**(2026-08-10 리뷰). 공용 맵의 완료 값이 `border-border`
                     하나로 서는데 테두리 굵기가 없으면 그 줄이 안 그려져 **완료 배지만 표면이
                     통째로 사라진다** — 목록 카드는 이미 `border`를 켠다.
                */
                "inline-flex h-5 w-[48px] shrink-0 items-center justify-center rounded-full border text-[11px] leading-4 font-medium",
                MEETING_STATUS_BADGE_CLASS[meeting.status],
              )}
            >
              {MEETING_STATUS_LABEL[meeting.status]}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}
