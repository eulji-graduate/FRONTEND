import type { ActionStatus } from "@/constants/action";
import type { AiSummaryStatus, MeetingStatus } from "@/constants/meeting";

/**
 * 회의 화면의 **UI 계약**(`/app/meeting`).
 *
 * ⚠️ 같은 폴더의 `types.ts`는 **저장되는 회의 한 건**(예약이 만드는 레코드)이고, 여기는
 *    화면이 받는 모양이다. 파일을 나눈 건 화면이 저장 모양을 알면 봉투가 바뀔 때 전 화면을
 *    고쳐야 하기 때문이다(§Mock 격리막) — 옮기는 일은 `server.ts` 한 곳이 한다.
 */

/**
 * 목록 카드 한 장.
 * ⚠️ **확정(하달)까지 끝난 비대면 회의는 목록에 뜬다**(2026-08-16 팀 확정, B안 — 2026-08-14의
 *    "목록에 안 온다"를 뒤집었다). 확정 전 비대면 회의는 여전히 안 뜨고, 마이페이지
 *    「미확정 액션」 위젯에서 검토한다. 거르는 일은 **BE 목록 쿼리**가 한다 — FE는 받은 것을 그린다.
 * ⚠️ 그래서 `isOnline`이 필요하다. 비대면 회의는 `schedule`·`roomName`이 빈 문자열이라
 *    그 자리에 "온라인으로 진행된 회의입니다"를 대신 그린다(WORKFLOW.md §3-1-A).
 */
export interface MeetingListItem {
  id: string;
  title: string;
  status: MeetingStatus;
  projectTag: string;
  /**
   * 소속 라벨 — Owner 개설이면 `Owner 개설`(WORKFLOW §2 — 옛 문구 "프로젝트 공통"은 폐기),
   * 팀 액션 회의면 상위 팀 액션 이름이다.
   *
   * ⚠️ 실서버는 `teamId` 판정으로 채운다(BE PR #461, F2/F5 회신: `teamId` NULL = Owner 개설).
   *    단 **상위 팀 액션 이름은 모델에 없어 영구 제공 불가**라 팀 회의는 일반 문구
   *    `팀 액션 회의`다(매퍼 `TEAM_ORIGIN_LABEL`) — 이름까지 나오는 건 목 경로뿐이다.
   * ⚠️ **빈 문자열이면 "모른다"는 뜻이다**(BE #461 배포 전 응답엔 `teamId`가 없다) —
   *    카드는 빈 조각을 가운뎃점째 뺀다(§정직성).
   */
  originLabel: string;
  /**
   * 안건 첫 줄 요약(`대주제 · 소주제`) — 카드에서 무슨 회의인지 한 줄로 알린다.
   * 실서버는 `agendaPreview`(BE PR #461)로 채운다 — 없으면(미배포·안건 0건) 빈 문자열이다.
   */
  topicSummary: string;
  /** `7월 14일(화) 10:00 – 10:30` — 서버가 우리 표기로 만들어 보낸다(§lib). */
  schedule: string;
  roomName: string;
  attendeeCount: number;
  /**
   * 보는 사람이 이 회의의 Host인가.
   *
   * ⚠️ [녹음하기]는 **Host에게만** 뜬다(WORKFLOW §3-2 — 시간 제약 없음, 예정·진행중 둘 다).
   *    참석자가 캡처 화면에 들어갈 일은 없다 — STT가 부딪힌다.
   * ⚠️ **참석자에게 아무것도 안 주는 건 예정 카드뿐이다.** 아직 아무것도 안 남긴 회의라
   *    회의록으로 보낼 것이 없다. 진행중·완료 카드는 상세로 간다 — 상세가 모든 상태에서
   *    열리게 바뀌었고(덜 찬 칸에는 왜 비었는지 적는다), 진행중 카드에 아무것도 없으면
   *    죽은 카드로 보인다(2026-08-10 결정, `meeting-card.tsx`와 같은 자리).
   */
  isHost: boolean;
  /**
   * 종료 뒤 AI 분석이 어디까지 갔는지 — 안 끝난 회의는 `null`.
   *
   * ⚠️ **카드는 이 값을 말하지 않는다**(2026-08-10 팀 확정 B안). 대기·요약 중·실패는 종료
   *    직후 잠깐 지나가는 값이라 배지로 올리면 회의 상태와 두 축이 겹쳐 보였다 — 목록은
   *    회의가 어디까지 왔나(예정·진행중·완료)만 말한다.
   * ⚠️ 그래도 싣는 이유는 **Host의 검토 대기**를 가리기 위해서다(`meetingCardAffordanceOf`).
   *    요약이 어디까지 갔는지는 상세의 `pendingReason`이 말한다.
   */
  aiSummaryStatus: AiSummaryStatus | null;
  /**
   * 비대면(온라인) 회의인가 — 실서버는 `meetingRoom === null`로 판정한다(응답에 별도 필드가 없다).
   * ⚠️ `true`면 `schedule`·`roomName`이 빈 문자열이다 — 카드가 그 자리에 안내 문구를 대신 그린다.
   */
  isOnline: boolean;
}

