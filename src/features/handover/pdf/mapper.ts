/**
 * PDF 소스 데이터 — [확인] BE `HandoverPackageResponse`·`HandoverInsightResponse`
 * (`GET /api/handovers/{id}/package`·`/insights`).
 *
 * ⚠️ **여기서 벗긴다.** PDF 문서 컴포넌트는 이 파일이 만든 계약만 본다 — BE가 모양을
 *    바꾸면 여기만 고친다(§Mock 격리막과 같은 원칙).
 */

export interface BeHandoverPackageResponse {
  basicInfo: {
    writerName: string;
    writerPosition: string;
    teamId: number;
    absenceType: string;
    startDate: string | null;
    returnDate: string | null;
    lastWorkingDay: string | null;
    note: string | null;
  };
  gapSummary: { totalItems: number; incompleteCount: number; dueSoonCount: number };
  items: BeHandoverPackageItem[];
  contextCards: { actionId: number; title: string; contentSnap: string | null }[];
  meetingHistories: {
    meetingId: number;
    date: string;
    attendees: string[];
    decisionSummary: string | null;
    actionItemsSummary: string | null;
  }[];
  reassigneeGroups: {
    reassigneeId: number;
    reassigneeName: string;
    items: BeHandoverPackageItem[];
  }[];
}

export interface BeHandoverPackageItem {
  actionId: number;
  title: string;
  status: string;
  deadline: string | null;
  startAt: string | null;
  projectTag: string;
  sourceMeetingTitle: string | null;
}

export interface BeHandoverInsightResponse {
  ownership: BeInsightItem[];
  orphanAlert: BeInsightItem[];
  askWhom: BeInsightItem[];
  contextTimeline: BeInsightItem[];
}

interface BeInsightItem {
  id: number;
  actionId: number | null;
  payload: string;
}

export interface HandoverPdfItem {
  title: string;
  status: string;
  deadline: string | null;
  projectTag: string;
  sourceMeetingTitle: string | null;
}

export interface HandoverPdfReassigneeGroup {
  reassigneeName: string;
  items: HandoverPdfItem[];
}

export interface HandoverPdfMeeting {
  date: string;
  attendees: string[];
  decisionSummary: string | null;
  actionItemsSummary: string | null;
}

export interface HandoverPdfData {
  teamNameSnap: string;
  writerName: string;
  writerPosition: string;
  lastWorkingDay: string | null;
  note: string | null;
  gapSummary: { totalItems: number; incompleteCount: number; dueSoonCount: number };
  items: HandoverPdfItem[];
  contextCards: { title: string; content: string }[];
  meetings: HandoverPdfMeeting[];
  reassigneeGroups: HandoverPdfReassigneeGroup[];
  insights: { ownership: string[]; orphanAlert: string[]; askWhom: string[] };
}

function toItem(item: BeHandoverPackageItem): HandoverPdfItem {
  return {
    title: item.title,
    status: item.status,
    deadline: item.deadline,
    projectTag: item.projectTag,
    sourceMeetingTitle: item.sourceMeetingTitle,
  };
}

/**
 * `package`·`insights` 두 응답을 하나로 합친다 — PDF 한 장이 두 소스를 같이 그린다.
 * ⚠️ `insights`는 **오프보딩 최종승인 뒤에만 채워진다**(BE, `endpoints.ts` 주석) — 그 전에
 *    받는 PDF(팀장 중간승인·귀속 단계)는 세 배열이 다 비어 있는 게 정상이다. 지어내지 않는다.
 */
export function toHandoverPdfData(
  teamNameSnap: string,
  pkg: BeHandoverPackageResponse,
  insight: BeHandoverInsightResponse,
): HandoverPdfData {
  return {
    teamNameSnap,
    writerName: pkg.basicInfo.writerName,
    writerPosition: pkg.basicInfo.writerPosition,
    lastWorkingDay: pkg.basicInfo.lastWorkingDay,
    note: pkg.basicInfo.note,
    gapSummary: pkg.gapSummary,
    items: pkg.items.map(toItem),
    contextCards: pkg.contextCards
      .filter((card) => card.contentSnap)
      .map((card) => ({ title: card.title, content: card.contentSnap! })),
    meetings: pkg.meetingHistories.map((meeting) => ({
      date: meeting.date,
      attendees: meeting.attendees,
      decisionSummary: meeting.decisionSummary,
      actionItemsSummary: meeting.actionItemsSummary,
    })),
    reassigneeGroups: pkg.reassigneeGroups.map((group) => ({
      reassigneeName: group.reassigneeName,
      items: group.items.map(toItem),
    })),
    insights: {
      ownership: insight.ownership.map((item) => item.payload),
      orphanAlert: insight.orphanAlert.map((item) => item.payload),
      askWhom: insight.askWhom.map((item) => item.payload),
    },
  };
}
