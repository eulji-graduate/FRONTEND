import {
  Ban,
  CalendarClock,
  CircleAlert,
  ClipboardCheck,
  ListChecks,
  type LucideIcon,
  MapPin,
  MessageSquareOff,
  Radio,
  Sparkles,
  Video,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { ProfileAvatar } from "@/components/common/profile-avatar";
import { ProjectTag } from "@/components/common/project-tag";
import { StatusDot } from "@/components/common/status-dot";
import { Badge } from "@/components/ui/badge";
import { ACTION_STATUS_LABEL } from "@/constants/action";
import { MEMBER_STATUS_BADGE_CLASS, MEMBER_STATUS_LABEL } from "@/constants/member";
import type { AttendeeScopeViewer } from "@/features/rooms/attendee-scope";
import type { MeetingRoom, RoomMember, RoomProjectOption } from "@/features/rooms/types";
import { formatDate } from "@/lib/date";

import { canCancelMeeting, canEditMeeting, canEditMeetingAttendees } from "../status";
import type { MeetingContentPending, MeetingDetail } from "../view-types";
import { MeetingAttendeesEditDialog } from "./meeting-attendees-edit-dialog";
import { MeetingCancelDialog } from "./meeting-cancel-dialog";
import { MeetingEditDialog } from "./meeting-edit-dialog";
import { ProjectAccent } from "./project-accent";

/**
 * 회의 상세 — **예정·진행중도 여기까지 온다**(2026-08-10 팀 협의, WORKFLOW §3-2). 메타(시간·
 * 장소·참석자·안건)는 늘 보여주고, 아직 없는 것(산출물·발화 기록)만 그 두 칸 안에서 안내한다.
 *
 * 라벨 4종(§12): 프로젝트 태그 · (Owner 개설 / 상위 팀 액션) · 회의 안건 · 산출물 목록.
 * ⚠️ 태그·상위 팀 액션은 **실제로 이동하는 링크**다 — 순환 추적의 핵심이라 눌리지 않는
 *    라벨로 두면 안 된다(§12).
 * ⚠️ 산출물은 회의 종류에 따라 다른 것이 담긴다(§2·§5) — 머리말(`outputKindLabel`)과
 *    담당 칸의 뜻(팀명/사람)이 서버에서 이미 갈라져 온다.
 */

/**
 * 곁줄 — **출처 한 줄**이다(목록 카드와 같다).
 *
 * ⚠️ 전에는 태그와 출처를 나란히 **테두리 배지 두 개**로 뒀는데, 목록 카드에서는 태그가
 *    제목 옆 칩이고 출처는 평문이라 같은 회의가 두 화면에서 다른 모양이었다 — 옮겨 다니면
 *    다른 데 온 것처럼 읽힌다.
 * ⚠️ 팀 액션 회의면 **여기서 상위 팀 액션으로 간다**(§12 순환 추적) — 링크임을 밑줄로만
 *    알린다. 상자를 씌우면 다시 배지가 된다.
 */
function OriginLine({ detail }: { detail: MeetingDetail }) {
  if (!detail.parentTeamActionHref) {
    return (
      <p className="text-muted-foreground truncate text-[13px] leading-5">{detail.originLabel}</p>
    );
  }

  return (
    <p className="truncate text-[13px] leading-5">
      <Link
        href={detail.parentTeamActionHref}
        className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        {detail.originLabel}
      </Link>
    </p>
  );
}

/**
 * 회의 안건 — 별도 섹션 유지(§3-2).
 *
 * ⚠️ 라벨-값 표로 두지 않는다. 대주제는 값의 이름이 아니라 **묶음 이름**이라
 *    `프로젝트 | 킥오프`처럼 두 칸으로 벌려 두면 무엇이 라벨인지 안 읽힌다 —
 *    대주제를 한 번 적고 소주제를 그 옆에 늘어놓는 편이 원래 뜻에 맞는다.
 * ⚠️ **쌍이 아니다.** 예약 폼은 대주제·소주제를 쌍으로 받지만 BE 모델은 대주제 하나만
 *    남긴다(§view-types `MeetingAgenda`) — 소주제마다 대주제를 붙여 그리면 없는 쌍을
 *    지어내는 것이다(§정직성).
 * ⚠️ **`null`이면 이 칸을 통째로 안 그린다.** 안건이 0건인지 아직 못 받은 것인지
 *    (BE #461 배포 전) 구분할 방법이 없어서, 머리만 남기고 "없습니다"라고 단정하지 않는다.
 */
function AgendaSection({ agenda }: { agenda: MeetingDetail["agenda"] }) {
  if (!agenda) return null;

  return (
    <div className="border-border mt-5 border-t pt-5">
      <p className="text-muted-foreground text-[12px] leading-4">안건</p>
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {agenda.main && <p className="text-[13px] leading-5 font-medium">{agenda.main}</p>}
        <ul className="flex flex-wrap gap-2">
          {agenda.subs.map((sub, index) => (
            <li
              key={`${index}-${sub}`}
              className="border-border text-muted-foreground rounded-lg border px-2.5 py-1 text-[13px] leading-5"
            >
              {sub}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * 아직 안 찬 섹션에 넣는 한 줄.
 *
 * ⚠️ **빈 칸으로 두지 않는다.** 예정·진행중 회의의 기록·산출물은 "없는" 게 아니라 "아직"인데,
 *    비워 두면 하나도 안 나온 회의처럼 읽힌다(§정직성).
 * ⚠️ 진행률을 세지 않는다 — 몇 %인지 그리려면 계속 물어야 하고, 얻는 건 숫자 하나다
 *    (2026-08-10 팀 협의). 못 본다는 사실과 언제 볼 수 있는지는 한 줄이면 다 전달된다.
 */
const PENDING_MESSAGE: Record<MeetingContentPending, string> = {
  SCHEDULED: "아직 시작하지 않은 회의입니다. 회의가 끝나면 여기에 표시됩니다.",
  IN_PROGRESS: "회의가 진행 중입니다. 회의가 끝나면 여기에 표시됩니다.",
  SUMMARIZING: "회의 내용을 요약하고 있습니다. 요약이 끝나면 여기에 표시됩니다.",
  /*
    ⚠️ 실패는 기다려도 안 온다 — 그 사실을 말해야 계속 새로고침하지 않는다.
    ⚠️ **어디로 가라고 적지 않는다**(2026-08-10 리뷰). "마이페이지에서 다시 요약할 수 있습니다"라고
       썼더니 참석자에게도 그렇게 보였는데, 그 목록은 Host의 것이라 가도 이 회의가 없다 —
       못 하는 일을 하라고 시키게 된다(§정직성). 다시 돌리는 건 Host의 마이페이지가 맡는다.
  */
  FAILED: "회의 내용을 요약하지 못했습니다. 개설자가 다시 요약해야 표시됩니다.",
  /*
    ⚠️ 취소는 "아직"이 아니라 "더는 없음"이다(MEET-06) — 다른 넷과 달리 기다려도 안 채워진다.
       그래도 같은 자리·같은 생김새를 쓴다 — 회의가 안 끝났을 때와 마찬가지로 산출물·발화
       기록 두 칸만 비고 나머지 메타(제목·일정·참석자)는 그대로 보여준다.
  */
  CANCELED: "취소된 회의입니다.",
};

/** 아직 볼 것이 없는 이유마다 표식이 다르다 — 훑을 때 글자보다 먼저 걸린다 */
const PENDING_ICON: Record<MeetingContentPending, LucideIcon> = {
  SCHEDULED: CalendarClock,
  IN_PROGRESS: Radio,
  SUMMARIZING: Sparkles,
  FAILED: CircleAlert,
  CANCELED: Ban,
};

/**
 * 회의가 아직 안 끝났거나 요약 중이라 칸이 빈 경우.
 *
 * ⚠️ 빈 상태와 **같은 생김새**를 쓴다(2026-08-11). 문장 한 줄만 가운데 띄워 두니 카드가
 *    반쯤 지어진 것처럼 보였고, 바로 아래 다른 칸의 빈 상태와도 달라 보였다.
 */
function SectionNotice({ reason }: { reason: MeetingContentPending }) {
  const [title, description] = splitNotice(PENDING_MESSAGE[reason]);

  return <EmptyState icon={PENDING_ICON[reason]} title={title} description={description} />;
}

/**
 * `"...입니다. ...표시됩니다."` 두 문장을 제목·설명으로 가른다.
 *
 * ⚠️ 문구는 **`PENDING_MESSAGE` 한 곳**에 그대로 둔다. 제목·설명을 따로 적으면 같은 말이
 *    두 벌이 되어 한쪽만 고쳐진다(§도메인 상수: 값 목록은 한 곳).
 */
function splitNotice(message: string): [string, string | undefined] {
  const [first, ...rest] = message.split(/(?<=\.)\s+/);
  return [first ?? message, rest.length > 0 ? rest.join(" ") : undefined];
}

/**
 * 산출물(하달된 액션) 칸이 **지금 무엇을 보여줄지**.
 *
 * ⚠️ **대기·중단을 "없음"으로 뭉치지 않는다.** 요약이 끝났는데 Host가 [액션 분배 확정]을
 *    아직 안 눌렀거나(`pendingReview`) 요약 자체가 서버 문제로 중단된 것(`stalled`)은 진짜로
 *    하달된 게 없는 것과 다른 사정이라 각자 다른 문구·다른 Host용 이동 수단이 필요하다.
 * ⚠️ 순서가 있다. 회의가 안 끝났거나 요약 중이면(`SectionNotice` 3종) 그게 먼저다 — 아직
 *    검토·중단을 말할 단계조차 아니다.
 */
type ActionsSectionState =
  | { kind: "notice"; reason: MeetingContentPending }
  | { kind: "list" }
  | { kind: "pendingReview" }
  | { kind: "stalled" }
  /** 안 물어봤다 — 회의별 액션 조회가 아직 안 붙었다(§view-types `outputs === null`) */
  | { kind: "notLoaded" }
  | { kind: "empty" };

function actionsSectionStateOf(detail: MeetingDetail): ActionsSectionState {
  if (
    detail.pendingReason === "SCHEDULED" ||
    detail.pendingReason === "IN_PROGRESS" ||
    detail.pendingReason === "SUMMARIZING" ||
    detail.pendingReason === "CANCELED"
  ) {
    return { kind: "notice", reason: detail.pendingReason };
  }
  if (detail.outputs !== null && detail.outputs.length > 0) return { kind: "list" };
  if (detail.pendingActionCount > 0) return { kind: "pendingReview" };
  if (detail.pendingReason === "FAILED") {
    return detail.isStalled ? { kind: "stalled" } : { kind: "notice", reason: "FAILED" };
  }
  /*
    ⚠️ **못 불러온 칸이 "없음"으로 흘러가지 않게 막는다.** 실서버 상세는 회의별 액션 조회를
       아직 안 붙여서 목록 자체를 안 물어본다 — 빈 배열과 같은 자리에 두면 화면이 "하달된
       액션이 없습니다"라고 **단정**한다(§정직성).
    ⚠️ **맨 아래다.** 위의 확정 대기·중단은 BE가 실제로 준 신호라 "못 불러왔다"보다 정확한
       말이고, Host가 다음에 할 일까지 알려 준다 — 목록을 못 그리는 사정은 그 뒤의 이야기다.
  */
  if (detail.outputs === null) return { kind: "notLoaded" };
  return { kind: "empty" };
}

/** 확정 대기·중단 안내 — 문구는 공통, Host에게만 갈 곳을 더 보여준다. */
/**
 * 산출물 칸이 비는 세 경우(검토 대기·중단·0건)를 **빈 상태와 같은 생김새**로 알린다.
 *
 * ⚠️ 글자 한 줄만 띄우면 카드가 반쯤 지어진 것처럼 보인다 — 앱 전체가 쓰는 `EmptyState`를
 *    그대로 쓴다(2026-08-11). 다른 건 아이콘과 다음 걸음뿐이다.
 */
function ActionsNotice({
  icon,
  message,
  description,
  action,
}: {
  icon: LucideIcon;
  message: string;
  description?: string;
  action: { href: string; label: string } | null;
}) {
  return (
    <EmptyState
      icon={icon}
      title={message}
      description={description}
      action={
        action && (
          <Link
            href={action.href}
            className="text-foreground focus-visible:ring-ring rounded-md text-[13px] leading-5 font-medium underline underline-offset-2 transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-hidden"
          >
            {action.label}
          </Link>
        )
      }
    />
  );
}

interface MeetingDetailViewProps {
  detail: MeetingDetail;
  /** 참석자 명단 교체(MEET-09) 다이얼로그가 고를 전체 사원 목록. */
  members: RoomMember[];
  /** 참석자 범위(Owner=팀장만 / Leader·Member=자기 팀만) 기준 — `RoomAttendeePicker`로
   *  그대로 흘려보낸다(`attendee-scope.ts`, 2026-08-13 확정). */
  viewer: AttendeeScopeViewer;
  /** 회의 수정(MEET-05, #436) 다이얼로그의 회의실 피커·프로젝트 select가 고를 목록 — `members`와
   *  같은 이유로 `canEdit`가 아니면 페이지가 빈 배열을 내려준다(헛수고 조회를 피한다). */
  rooms: MeetingRoom[];
  projects: RoomProjectOption[];
}

export function MeetingDetailView({
  detail,
  members,
  viewer,
  rooms,
  projects,
}: MeetingDetailViewProps) {
  const actionsState = actionsSectionStateOf(detail);
  const canEditAttendees = canEditMeetingAttendees(detail);
  const canCancel = canCancelMeeting(detail);
  const canEdit = canEditMeeting(detail);

  return (
    /*
      ⚠️ **한 컬럼이다.** 곁 컬럼(360)에 참석자만 두니 이름 몇 줄 아래로 오른쪽이 통째로 비었다 —
         DESIGN §1이 두 칸으로 가르라는 건 **1440을 채울 것이 있을 때**다. 여기서 폭을 채우는
         건 산출물 표와 발화 기록인데 둘 다 주 컬럼에 있다.
      ⚠️ 대신 **읽는 글은 좁게 둔다**(§4 폭) — 발화 기록만 720으로 묶는다.
    */
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
      <div className="flex min-w-0 flex-col gap-7">
        {/* ⚠️ `overflow-hidden`이 있어야 위 띠와 발치 레일이 모서리를 따라 잘린다 */}
        <section className="border-border bg-card relative overflow-hidden rounded-2xl border p-7">
          <ProjectAccent tag={detail.projectTag} />

          {/*
            ⚠️ **태그는 제목 옆이다**(목록 카드와 같다). 아랫줄에 두면 그 줄에 칩·배지·평문이
               섞여 높이가 제각각이 된다 — 두 화면이 같은 자리를 쓰면 눈이 옮겨 다니지 않는다.
            ⚠️ 태그는 **프로젝트로 가는 링크**다(§12 순환 추적).
          */}
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href={`/app/projects/${detail.projectId}`}
                className="focus-visible:ring-ring shrink-0 rounded-md transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:outline-hidden"
              >
                <ProjectTag tag={detail.projectTag} />
              </Link>
              {/* 제목은 h2 — 페이지의 h1은 PageHeader가 갖고 있다(§a11y: h1은 하나) */}
              <h2 className="truncate text-[17px] leading-7 font-semibold tracking-[-0.3px]">
                {detail.title}
              </h2>
            </div>
            {/*
              ⚠️ **수정이 취소보다 앞이다.** 되돌릴 수 없는 쪽(취소)을 오른쪽 끝에 둔다 —
                 잘못 잡은 회의를 고치러 온 사람이 먼저 만나야 하는 건 [회의 수정]이다
                 (그게 없어서 취소 후 재개설밖에 없었다, #419).
              ⚠️ 둘 다 시작 전(SCHEDULED) 회의에만 뜬다 — BE가 그 뒤로는 409로 막는다.
            */}
            {(canEdit || canCancel) && (
              <div className="flex shrink-0 items-center gap-2">
                {canEdit && detail.editableSlot && (
                  <MeetingEditDialog
                    meetingId={detail.id}
                    currentTitle={detail.title}
                    editableSlot={detail.editableSlot}
                    currentProjectId={detail.projectId}
                    currentRecordingConsent={detail.recordingConsent}
                    rooms={rooms}
                    projects={projects}
                  />
                )}
                {canCancel && <MeetingCancelDialog meetingId={detail.id} />}
              </div>
            )}
          </div>
          <div className="pt-1.5">
            <OriginLine detail={detail} />
          </div>

          <AgendaSection agenda={detail.agenda} />

          {/*
            참석자 — **머리 카드 안**이다(시안과 같다). 곁 컬럼에 떼어 두면 이름 몇 줄만
            남고 그 아래가 비는데, 회의를 볼 때 "누가 있었나"는 제목·일정과 함께 읽는 값이다.
          */}
          <div className="border-border mt-5 border-t pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-muted-foreground text-[12px] leading-4">
                참석자 <span className="tabular-nums">{detail.attendees.length}명</span>
              </p>
              {canEditAttendees && (
                <MeetingAttendeesEditDialog
                  meetingId={detail.id}
                  currentAttendeeIds={detail.attendees.map((attendee) => attendee.id)}
                  members={members}
                  viewer={viewer}
                />
              )}
            </div>
            <ul className="flex flex-wrap gap-2 pt-2">
              {detail.attendees.map((attendee) => (
                <li
                  key={attendee.id}
                  className="border-border flex items-center gap-2 rounded-full border py-1 pr-3 pl-1"
                >
                  <ProfileAvatar userId={attendee.id} size={24} />
                  <span className="text-[13px] leading-5">{attendee.name}</span>
                  {/*
                    ⚠️ 이 회의가 열렸던 시점의 참석자 스냅샷이다 — 지금 명부에서 빠졌어도
                       "퇴사" 표시만 붙이고 이름·기록은 그대로 남긴다(CLAUDE.md §도메인 상수,
                       FE 감사 #13). 배지 생김새는 사원 상태 배지를 그대로 쓴다(새로 안 만든다).
                  */}
                  {attendee.isResigned && (
                    <Badge variant="outline" className={MEMBER_STATUS_BADGE_CLASS.RESIGNED}>
                      {MEMBER_STATUS_LABEL.RESIGNED}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/*
            ⚠️ **일시·장소는 발치 레일이다**(목록 카드와 같은 해부). 제목 밑에 두면 회의의
               정체(무슨 회의인가)와 일정이 한 덩이로 붙어 셋 다 흐려진다 — 위는 무엇,
               아래는 언제·어디로 가른다.
            ⚠️ 띠 색은 표 머리와 같은 것(`bg-secondary/50`)이다. 새 회색을 만들지 않는다.
          */}
          <div className="border-border bg-secondary/50 -mx-7 mt-6 -mb-7 flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-7 py-4">
            {/*
              ⚠️ **비대면 회의는 일시·장소가 없다**(이슈 #473) — `schedule`·`roomName`이 서버에서
                 빈 문자열로 온다. `isOnline`을 먼저 보고 안내 한 줄로 대신한다(목록 카드와
                 같은 규칙, `meeting-card.tsx`).
            */}
            {detail.isOnline ? (
              <span className="flex shrink-0 items-center gap-1.5 text-[13px] leading-5 font-medium">
                <Video className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <span>온라인으로 진행된 회의입니다</span>
              </span>
            ) : (
              <>
                <span className="flex shrink-0 items-center gap-1.5 text-[13px] leading-5 font-medium">
                  <CalendarClock className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  <span className="tabular-nums">{detail.schedule}</span>
                </span>
                <span className="bg-border h-3 w-px shrink-0" aria-hidden />
                <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[12px] leading-4">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{detail.roomName}</span>
                </span>
              </>
            )}
          </div>
        </section>

        {/* 산출물 — 이 회의에서 하달된 액션(§2·§5) */}
        <section className="border-border bg-card overflow-hidden rounded-2xl border">
          <div className="flex items-baseline justify-between gap-3 px-7 pt-6 pb-3">
            {/* ⚠️ 제목 앞 검은 점을 뺀다 — 상태점과 같은 생김새라 뜻이 있는 표식처럼 읽혔다(DESIGN §5) */}
            <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">
              하달된 {detail.outputKindLabel}
            </h2>
            {/* ⚠️ 아직 안 찬·확정 대기·중단·못 불러온 회의에 `전체 0건`이라 적으면 하나도 안 나온 회의로 읽힌다 */}
            {(actionsState.kind === "list" || actionsState.kind === "empty") && (
              <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
                전체 {detail.outputs?.length ?? 0}건
              </p>
            )}
          </div>

          {actionsState.kind === "notice" ? (
            <SectionNotice reason={actionsState.reason} />
          ) : actionsState.kind === "pendingReview" ? (
            <ActionsNotice
              icon={ClipboardCheck}
              message="아직 액션 분배가 확정되지 않았습니다."
              description="검토 화면에서 [액션 분배 확정]을 눌러야 액션이 생깁니다."
              action={
                detail.isHost
                  ? { href: `/app/meeting/${detail.id}/review`, label: "액션 검토" }
                  : null
              }
            />
          ) : actionsState.kind === "stalled" ? (
            <ActionsNotice
              icon={CircleAlert}
              message="AI 요약이 중단되어 액션이 생성되지 않았습니다."
              action={
                detail.isHost ? { href: "/app/me", label: "마이페이지에서 다시 분석하기" } : null
              }
            />
          ) : actionsState.kind === "notLoaded" ? (
            /*
              ⚠️ **"없다"고 하지 않는다.** 회의별 액션 조회가 아직 안 붙어 물어보지도 않은
                 자리다 — 안 물어본 것을 없다고 말하지 않는다(§정직성).
            */
            <EmptyState
              icon={ListChecks}
              title={`하달된 ${detail.outputKindLabel}을 아직 표시할 수 없습니다.`}
              description="회의별 액션 조회가 연동되면 여기에 표시됩니다."
            />
          ) : actionsState.kind === "empty" ? (
            /* ⚠️ 확정은 했는데 남은 것이 없는 자리다 — "확정을 누르세요"는 위 `pendingReview`가 한다 */
            <EmptyState
              icon={ListChecks}
              title={`이 회의에서 하달된 ${detail.outputKindLabel}이 없습니다.`}
            />
          ) : (
            <ul className="border-border border-t">
              {(detail.outputs ?? []).map((output) => (
                <li key={output.id} className="border-border not-first:border-t">
                  <Link
                    href={output.href}
                    /* ⚠️ 좁은 화면에서는 여백·간격을 줄인다 — 320px에서 고정 폭이 컨테이너를 넘겨 행이 가로로 넘쳤다 */
                    className="hover:bg-foreground/[0.04] flex items-center gap-3 px-4 py-3.5 transition-colors sm:gap-4 sm:px-7"
                  >
                    {/*
                      ⚠️ **이름이 먼저다.** 상태를 맨 왼쪽에 두니 훑을 때 `진행중·할 일·진행중`이
                         먼저 읽히고 정작 무슨 액션인지가 뒤로 밀렸다 — 왼쪽은 무엇인지,
                         오른쪽은 어떤 상태인지로 축을 가른다(DESIGN §3).
                    */}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] leading-5">{output.name}</span>
                      <span className="text-muted-foreground block truncate text-[12px] leading-4">
                        {output.assignee}
                      </span>
                    </span>
                    <StatusDot
                      tone={output.status}
                      label={ACTION_STATUS_LABEL[output.status]}
                      labelClassName="w-[42px] text-left"
                    />
                    <span className="text-muted-foreground shrink-0 text-right text-[12px] leading-4 tabular-nums sm:w-[88px]">
                      {formatDate(output.dueDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 발화 기록 — 화자 구분 없이 청크 단위(§3-2) */}
        <section className="border-border bg-card rounded-2xl border">
          <div className="flex items-baseline justify-between gap-3 px-7 pt-6 pb-3">
            <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">발화 기록</h2>
            {!detail.isOnline && !detail.pendingReason && detail.script !== null && (
              <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
                {detail.script.length}건
              </p>
            )}
          </div>

          {/*
            ⚠️ **비대면 회의는 발화 기록을 절대 안 남긴다**(이슈 #473, 팀 명세). 캡처(STT)를
               거치지 않아서다 — 요약 상태·자막 조회 미연동 같은 다른 이유보다 **앞서** 이 사실을
               말해야 한다. `pendingReason`이 "요약 중"이라고 말해도 온라인 회의는 어차피
               발화 기록이 생기지 않으므로 그 안내는 거짓말이 된다.
          */}
          {detail.isOnline ? (
            <EmptyState
              icon={Video}
              title="온라인으로 진행된 회의입니다."
              description="비대면 회의는 발화 기록을 남기지 않습니다."
            />
          ) : detail.pendingReason ? (
            <SectionNotice reason={detail.pendingReason} />
          ) : detail.script === null ? (
            /* ⚠️ 산출물 칸의 `notLoaded`와 같은 자리다 — 자막 조회(CAP-12) 미연동이라 안 물어봤다 */
            <EmptyState
              icon={MessageSquareOff}
              title="발화 기록을 아직 표시할 수 없습니다."
              description="자막 조회가 연동되면 여기에 표시됩니다."
            />
          ) : detail.script.length === 0 ? (
            <EmptyState icon={MessageSquareOff} title="남아 있는 발화 기록이 없습니다." />
          ) : (
            /* ⚠️ 읽는 글은 좁게 둔다(§4 폭 720) — 1440을 가로지르면 눈이 다음 줄을 못 찾는다 */
            <ul className="flex max-w-[720px] flex-col gap-2.5 px-7 pt-2 pb-7">
              {detail.script.map((chunk, index) => (
                <li key={`${chunk.at}-${index}`} className="flex items-baseline gap-4">
                  {/* 시간은 고정폭 — 숫자가 한 축에 서야 훑을 때 눈이 안 흔들린다 */}
                  <span className="text-muted-foreground/70 w-10 shrink-0 text-[12px] leading-5 tabular-nums">
                    {chunk.at}
                  </span>
                  <p className="text-[13px] leading-5 break-keep">{chunk.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
