import type { Notice, NoticeDraft } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전. **서버 프로세스 메모리에만 있다**(재시작하면 초기값으로 되돌아간다).
 * 작성·수정·삭제 Server Action이 이 배열을 직접 바꾼다 — 실제 DB 흉내다.
 *
 * ⚠️ 상태를 `globalThis`에 매단다 — dev의 HMR(코드 저장 시 모듈 재평가)로 `let`이 초기화되면
 *    방금 만든 공지가 사라진다. `globalThis`는 재평가를 넘어 살아남아 데모가 덜 튄다.
 *    (BE가 붙으면 이 파일은 사라지고 상태는 DB로 간다 — 이 트릭도 같이 사라진다.)
 */
interface NoticeStore {
  notices: Notice[];
  sequence: number;
}

const INITIAL: Notice[] = [
  {
    id: "notice-6",
    title: "다크모드 전 화면 적용 안내",
    body: "워크벤치 전 화면에 다크모드가 적용되었습니다. 상단 프로필 메뉴 또는 마이페이지에서 화면 모드를 바꿀 수 있습니다. 불편한 점이 있으면 담당 팀에 알려 주세요.",
    publishedAt: "2026-08-10",
  },
  {
    id: "notice-5",
    title: "인수인계 승인 절차 변경 안내",
    body: "팀장 오프보딩 인수인계는 대표만 최종 승인할 수 있도록 절차가 정리되었습니다. 팀 내 인수인계는 기존과 동일하게 팀장이 승인합니다.",
    publishedAt: "2026-08-08",
  },
  {
    id: "notice-4",
    title: "액션 마감일 표시 방식 변경 안내",
    body: "액션 목록에서 마감일이 지난 항목은 상태와 별도로 '지연'으로 표시됩니다. 담당자를 다시 지정하거나 마감일을 조정하려면 프로젝트 상세에서 확인해 주세요.",
    publishedAt: "2026-08-06",
  },
  {
    id: "notice-3",
    title: "회의실 관리 화면 개선 안내",
    body: "회의실 관리 화면에서 위치·이용 가능 시간을 한눈에 확인할 수 있도록 목록이 개선되었습니다. 회의실 추가·수정은 관리자만 가능합니다.",
    publishedAt: "2026-08-05",
  },
  {
    id: "notice-2",
    title: "회의 요약 검토 화면 안내",
    body: "회의 종료 후 AI가 뽑은 요약·액션은 검토 화면에서 담당자·마감일을 확인한 뒤 [액션 분배 확정]을 눌러야 실제 액션으로 생성됩니다. 반려한 항목은 생성되지 않습니다.",
    publishedAt: "2026-08-04",
  },
  {
    id: "notice-1",
    title: "회의실 예약과 참석 안내",
    body: "회의는 회의실 예약 화면에서만 개설할 수 있습니다. 예약이 확정되면 참석자에게 회의 개설 및 시작 전 안내가 표시됩니다.",
    publishedAt: "2026-08-03",
  },
];

const globalStore = globalThis as typeof globalThis & { __noticeStore?: NoticeStore };
const store: NoticeStore = (globalStore.__noticeStore ??= {
  notices: INITIAL,
  sequence: INITIAL.length,
});

export function listMockNotices(): Notice[] {
  return store.notices;
}

export function findMockNotice(id: string): Notice | null {
  return store.notices.find((notice) => notice.id === id) ?? null;
}

/** 작성 — 최신 글이 위로 오도록 앞에 붙인다. `publishedAt`은 서버에서 계산해 넘긴다. */
export function addMockNotice(draft: NoticeDraft, publishedAt: string): Notice {
  const notice: Notice = {
    id: `notice-${++store.sequence}`,
    title: draft.title.trim(),
    body: draft.body.trim(),
    publishedAt,
  };
  store.notices = [notice, ...store.notices];
  return notice;
}

/** 수정 — 제목·내용만 바꾼다(발행일은 유지). */
export function updateMockNotice(id: string, draft: NoticeDraft): Notice | null {
  const notice = findMockNotice(id);
  if (!notice) return null;
  const updated: Notice = { ...notice, title: draft.title.trim(), body: draft.body.trim() };
  store.notices = store.notices.map((item) => (item.id === id ? updated : item));
  return updated;
}

/** 삭제 — 있던 공지면 지우고 true, 이미 없으면 false(중복 삭제 요청도 조용히 넘어간다). */
export function deleteMockNotice(id: string): boolean {
  const existed = store.notices.some((notice) => notice.id === id);
  store.notices = store.notices.filter((notice) => notice.id !== id);
  return existed;
}
