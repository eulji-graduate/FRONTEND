import { CalendarClock, ChevronRight, MapPin, Mic, Sparkles, Users, Video } from "lucide-react";
import Link from "next/link";

import { ProjectTag } from "@/components/common/project-tag";
import {
  MEETING_STATUS,
  MEETING_STATUS_BADGE_CLASS,
  MEETING_STATUS_LABEL,
} from "@/constants/meeting";
import { cn } from "@/lib/utils";

import { type MeetingCardAffordance, meetingCardAffordanceOf } from "../status";
import type { MeetingListItem } from "../view-types";
import { ProjectAccent } from "./project-accent";

/**
 * 회의 카드 한 장.
 *
 * ⚠️ **완료 카드라고 다 눌리지 않는다.** 종료 직후 회의는 상태가 완료지만 요약·액션 추출이
 *    아직 돌고 있어 회의록도 산출물도 없다(WORKFLOW §3-3 5) — 그때 상세로 보내면 빈 화면을
 *    준다. 무엇을 내줄 수 있는지는 `meetingCardAffordanceOf` 한 곳이 정한다.
 * ⚠️ [녹음하기]는 **Host에게만**, 예정·진행중에만 뜬다(§3-2, 시간 제약 없음). 참석자에게는
 *    예정·진행중 카드가 눌러도 반응이 없다 — 눌리는 척(`hover`)도 하지 않는다(§정직성).
 * ⚠️ **카드 높이가 서로 같다.** 머리·본문·발치를 셋으로 나누고 발치를 `mt-auto`로 바닥에
 *    붙인다 — 안 그러면 [녹음하기]가 있는 카드만 길어져 한 줄의 아랫변이 들쭉날쭉해진다.
 * ⚠️ 색은 **프로젝트 띠 하나뿐**이다(DESIGN §5: 색을 써도 되는 자리). 상태는 명도로 가른다.
 */

/**
 * 상태 배지 — **분석이 도는 동안은 회의 상태 대신 분석을 말한다.**
 *
 * ⚠️ 여기서 `완료`라고 적으면 카드가 거짓말을 한다. 종료를 누른 사람 입장에서 회의는 끝났지만
 *    화면이 내줄 수 있는 건 아직 아무것도 없다 — 그 차이를 배지가 말해야 눌러 보고 실망하지
 *    않는다(§정직성). 문구도 "요약 중"이라 얼마나 기다릴지 짐작이 선다.
 */
function StatusBadge({
  meeting,
  affordance,
}: {
  meeting: MeetingListItem;
  affordance: MeetingCardAffordance;
}) {
  const badgeClass =
    /*
      ⚠️ **12px·h-6으로 키운다.** 11px 배지는 카드 구석의 꼬리표처럼 읽혀 상태가 눈에 안
         걸렸다 — 이 카드에서 제목 다음으로 먼저 봐야 하는 값이다.
    */
    /*
      ⚠️ **배지는 다 글자만이다.** 예정·완료엔 아이콘이 없는데 요약 중·검토 대기에만 붙이니
         같은 자리의 배지가 두 종류로 보여, 상태를 견주기 전에 생김새부터 갈렸다.
    */
    "inline-flex h-6 shrink-0 items-center rounded-md border px-2.5 text-[12px] leading-4";

  /*
    ⚠️ **요약 배지를 여기 두지 않는다**(2026-08-10 팀 확정 B안). 대기·요약 중·실패는
       종료 직후 잠깐 지나가는 값이라, 목록에 올리면 회의 상태와 두 축이 겹쳐 보인다 —
       요약이 어디까지 왔는지는 **상세의 그 칸**이 말한다.
  */
  if (affordance === "review") {
    /* 검토가 밀리면 액션이 아무에게도 안 간다 — 이 카드에서 제일 급한 값이라 가장 진하다 */
    return (
      <span
        className={cn(badgeClass, "bg-foreground text-background border-transparent font-semibold")}
      >
        검토 대기
      </span>
    );
  }

  return (
    <span className={cn(badgeClass, MEETING_STATUS_BADGE_CLASS[meeting.status])}>
      {MEETING_STATUS_LABEL[meeting.status]}
    </span>
  );
}