/** 목록 — 탭 두 개가 이 화면의 전부다(WORKFLOW §3-2) */
export interface MeetingDirectory {
  /** 내가 개설한 */
  hosted: MeetingListItem[];
  /** 참여해야 할 — 참석자로 지정됐고 내가 Host가 아닌 회의 */
  invited: MeetingListItem[];
}

/** 발화 기록 한 토막 — **화자 구분 없이 청크 단위**다(WORKFLOW §3-2) */
export interface ScriptChunk {
  /** 회의 안에서의 시각 `HH:MM` */
  at: string;
  text: string;
}

/**
 * 산출물 한 줄 — 이 회의에서 하달된 액션.
 *
 * ⚠️ 회의 종류에 따라 **다른 것**이 담긴다(§2·§5): Owner 개설 회의는 팀 액션(담당 팀명),
 *    팀 액션 회의는 개인 액션(담당자 이름). `assignee`가 그 자리다.
 * ⚠️ `href`는 실제 상세로 간다 — 라벨은 전부 클릭 가능해야 한다(§12: 순환 추적).
 */
export interface MeetingOutput {
  id: number;
  name: string;
  /** 팀 액션이면 담당 팀명, 개인 액션이면 담당자 이름 */
  assignee: string;
  status: ActionStatus;
  /** 마감일 `YYYY-MM-DD` */
  dueDate: string;
  href: string;
}

/**
 * 회의 안건 — **대주제 하나 + 소주제 목록**이다(쌍이 아니다).
 *
 * ⚠️ 예약 폼은 대주제·소주제를 쌍으로 입력받지만 BE 모델이 둘째 쌍부터의 대주제를 안 남긴다
 *    (BE PR #461 `resolveAgenda`, 3차 F 회신의 알려진 한계). 화면 계약을 쌍으로 두면 매퍼가
 *    **없는 쌍을 지어 붙여야** 해서(§정직성) BE가 실제로 주는 모양을 그대로 계약으로 삼는다.
 */
export interface MeetingAgenda {
  /** 첫 대주제 — 안건이 소주제로만 남은 회의는 `null`이다 */
  main: string | null;
  subs: string[];
}

/** 상세 참석자 한 명 — 아바타 색은 id에서 나온다(§DESIGN 5) */
export interface MeetingAttendee {
  id: number;
  name: string;
  /** 지금은 퇴사한 사람인가 — 과거 회의 기록의 참석자 표시용(CLAUDE.md §도메인 상수) */
  isResigned: boolean;
}

/**
 * 산출물·발화 기록을 **아직 못 보여주는 이유** — 다 준비됐으면 `null`이다.
 *
 * ⚠️ **화면을 통째로 막지 않는다**(2026-08-10 팀 협의). 예정·진행중 회의도 시간·장소·참석자·
 *    안건은 이미 정해진 값이라 볼 이유가 있다 — 없는 건 **회의가 남기는 것**(기록·산출물)뿐이라
 *    그 두 칸에만 안내를 넣는다. 전면 차단은 있는 정보까지 감춘다.
 * ⚠️ 다섯을 뭉치지 않는다. 기다리는 대상이 각각 다르다 — 회의 시작 / 회의 종료 / 요약 완료,
 *    그리고 **실패는 기다려도 안 온다**(마이페이지에서 다시 요약해야 한다). **취소는 기다리는
 *    게 아니다**(MEET-06) — 열릴 일이 없어진 것이라 나머지 넷과 성격이 다르다.
 */
