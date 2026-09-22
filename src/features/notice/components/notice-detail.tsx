import { MarkdownContent } from "@/components/common/markdown-content";
import { formatDate } from "@/lib/date";

import type { Notice } from "../types";
import { NoticeDeleteButton } from "./notice-delete-button";
import { NoticeEditDialog } from "./notice-edit-dialog";

/** 공지 상세 — 날짜·제목·본문. 관리 권한이 있으면 수정·삭제로 갈 수 있다. */
export function NoticeDetail({ notice, canManage }: { notice: Notice; canManage: boolean }) {
  return (
    /*
      ⚠️ **레포 카드 골격을 쓴다** — 머리(제목·조작) + 선 + 본문. 전에는 안쪽에 `p-6`을 주고
         가운데에 짧은 선을 그었는데, 그 선이 카드 폭보다 짧아 **카드가 두 조각으로 잘려**
         보였다. 다른 카드들은 선이 카드 끝까지 닿는다(§DESIGN 2 "카드 안의 선은 표가
         시작하는 자리 하나뿐").
      ⚠️ 안쪽 여백은 `px-7`이다 — 목록 카드와 같은 값이라 오갈 때 글 시작선이 안 흔들린다.
    */
    /*
      ⚠️ **카드는 칸을 다 쓴다**(2026-08-11). 720으로 묶어 가운데 띄워 뒀더니 카드 좌우가
         똑같이 비어 어디에도 안 붙은 채 떠 보였다 — 곁 목록(360)과 나란히 서는 상세라
         남는 폭은 카드가 가져간다(액션 상세와 같은 판단).
      ⚠️ 대신 **글줄만 720에서 끊는다**(§DESIGN 4: 읽는 글은 좁게 둔다). 좁혀야 하는 건
         카드가 아니라 글이다.
    */
    <article className="border-border bg-card flex min-h-[560px] w-full flex-col overflow-hidden rounded-2xl border">
      {/*
        ⚠️ **가운데 정렬이다**(`items-center`). 위에 붙여 뒀더니 11px짜리 날짜가 28px 버튼
           옆에서 혼자 천장에 매달려 보였다 — 한 줄에 선 것들은 가운데를 맞춘다.
      */}
      <div className="border-border flex items-center justify-between gap-3 border-b px-7 pt-6 pb-3">
        <div className="min-w-0">
          {/* ⚠️ 날짜는 라벨 크기(12px)다. 11px는 칩·꼬리표 자리라 홀로 선 값에는 너무 작다 */}
          <p className="text-muted-foreground text-[12px] leading-4">
            {formatDate(notice.publishedAt)}
          </p>
          {/*
            ⚠️ **17px이다**(다섯 크기 — DESIGN §4). `text-lg`(18px)는 규격 밖이고,
               이 카드에서 제일 큰 글자라 카드 제목과 같은 자리를 쓴다.
          */}
          <h2 className="text-foreground mt-1 text-[17px] leading-7 font-semibold tracking-[-0.3px]">
            {notice.title}
          </h2>
        </div>

        {canManage && (
          <div className="flex shrink-0 gap-2">
            <NoticeEditDialog notice={notice} />
            <NoticeDeleteButton id={notice.id} title={notice.title} />
          </div>
        )}
      </div>

      {/*
        ⚠️ **본문은 13px이다**(다섯 크기). 14px은 규격 밖이고, 이 글은 읽는 글이라 줄 간격을
           넉넉히(22px) 준다.
        ⚠️ 색을 본문색으로 올린다. 보조색으로 깔아 두니 **정작 읽으라고 띄운 글이 제일 흐렸다**.
        ⚠️ **`break-words`가 필요하다**(2026-08-10 리뷰). 카드에 `overflow-hidden`이 걸려 있는데
           마크다운도 **띄어쓰기 없는 긴 문자열을 못 나눈다** — 붙여 넣은 URL 하나가 720px을
           넘으면 넘친 만큼 조용히 잘려 나가고 스크롤도 안 생겨, 글자가 있었다는 것조차 안 보인다
           (§정직성). 공지 본문은 사용자가 쓰는 글이라 무엇이 들어올지 모른다.
      */}
      <MarkdownContent content={notice.body} className="text-foreground/85 px-7 py-6" />
    </article>
  );
}
