import {
  Check,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  Settings,
  Video,
  X,
} from "lucide-react";
import { Fragment } from "react";

/** 그룹 제목 옆 아이콘 — 표가 길어 어디가 어느 묶음인지 눈으로 잡히게 한다 */
const GROUP_ICON: Record<string, LucideIcon> = {
  "화면 접근": LayoutDashboard,
  프로젝트: FolderKanban,
  회의: Video,
  액션: ListTodo,
  인수인계: ClipboardList,
  관리: Settings,
};

import { cn } from "@/lib/utils";

import { type Access, PERMISSION_GROUPS, ROLE_COLUMNS } from "../permissions";

/**
 * 역할 × 기능 표.
 *
 * ⚠️ 색으로 구분하지 않는다(§디자인 토큰) — ✓ / − / △ 모양과 명도로 읽힌다.
 * ⚠️ 좁은 화면에서는 표를 줄이지 않고 **가로로 스크롤**한다. 칸이 접히면 비교가 안 된다.
 * ⚠️ 세모(`partial`)에는 조건 각주가 붙는다. 조건 없이 세모만 두면 뭐가 다른지 알 수 없다.
 */
function AccessMark({ value }: { value: Access }) {
  if (value === "yes") {
    return (
      <span className="bg-foreground text-background inline-flex size-6 items-center justify-center rounded-full">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
        <span className="sr-only">가능</span>
      </span>
    );
  }

  if (value === "partial") {
    /*
      ⚠️ 빼기(−)를 쓰지 않는다. "해당 없음"이나 "불가"로 읽혀서 뜻이 정반대로 전달된다.
         **되긴 된다**가 먼저 와야 하므로 체크를 쓰고, 조건이 붙었다는 건 **점선 테두리**와
         칸을 채우지 않은 것으로 알린다(가능=채운 원, 조건부=빈 원).
    */
    return (
      <span className="border-foreground text-foreground inline-flex size-6 items-center justify-center rounded-full border border-dashed">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
        <span className="sr-only">조건부 가능</span>
      </span>
    );
  }

  /*
    ⚠️ 불가 표식에도 **테두리를 준다.** 채움(`secondary`)만으로는 흰 카드 위에서 원이 거의 안 보여
       X만 떠 있는 것처럼 읽힌다. 가능(채운 원)·조건부(점선 원)와 나란히 놓이려면 원이 보여야 한다.
  */
  return (
    <span className="bg-secondary border-border text-muted-foreground inline-flex size-6 items-center justify-center rounded-full border">
      <X className="size-3.5" strokeWidth={3} aria-hidden />
      <span className="sr-only">불가</span>
    </span>
  );
}

function GroupIcon({ title }: { title: string }) {
  const Icon = GROUP_ICON[title];
  if (!Icon) return null;
  return <Icon className="text-foreground size-4 shrink-0" aria-hidden />;
}

export function PermissionTable() {
  const notes = PERMISSION_GROUPS.flatMap((group) =>
    group.rows.filter((row) => row.note).map((row) => ({ feature: row.feature, note: row.note })),
  );

  return (
    <>
      {/*
        표식 범례. ⚠️ **표보다 위**에 둔다 — 표가 길어서 아래에 두면 표식을 다 보고 난 뒤에야
        뜻을 만나게 된다. 읽는 순서대로 놓는다.
        ⚠️ 범례는 **문장이 아니라 라벨**이다. "할 수 있습니다"처럼 풀어 쓰면 표 옆에서 장황해진다 —
           본문은 합니다체를 쓰되 여기만 명사형으로 짧게 둔다(§카피).
        ⚠️ 색은 `muted`가 아니라 `foreground/75`다. 범례·각주는 **카드 밖 무대 위**에 있어서
           밝은 무대에서 muted를 쓰면 바탕에 묻힌다.
      */}
      <ul className="text-foreground/75 flex flex-wrap items-center gap-x-5 gap-y-2 pb-4 text-[12px] leading-5">
        <li className="flex items-center gap-2">
          <AccessMark value="yes" />
          <span>가능</span>
        </li>
        <li className="flex items-center gap-2">
          <AccessMark value="partial" />
          <span>조건부 — 표 아래 설명 참고</span>
        </li>
        <li className="flex items-center gap-2">
          <AccessMark value="no" />
          <span>불가</span>
        </li>
      </ul>

      <div className="border-border bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground w-[38%] py-3.5 pr-5 pl-[48px] text-left text-[12px] leading-4 font-medium">
                기능
              </th>
              {ROLE_COLUMNS.map((role) => (
                <th key={role} className="px-3 py-3.5 text-center text-[13px] leading-5">
                  {role}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <Fragment key={group.title}>
                {/*
                  ⚠️ 구역 머리는 **표를 끊어 읽게 하는 이정표**다. 11px 회색으로 두면
                     본문보다 흐려서 오히려 안 읽힌다 — 글자를 키우고 먹색으로 올린다.
                */}
                <tr className="bg-secondary">
                  <th
                    colSpan={5}
                    scope="colgroup"
                    className="text-foreground px-5 py-2.5 text-left text-[13px] leading-5 font-semibold"
                  >
                    <span className="flex items-center gap-3">
                      <GroupIcon title={group.title} />
                      {/* 한글 글자가 상자 안에서 위쪽에 앉아 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
                      <span>{group.title}</span>
                    </span>
                  </th>
                </tr>

                {group.rows.map((row) => (
                  <tr
                    key={`${group.title}-${row.feature}`}
                    className="border-border/60 hover:bg-secondary/40 border-t transition-colors"
                  >
                    {/*
                      ⚠️ 왼쪽 여백이 **구역 머리의 아이콘 자리만큼** 더 들어간다.
                         `20(px-5) + 16(아이콘) + 12(gap-3) = 48`. 이걸 안 맞추면 구역 머리 글자만
                         오른쪽으로 밀려 열이 두 줄로 어긋나 보인다.
                      ⚠️ gap을 바꾸면 이 값도 같이 바꾼다 — 둘은 같은 숫자를 보고 있다.
                    */}
                    <th
                      scope="row"
                      className="py-3 pr-5 pl-[48px] text-left text-[13px] leading-5 font-normal break-keep"
                    >
                      {row.feature}
                      {row.note && <sup className="text-muted-foreground/70 pl-0.5">*</sup>}
                    </th>
                    {([row.owner, row.leader, row.member, row.admin] as const).map(
                      (value, index) => (
                        <td key={ROLE_COLUMNS[index]} className={cn("px-3 py-3 text-center")}>
                          <AccessMark value={value} />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 조건이 무엇인지 밝힌다 — 표만 보고는 알 수 없다 */}
      {notes.length > 0 && (
        <ul className="flex flex-col gap-1.5 pt-4">
          {notes.map((item) => (
            <li
              key={item.feature}
              className="text-foreground/75 text-[12px] leading-[19px] break-keep"
            >
              <span className="pr-1">*</span>
              <strong className="text-foreground font-normal">{item.feature}</strong> — {item.note}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