export type MeetingContentPending =
  "SCHEDULED" | "IN_PROGRESS" | "SUMMARIZING" | "FAILED" | "CANCELED";

/** 회의 상세 — 예정·진행중도 여기까지 온다(메타는 보여준다) */
export interface MeetingDetail {
  id: string;
  title: string;
  projectId: number;
  projectTag: string;
  originLabel: string;
  /**
   * 팀 액션 회의면 그 팀 액션 상세로 가는 링크 — Owner 개설이면 없다.
   * ⚠️ 실서버는 **항상 `null`이다** — 상위 팀 액션 id가 모델에 없어 영구 제공 불가다
   *    (BE PR #461 회신, `teamId`는 팀이지 팀 액션이 아니다). 링크가 걸리는 건 목 경로뿐이다.
   */
  parentTeamActionHref: string | null;
  /** 안건 — `null`이면 보여줄 안건이 없다(미배포 BE거나 안건 0건 — 왜인지는 모른다) */
  agenda: MeetingAgenda | null;
  /** ⚠️ 비대면 회의(`isOnline`)는 빈 문자열이다 — `MeetingListItem.schedule`과 같은 이유. */
  schedule: string;
  /** ⚠️ 비대면 회의는 빈 문자열이다. */
  roomName: string;
  attendees: MeetingAttendee[];
  /** 비대면(원격) 회의인가(이슈 #473) — 발치 레일과 발화 기록 칸의 렌더가 이 값으로 갈린다. */
  isOnline: boolean;
  /**
   * 산출물 머리말 — Owner 개설이면 `팀 액션`, 팀 액션 회의면 `개인 액션`.
   * ⚠️ 실서버 상세(MEET-04)엔 개설자 권한이 없어 둘을 못 가른다 — 그때는 상위어 `액션`이다.
   */
  outputKindLabel: string;
  /**
   * 이 회의가 하달한 액션 — **`null`은 "없다"가 아니라 "아직 안 불러왔다"**이다.
   *
   * ⚠️ 두 경우를 가르지 않으면 화면이 거짓말을 한다(§정직성). 빈 배열은 **물어봤는데 없는 것**
   *    이라 "하달된 액션이 없습니다"라고 말해도 되지만, 실서버 상세는 아직 회의별 액션 조회
   *    (`GET /api/meetings/{id}/actions`)를 안 붙여서 **묻지도 않았다** — 그 상태를 `null`로 둔다.
   */
  outputs: MeetingOutput[] | null;
  /** 발화 기록 — `outputs`와 같다. `null`은 자막 조회(CAP-12) 미연동이라 안 물어봤다는 뜻이다. */
  script: ScriptChunk[] | null;
  /** 산출물·발화 기록이 아직 없는 이유 — 다 찼으면 `null` */
  pendingReason: MeetingContentPending | null;
  /**
   * 확정 전 AI 액션 초안 건수 — 요약은 끝났지만 Host가 아직 검토 화면에서 [액션 분배 확정]을
   * 안 누른 만큼이다. 확정됐거나 처음부터 없으면 0(§3-4 `MeetingReviewInfo.actionsConfirmed`).
   */
  pendingActionCount: number;
  /**
   * 요약 실패가 서버 문제로 중단된 것인지 — `pendingReason === "FAILED"`일 때만 뜻이 있다
   * (마이페이지 "요약이 중단된 회의"와 같은 판정).
   */
  isStalled: boolean;
  /** 보는 사람이 이 회의 개설자인가 — 재분석·검토 이동은 Host에게만 보여준다(§권한 ②축) */
  isHost: boolean;
  /** 녹음 동의(MEET-05 수정 대상) — 회의실 예약 화면엔 이 값을 받는 입력이 없어 항상 `false`로 만들어진다. */
  recordingConsent: boolean;
  /**
   * 회의 수정 다이얼로그가 슬롯 피커·회의실 피커 초기값으로 쓰는 원본 값 — `schedule`처럼
   * 이미 포맷된 문자열이 아니라 `DatePickerField`·`TimePickerField`·`RoomPickerList`가
   * 그대로 받는 형식이다(§rooms `SlotPicker`와 같은 모양). 비대면 회의(`isOnline`)는 잡을
   * 시간·회의실 자체가 없어 `null`이다 — 다만 수정 다이얼로그는 `isHost && SCHEDULED`일
   * 때만 뜨고 비대면 회의는 만들어지는 순간 `DONE`이라 실제로는 이 값이 필요한 자리에
   * `null`이 오는 일이 없다(방어값일 뿐이다).
   */
  editableSlot: { date: string; startTime: string; meetingRoomId: string } | null;
}

