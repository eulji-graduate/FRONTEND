import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { MeetingDetailView } from "@/features/meeting/components/meeting-detail-view";
import { getMeetingDetail } from "@/features/meeting/server";
import { canEditMeeting, canEditMeetingAttendees } from "@/features/meeting/status";
import {
  getMeetingRooms,
  getReservableMembers,
  getReservableProjects,
} from "@/features/rooms/server";
import { getViewer } from "@/features/shell/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "회의 상세",
};

/**
 * 못 여는 이유를 알리는 한 장 — **문구만 다르고 생김새는 같다.**
 *
 * ⚠️ 세 경우(잠금·회의 전·요약 중)가 각자 카드를 그리고 있어 여백과 글자 크기가 조금씩
 *    어긋났다. 이유는 달라도 **읽는 사람이 하는 일은 같다** — 왜 못 보는지 한 줄 읽는 것.
 */
function NoticeCard({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon?: ReactNode;
}) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto w-full max-w-[1440px]">
        <section className="border-border bg-card rounded-2xl border px-7 py-14 text-center">
          {icon}
          <h2
            className={`text-[17px] leading-7 font-semibold tracking-[-0.3px] ${icon ? "pt-3" : ""}`}
          >
            {title}
          </h2>
          {/* ⚠️ 읽는 글이라 좁게 둔다(DESIGN §폭) — 가운데 정렬이라 한 줄이 길면 눈이 다음 줄을 못 찾는다 */}
          <p className="text-muted-foreground mx-auto max-w-[42ch] pt-1 text-[13px] leading-5">
            {message}
          </p>
        </section>
      </div>
    </main>
  );
}

/**
 * 회의 상세.
 *
 * 못 여는 두 경우가 **다른 화면**이다(§view-types):
 * - 없는 회의 → `notFound()`
 * - 권한 없음 → 잠금. **에러가 아니다**(§3-2-1) — 메타는 공개라 제목은 그대로 보여주고,
 *   내용만 "참석자만 열람 가능"으로 막는다(액션 상세의 잠금 툴팁과 같은 말).
 * ⚠️ **완료 전이라고 막지 않는다**(2026-08-10 팀 협의). 예정·진행중 회의도 시간·장소·참석자·
 *    안건은 볼 이유가 있다 — 없는 건 기록·산출물뿐이라 **그 두 섹션 안에서** 안내한다.
 *    화면을 통째로 덮으면 이미 있는 정보까지 감춘다.
 */
export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const viewer = await getViewer();
  const result = await getMeetingDetail(meetingId, viewer);

  if (result.kind === "notFound") notFound();

  if (result.kind === "locked") {
    return (
      <NoticeCard
        /*
          ⚠️ 제목이 없을 수 있다 — BE가 403으로 막으면 봉투에 회의 제목이 안 온다(§view-types).
             그때는 지어내지 않고 **무슨 화면인지**만 적는다.
        */
        title={result.title ?? "열람할 수 없는 회의입니다"}
        message="참석자만 열람 가능합니다."
        icon={<Lock className="text-muted-foreground/70 mx-auto size-6" aria-hidden />}
      />
    );
  }

  /*
    ⚠️ 참석자 후보 목록은 **host이고 아직 안 끝난 회의일 때만** 가져온다(MEET-09 편집 조건과
    같다) — 그 외엔 다이얼로그 자체가 안 뜨는데 목록만 미리 불러오면 헛수고다.
    ⚠️ `viewer`를 그대로 넘긴다 — `canEditMeetingAttendees`가 `isHost`를 요구하므로 이 자리에
       도달했다면 `viewer`가 곧 이 회의의 host다(개설자 다른 사람의 회의는 여기 안 온다).
  */
  const canEditAttendees = canEditMeetingAttendees(result.detail);
  const members = canEditAttendees ? await getReservableMembers(viewer) : [];

  /*
    ⚠️ 회의 수정(MEET-05, #436)의 회의실 피커·프로젝트 select도 **host이고 시작 전인 회의일
       때만** 가져온다(`members`와 같은 판단) — 그 외엔 다이얼로그 자체가 안 뜨는데 목록만
       미리 불러오면 헛수고다.
  */
  const canEdit = canEditMeeting(result.detail);
  const [rooms, projects] = canEdit
    ? await Promise.all([getMeetingRooms(), getReservableProjects()])
    : [[], []];

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <MeetingDetailView
        detail={result.detail}
        members={members}
        /* ⚠️ 참석자 교체(MEET-09)도 개설과 **같은 범위 규칙**을 받는다(2026-08-13) — 개설만
           막고 교체를 열어 두면 나중에 규칙을 깨서 넣을 수 있다(`attendee-scope.ts`). */
        viewer={{ id: viewer.id, role: viewer.role, teamName: viewer.teamName ?? null }}
        rooms={rooms}
        projects={projects}
      />
    </main>
  );
}