function CardBody({
  meeting,
  affordance,
}: {
  meeting: MeetingListItem;
  affordance: MeetingCardAffordance;
}) {
  return (
    <>
      {/* 위쪽 띠 — 어느 프로젝트인지(DESIGN §5). 세로 띠는 둥근 모서리에서 잘려 보였다 */}
      <ProjectAccent tag={meeting.projectTag} />

      {/*
        ⚠️ **머리를 두 줄로 줄인다**(2026-08-10). 제목 / 칩 / 안건이 세 층으로 쌓여 있어
           한 카드가 네 덩이로 읽혔다 — 층이 많을수록 눈이 어디를 먼저 볼지 못 정한다.
        ⚠️ **태그를 제목 옆에 붙인다.** 아랫줄에 두면 그 줄에 칩·배지·평문 셋이 섞여
           높이도 모양도 제각각이라 지저분했다 — 다른 화면(액션 상세·검색)도 태그는 제목 옆이다.
      */}
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 flex-1 items-center gap-2">
          <ProjectTag tag={meeting.projectTag} />
          <span className="truncate text-[17px] leading-7 font-semibold tracking-[-0.3px]">
            {meeting.title}
          </span>
        </p>
        <StatusBadge meeting={meeting} affordance={affordance} />
      </div>

      {/*
        ⚠️ **둘째 줄은 평문 한 줄이다.** 출처(`Owner 개설`)를 배지로 두니 옆 칩과 높이·모서리가
           달라 한 줄에 두 종류의 상자가 섞였다 — 둘 다 "이 회의가 어디서 왔나"를 말하는
           **곁 정보**라 같은 무게의 글로 이어 붙인다.
        ⚠️ 가운뎃점으로 잇는다. 상자를 없앤 자리에 구분자가 필요하다.
        ⚠️ **빈 조각은 가운뎃점째 뺀다**(2026-08-13). 실서버 목록(MEET-02)엔 소속 라벨도 안건도
           없어 둘 다 빈 문자열로 온다(§view-types) — 그대로 이으면 이 줄에 홀로 남은 `·` 하나만
           그려진다. 없는 값을 말하지 않는 게 §정직성이다.
        ⚠️ **둘 다 비면 `<p>`를 아예 안 그린다**(2026-08-13, 코드래빗 지적). 빈 문자열이라도
           `pt-1.5 pb-6`이 그대로 남아 카드 아래에 **말없는 빈 줄**이 생긴다 — 없는 값을
           말하지 않는다는 §정직성은 픽셀에도 적용된다.
      */}
      {(meeting.originLabel || meeting.topicSummary) && (
        <p className="text-muted-foreground truncate pt-1.5 pb-6 text-[13px] leading-5">
          {meeting.originLabel}
          {meeting.originLabel && meeting.topicSummary && (
            <span className="px-1.5 opacity-50">·</span>
          )}
          {meeting.topicSummary}
        </p>
      )}
    </>
  );
}

/** 발치 오른쪽 버튼 — 테두리 한 겹, 카드마다 같은 모양이다 */
const ACTION_CLASS =
  "border-border hover:border-foreground/40 hover:text-foreground text-muted-foreground focus-visible:ring-ring flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden";

/**
 * 발치 — **모든 카드가 같은 줄에서 끝난다.**
 * ⚠️ 왼쪽은 정보, 오른쪽은 조작으로 축을 가른다(DESIGN §3). 버튼이 없는 카드도 같은
 *    높이를 갖도록 줄 자체는 늘 그린다.
 */