/**
 * 상세 조회 결과 — 못 여는 이유까지 값으로 돌려준다.
 *
 * ⚠️ 화면이 이유를 알아야 맞는 말을 한다: 없는 회의는 `notFound()`, 권한 없음은
 *    잠금(에러가 아니다 — §3-2-1)이다. 뭉뚱그려 null을 주면 두 경우가 같은 화면이 된다.
 * ⚠️ **"아직 안 끝났다"는 여기 없다.** 예정·진행중·요약 중은 못 여는 게 아니라 **덜 찬 것**이라
 *    `detail.pendingReason`으로 들어간다(2026-08-10 팀 협의).
 */
export type MeetingDetailResult =
  | { kind: "ok"; detail: MeetingDetail }
  /**
   * 열람 권한 없음.
   * ⚠️ **제목이 `null`일 수 있다.** BE가 막을 때(403 `MT-011`) 실패 봉투에 회의 제목을 안 싣는다 —
   *    메타는 공개라 보여도 되는 값이지만 **손에 없는 것을 지어내지 않는다**(§정직성).
   *    화면이 제목 자리를 다른 말로 채운다.
   */
  | { kind: "locked"; title: string | null }
  | { kind: "notFound" };

/**
 * 캡처 화면이 받는 것 — **Host가 회의를 진행하는 데 필요한 만큼만**(WORKFLOW §3-3).
 *
 * ⚠️ 산출물·스크립트를 안 싣는다. 캡처는 지금 만드는 중이라 아직 없는 값이고,
 *    상세(`MeetingDetail`)를 그대로 재사용하면 화면이 쓰지도 않는 걸 실어 나른다.
 */
export interface MeetingCaptureInfo {
  id: string;
  title: string;
  /** 이 회의가 어느 프로젝트 아래인지 — 제목 위 작은 줄 */
  projectTag: string;
  schedule: string;
  roomName: string;
  attendees: CaptureAttendee[];
}

/**
 * 캡처 화면의 참가자 한 줄 — 목록보다 한 겹 더 안다.
 *
 * ⚠️ 이름만으로는 회의 중에 누가 누군지 모른다. 옆자리 사람을 부르려면 **소속·직급**이
 *    같이 보여야 한다(피그마 참가자 레일).
 * ⚠️ 진행자를 표시한다 — 참석자 명단에서 **누가 녹음을 쥐고 있는지**가 드러나야 한다.
 */
export interface CaptureAttendee extends MeetingAttendee {
  /** `개발팀 · 팀장` — 없으면 빈 문자열 */
  subtitle: string;
  isHost: boolean;
}

/**
 * 캡처 진입 결과 — 못 들어가는 이유를 값으로 돌려준다.
 *
 * ⚠️ **Host만 들어간다**(§3-3 "Host 전용. Attendee용 캡처 레이아웃 없음"). 참석자에게는
 *    참석자가 들어갈 화면이 아니라서 잠금이 아니라 **아예 다른 말**이 필요하다.
 * ⚠️ 못 들어가는 경우에도 **제목은 준다.** 회의 제목·팀·프로젝트 태그 같은 메타는
 *    §3-2-1이 "전 구성원 공개(통합검색 결과 포함)"라고 못박은 값이라, 가려도 검색 결과에서
 *    보인다 — 막는 건 **내용**(발화 기록·산출물)이지 제목이 아니다.
 * ⚠️ 이미 끝난 회의도 못 들어간다 — 종료는 되돌릴 수 없다(§3-3 종료 정책).
 */
export type MeetingCaptureResult =
  | { kind: "ok"; meeting: MeetingCaptureInfo }
  | { kind: "notHost"; title: string }
  | { kind: "alreadyDone"; title: string }
  | { kind: "notFound" };
