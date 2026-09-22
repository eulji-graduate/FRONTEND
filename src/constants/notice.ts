/**
 * 공지 작성·수정 모달 문구 — `notice-create-dialog.tsx`·`notice-edit-dialog.tsx`가 같이 쓴다.
 * 화면 컴포넌트에 한글을 직접 적지 않는다(CLAUDE.md §도메인 상수: 라벨 하드코딩 금지).
 */
export const NOTICE_ACTION = {
  CREATE: "CREATE",
  EDIT: "EDIT",
} as const;
export type NoticeAction = (typeof NOTICE_ACTION)[keyof typeof NOTICE_ACTION];

export const NOTICE_ACTION_LABEL: Record<
  NoticeAction,
  {
    /** 트리거 버튼 글자 */
    trigger: string;
    /**
     * 작성/수정 폼 창을 처음 열었을 때 머리에 얹는 제목 — 물음이 아니라 **무슨 창인지**만 말한다
     * (2026-08-12 정리: "올릴까요?"는 [발행]을 누른 뒤 한 번 더 묻는 확인 창으로 옮겼다,
     * `/app/rooms` 예약 모달과 같은 2단계 구조).
     */
    formTitle: string;
    /** 확인 창 제목 — **물음꼴**이다(DESIGN §7). [발행]/[수정]을 누른 뒤에만 뜬다 */
    dialogTitle: string;
    /** 확인 창 설명 — 무엇이 일어나는지. 빠지면 스크린리더가 제목만 읽는다 */
    dialogDescription: string;
    submitLabel: string;
    /** 확인 창에서 제출 중일 때 버튼에 얹는 문구 */
    pendingLabel: string;
    /**
     * 성공 토스트.
     * ⚠️ 공지 제목을 **안 끼운다**(2026-08-08). 220px 한 줄이라 제목이 길면 잘렸고, 방금 쓴
     *    제목은 화면에 이미 있다 — 토스트는 결과 한 조각만 적는다(DESIGN §7).
     */
    successToast: () => string;
  }
> = {
  CREATE: {
    trigger: "새 공지",
    formTitle: "공지 발행",
    dialogTitle: "공지를 올릴까요?",
    dialogDescription: "올리면 사내 전원에게 보입니다.",
    submitLabel: "발행",
    pendingLabel: "발행 중",
    successToast: () => "공지를 발행했습니다",
  },
  EDIT: {
    trigger: "수정",
    formTitle: "공지 수정",
    dialogTitle: "공지를 수정할까요?",
    dialogDescription: "바뀐 내용이 사내 전원에게 바로 보입니다.",
    submitLabel: "수정",
    pendingLabel: "수정 중",
    successToast: () => "공지를 수정했습니다",
  },
};

/** 공지 삭제 확인창 문구 — `notice-delete-button.tsx` 하나만 쓰지만, 카피 하드코딩 금지
 * 원칙(CLAUDE.md §도메인 상수)에 맞춰 컴포넌트 밖으로 뺐다. */
export const NOTICE_DELETE_CONFIRM = {
  /** 확인창 제목 — 공지 제목을 끼워 넣는다 */
  title: (noticeTitle: string) => `'${noticeTitle}' 공지를 삭제할까요?`,
  description: "삭제하면 공지 내용을 되돌릴 수 없습니다.",
  confirmLabel: "삭제",
  pendingLabel: "삭제 중",
} as const;