function CardFooter({
  meeting,
  affordance,
}: {
  meeting: MeetingListItem;
  affordance: MeetingCardAffordance;
}) {
  return (
    /*
      ⚠️ **발치를 카드 폭 끝까지 빼고 옅은 띠를 깐다**(`-mx-7 -mb-7`). 안쪽에 선만 그으니
         내용과 정보가 한 통에 담겨 어디까지가 회의 이야기이고 어디부터가 일정인지 안 보였다 —
         공지 상세도 같은 해부(머리 / 폭 전체 선 / 본문)를 쓴다.
      ⚠️ 띠 색은 **표 머리와 같은 것**(`bg-secondary/50`, DESIGN §표)이다. 새 회색을 만들면
         화면마다 다른 회색이 는다.
      ⚠️ 아래 모서리는 `frameClass`의 `overflow-hidden`이 잘라 준다.
    */
    <div className="border-border bg-secondary/50 -mx-7 mt-auto -mb-7 flex items-center justify-between gap-3 border-t px-7 py-4">
      {/*
        ⚠️ **발치 안에서도 층을 가른다.** 셋을 다 12px 회색으로 두니 한 덩이 회색 띠로 뭉개져
           정작 제일 먼저 봐야 할 **언제**가 안 읽혔다 — 일시는 13px 본문색, 장소·인원은
           12px 보조색이다.
        ⚠️ 일시와 나머지 사이는 세로선으로 끊는다. 가운뎃점을 또 쓰면 둘째 줄과 같은 기호가
           되어 어느 게 묶음인지 흐려진다.
      */}
      {/*
        ⚠️ **접지 않는다**(`flex-nowrap`). 접히게 두니 오른쪽 버튼이 길어질 때마다
           일시·장소·인원이 두 줄로 내려가, 옆 카드와 발치가 어긋나 한 줄의 카드들이
           서로 다른 데서 끝났다(§오와 열) — 좁으면 접는 대신 **회의실 이름을 자른다.**
      */}
      <div className="flex min-w-0 flex-nowrap items-center gap-x-3">
        {/*
          ⚠️ **확정된 비대면 회의는 목록에 뜬다**(2026-08-16 팀 확정, B안 — 2026-08-14의
             "안 온다"를 뒤집었다). 이 경우 일시·회의실이 비어 있으니 두 칸 대신 안내 한 줄로
             대체한다 — 빈 칸을 그대로 두면 카드가 고장 난 것처럼 보인다(§정직성).
             상세(`meeting-detail-view.tsx`)와 같은 아이콘·같은 문구다.
             참석자 수는 비대면에도 있으니 계속 그린다.
        */}
        {meeting.isOnline ? (
          <span className="flex shrink-0 items-center gap-1.5 text-[13px] leading-5 font-medium">
            <Video className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span>온라인으로 진행된 회의입니다</span>
          </span>
        ) : (
          <>
            <span className="flex shrink-0 items-center gap-1.5 text-[13px] leading-5 font-medium">
              <CalendarClock className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <span className="tabular-nums">{meeting.schedule}</span>
            </span>
            <span className="bg-border h-3 w-px shrink-0" aria-hidden />
            <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[12px] leading-4">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{meeting.roomName}</span>
            </span>
          </>
        )}
        <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-[12px] leading-4">
          <Users className="size-3.5 shrink-0" aria-hidden />
          <span className="tabular-nums">{meeting.attendeeCount}명</span>
        </span>
      </div>

      {/*
        ⚠️ **오른쪽에 갈 곳을 적어 둔다.** 완료 카드에만 아무것도 없어서 발치 오른쪽이 통째로
           비었고(§배치), 무엇보다 **눌린다는 걸 알 방법이 없었다** — 손가락 커서는 마우스를
           얹어야 보인다.
        ⚠️ 자리는 항상 잡아 둔다(`h-8`). 버튼이 있고 없고에 따라 발치 높이가 달라지면
           한 줄의 카드들이 서로 다른 데서 끝난다.
      */}
      {/*
        ⚠️ **오른쪽 자리는 하나다.** 두 개를 나란히 세우니 왼쪽에 자리가 없어 회의실 이름이
           `대.`로 잘렸다(§오와 열) — 카드마다 **지금 할 일 하나**만 적는다.
        ⚠️ 자리는 항상 잡아 둔다(`h-8`). 버튼이 있고 없고에 따라 발치 높이가 달라지면
           한 줄의 카드들이 서로 다른 데서 끝난다.
      */}
      <div className="flex h-8 shrink-0 items-center">
        {/*
          ⚠️ **예정 회의에는 [녹음하기]만**이다(2026-08-10 팀 확정). 아직 아무것도 안 남긴
             회의라 상세에 갈 이유가 없고, Host가 할 일은 녹음을 뜨는 것 하나뿐이다.
          ⚠️ 전에는 [입장]이었다(2026-08-11 개명) — 회의에 들어가는 별도 단계가 있는 것처럼
             읽혔지만, 이 버튼은 캡처 화면으로 옮겨 주는 링크일 뿐이다. 회의가 실제로
             시작되는 자리는 그 화면의 [녹음 시작] 하나다.
          ⚠️ **진행중 Host에게도 뜬다**(2026-08-11 고침, 코드래빗 지적). `live`는 예정·진행중
             둘 다인데 여기서 예정만 봤던 탓에, **녹음 중 새로고침하면 목록에서 캡처로
             돌아갈 길이 사라졌다** — 판정은 `meetingCardAffordanceOf` 하나라고 해 놓고
             카드가 자기 조건을 따로 들고 있었다(§status: 판정은 여기 한 곳이다).
        */}
        {affordance === "live" && meeting.isHost ? (
          <Link href={`/app/meeting/${meeting.id}/capture`} className={ACTION_CLASS}>
            <Mic className="size-3.5" aria-hidden />
            <span>녹음하기</span>
          </Link>
        ) : affordance === "review" ? (
          /* ⚠️ 검토가 밀리면 액션이 아무에게도 안 간다 — 회의록보다 급해서 이 자리를 가져간다 */
          <Link
            href={`/app/meeting/${meeting.id}/review`}
            className={cn(ACTION_CLASS, "border-foreground/30 text-foreground font-medium")}
          >
            <Sparkles className="size-3.5" aria-hidden />
            <span>액션 검토</span>
          </Link>
        ) : meeting.status === MEETING_STATUS.SCHEDULED ||
          meeting.status === MEETING_STATUS.CANCELED ? null : (
          /*
            ⚠️ 여기 남는 건 **완료** 카드뿐이다(예정·진행중·취소는 위에서 갈렸다). 상세는 완료면
               항상 열리므로(메타는 보여주고 덜 찬 칸에만 안내한다) [회의록]을 그대로 둔다.
            ⚠️ 📄 WORKFLOW §3-2의 "예정·진행중 카드는 클릭해도 반응 없음"은 이 결정이 덮는다.
            ⚠️ **예정·취소는 예외로 비운다**(바로 위 `null`). 둘 다 회의록으로 보낼 산출물이 없다
               — 예정은 아직 안 열렸고(2026-08-10 팀 확정), 취소는 열릴 일이 없어졌다(MEET-06).
          */
          <Link
            href={`/app/meeting/${meeting.id}`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex items-center gap-0.5 rounded-md text-[13px] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
          >
            회의록
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

export function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
  const affordance = meetingCardAffordanceOf(meeting);

  return (
    /*
      ⚠️ **카드를 통째로 링크로 감싸지 않는다.** 발치에 [회의록]·[액션 검토]·[녹음하기]가 함께
         설 수 있는데, 바깥이 링크면 그 안의 링크가 먹혀 제 갈 길로 못 간다(링크 안의 링크).
         갈 곳은 **글자로 적어 둔다** — 어디로 가는지 읽히는 편이 카드 전체가 눌리는 것보다
         분명하다.
      ⚠️ `h-full`이라 한 줄의 카드가 가장 큰 것에 맞춰 같은 높이로 선다.
      ⚠️ `overflow-hidden`이 위 띠와 발치 레일을 모서리를 따라 잘라 준다.
    */
    <div className="border-border bg-card relative flex h-full flex-col overflow-hidden rounded-2xl border p-7">
      <CardBody meeting={meeting} affordance={affordance} />
      <CardFooter meeting={meeting} affordance={affordance} />
    </div>
  );
}
