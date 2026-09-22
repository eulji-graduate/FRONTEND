"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { InfiniteListFooter } from "@/components/common/infinite-list-footer";
import { Input } from "@/components/ui/input";
import { useInfiniteScrollList } from "@/hooks/use-infinite-scroll-list";
import { cn } from "@/lib/utils";

import { fetchMembersPageAction } from "../manage-actions";
import {
  type ManagedMember,
  MEMBER_FILTER,
  MEMBER_FILTER_LABEL,
  type MemberFilter,
  type MemberQuery,
} from "../manage-types";
import type { TeamRoleOption } from "../team-roles";
import { AccountIssueDialog } from "./account-issue-dialog";
import { MemberTable } from "./member-table";

/**
 * 사원 목록 — **서버가 거르고 자른다.**
 *
 * ⚠️ 전부 받아 화면에서 `slice`하지 않는다(CLAUDE.md §목록·페이지네이션). 사원이 수백 명이면
 *    그 수백을 다 받아 오고 화면만 잘린다 — 첫 페이지는 서버가 렌더하고, 그 아래부터
 *    스크롤이 끝에 닿으면 이어 붙인다.
 * ⚠️ 검색·필터는 **주소에 적는다**(`?q=`·`?filter=`). 화면 안 상태로 두면 지금 받아 온
 *    페이지 안에서만 찾게 되어 "없습니다"가 거짓말이 되고, 새로고침·뒤로 가기에서 조건이
 *    날아간다.
 * ⚠️ 검색은 **적는 동안 보내지 않는다.** 한 글자마다 서버를 부르면 요청이 줄줄이 나가고
 *    커서가 튄다 — 잠깐 멈추면 그때 보낸다.
 */

/** 컴포넌트 밖에 둬서 매 렌더 새 함수가 안 되게 한다(센티널 재부착 방지) */
function getId(member: ManagedMember) {
  return String(member.id);
}

/** 적기를 멈춘 뒤 이만큼 지나면 보낸다 — 짧으면 요청이 줄줄이 나가고 길면 굼떠 보인다 */
const SEARCH_DEBOUNCE_MS = 300;

export function MemberListView({
  initialItems,
  initialPage,
  initialTotalPages,
  initialTotalCount,
  query,
  canIssueAccount,
  teamNames,
  positionNames,
  teamRoles,
}: {
  initialItems: ManagedMember[];
  initialPage: number;
  initialTotalPages: number;
  initialTotalCount: number;
  /** 지금 걸려 있는 조건 — 주소에서 읽어 서버가 넘겨준 값이다 */
  query: MemberQuery;
  canIssueAccount: boolean;
  /** 계정 발급 모달이 고를 팀 — 목록이 이미 서버에서 받아 온 값이라 같이 내려보낸다 */
  teamNames: string[];
  /** 회사가 만든 직급 이름들 — 발급 창이 이 안에서만 고르게 한다 */
  positionNames: string[];
  /** 팀 이름 → 그 팀의 역할들. 역할은 팀에 매여 있다 */
  teamRoles: Record<string, TeamRoleOption[]>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /*
    ⚠️ 입력칸은 **화면이 들고 있다**(주소를 곧바로 따라가면 한 글자마다 주소가 바뀐다).
       주소에 적는 건 잠깐 멈춘 뒤다.
  */
  const [keyword, setKeyword] = useState(query.keyword);

  /** 조건을 주소에 적는다 — 값이 비면 파라미터를 지워 주소가 깨끗하게 남는다 */
  const pushQuery = useCallback(
    (next: { keyword?: string; filter?: MemberFilter }) => {
      const params = new URLSearchParams(searchParams.toString());
      const q = next.keyword ?? query.keyword;
      const f = next.filter ?? query.filter;

      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");

      if (f !== MEMBER_FILTER.ALL) params.set("filter", f);
      else params.delete("filter");

      /*
        ⚠️ `replace` + `scroll: false`. 거르기는 새 화면이 아니라 같은 화면의 다른 모습이라
           뒤로 가기 기록을 쌓지 않고, 스크롤도 그대로 둔다.
      */
      router.replace(`/manage/members${params.size > 0 ? `?${params}` : ""}`, { scroll: false });
    },
    [router, searchParams, query.keyword, query.filter],
  );

  useEffect(() => {
    if (keyword === query.keyword) return;
    const timer = setTimeout(() => pushQuery({ keyword }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keyword, query.keyword, pushQuery]);

  const fetchPage = useCallback((page: number) => fetchMembersPageAction(query, page), [query]);

  const { items, totalCount, hasMore, isLoadingMore, error, loadMore, sentinelRef } =
    useInfiniteScrollList({
      initialItems,
      initialPage,
      initialTotalPages,
      initialTotalCount,
      getId,
      fetchPage,
    });

  const isNarrowed = query.keyword.trim().length > 0 || query.filter !== MEMBER_FILTER.ALL;

  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto w-full max-w-[1440px]">
        <section className="border-border bg-card overflow-hidden rounded-2xl border">
          <div className="flex flex-wrap items-center gap-3 px-7 pt-6 pb-5">
            <div className="relative w-full max-w-[280px]">
              <Search
                className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="member-search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="이름·팀·직급 검색"
                className="pl-9"
              />
              {/* 칸 이름은 자리표시자로만 두지 않는다 — 적기 시작하면 사라진다(§a11y) */}
              <label htmlFor="member-search" className="sr-only">
                사원 검색
              </label>
            </div>

            {/*
              ⚠️ 상태 전부를 칸으로 늘어놓지 않는다. 이 화면에서 **손이 필요한 것**만 추린다 —
                 재직·퇴사는 검색으로 충분하고, 승인 대기는 놓치면 사람이 기다린다.
              ⚠️ **하나로 묶은 세그먼트다.** 고른 칸은 띄워서 알린다(밝은 면 + 옅은 그림자) —
                 먹색 채움은 이 화면에서 **행동 버튼**([계정 발급])의 몫이다.
            */}
            <div
              className="border-border bg-secondary/60 flex items-center gap-0.5 rounded-lg border p-0.5"
              role="group"
              aria-label="사원 거르기"
            >
              {Object.values(MEMBER_FILTER).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => pushQuery({ filter: value })}
                  aria-pressed={query.filter === value}
                  className={cn(
                    "focus-visible:ring-ring h-7 rounded-md px-3 text-[13px] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
                    query.filter === value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {MEMBER_FILTER_LABEL[value]}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-3">
              {/*
                ⚠️ **거른 수를 적는다.** 서버가 조건에 맞는 전체를 세어 주므로, 지금 화면에
                   몇 줄이 그려졌는지가 아니라 조건에 맞는 사람이 몇 명인지를 말한다
                   (§목록: 끝이 안 보이는 목록은 얼마나 남았는지 알 수 없다).
              */}
              <p className="text-foreground/75 text-[12px] leading-4 tabular-nums">
                {isNarrowed ? `찾은 사원 ${totalCount}명` : `전체 ${totalCount}명`}
              </p>

              {/*
                ⚠️ 계정 발급은 **사이드바 탭이 아니라 이 화면 안 버튼**이다(WORKFLOW §11).
                   전용 라우트를 두지 않고 **모달**로 연다 — 한 번 쓰고 마는 폼에 주소를
                   만들면 뒤로 가기가 어색해진다(공지 작성과 같은 패턴).
              */}
              {canIssueAccount && (
                <AccountIssueDialog
                  teamNames={teamNames}
                  positionNames={positionNames}
                  teamRoles={teamRoles}
                />
              )}
            </div>
          </div>

          <MemberTable
            members={items}
            /* 검색어나 거르개가 걸린 목록이면 빈 자리에 할 말이 다르다 */
            isFiltered={query.keyword.trim() !== "" || query.filter !== MEMBER_FILTER.ALL}
          />

          {/*
            ⚠️ 목록 끝의 빈 요소가 **감시 대상**이다 — 화면에 걸리면 자동으로 다음 페이지를
               부른다. [더 보기] 버튼은 없다(2026-08-10 폐기).
            ⚠️ 실패하면 조용히 멈추지 않는다 — [다시 시도]를 띄운다(§목록 3상태).
          */}
          <div className="border-border border-t px-7 py-3">
            <InfiniteListFooter
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              error={error}
              onLoadMore={loadMore}
              sentinelRef={sentinelRef}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
