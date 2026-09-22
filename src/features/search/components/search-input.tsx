"use client";

import { Clock, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

import { addRecentSearch, getRecentSearches } from "../lib/recent-search-storage";

/** 적기를 멈춘 뒤 이만큼 지나면 보낸다 — 짧으면 요청이 줄줄이 나가고 길면 굼떠 보인다 */
const SEARCH_DEBOUNCE_MS = 300;

interface SearchInputProps {
  keyword: string;
}

/**
 * 검색창 — **상호작용 잎사귀만** 클라이언트다(§핵심 4원칙 1).
 *
 * ⚠️ 검색어는 **주소에 적는다**(`?q=`). 화면 안 상태로 두면 새로고침·뒤로 가기에서
 *    조건이 날아가고, 찾은 결과를 남에게 링크로 보낼 수도 없다(`people-search.tsx`와 같은 규칙).
 * ⚠️ **적는 동안 기록하지 않는다.** 한 글자마다 최근 검색어를 남기면 "ㅈ"·"제"·"제품"이
 *    전부 기록된다 — 잠깐 멈추면 그때 주소를 바꾸고, 그때 딱 한 번만 기록한다.
 * ⚠️ **최근 검색어는 서버가 아니라 로컬 저장소에서 나온다**(BE에 기록·조회 API가 없다, #422).
 *    기기·브라우저 국한이라는 한계는 있지만, 없는 API를 기다리며 화면을 비워 두는 것보다는
 *    이 브라우저에서라도 되는 게 낫다는 판단이다.
 */
export function SearchInput({ keyword }: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(keyword);
  /* 마지막으로 `value`를 맞춘 주소값 — 아래 렌더 중 동기화가 한 번만 일어나게 지키는 표시다 */
  const [syncedKeyword, setSyncedKeyword] = useState(keyword);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /*
    ⚠️ **지연 초기화로 읽는다(이펙트가 아니다).** 서버 렌더 패스에서는 `window`가 없어
       `getRecentSearches()`가 빈 배열을 준다 — 첫 렌더는 `isOpen`이 항상 `false`라 이 값이
       화면에 그려지지 않으므로, 하이드레이션 시 실제 값으로 다시 계산돼도 어긋나지 않는다.
  */
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  /*
    입력을 눌렀을 때 아래로 펴는 최근 검색어.
    ⚠️ **적기 시작하면 닫는다.** 글자를 치는 중에도 떠 있으면 결과를 가린다 — 이 목록은
       "무엇을 찾을지 고르는" 자리이지 결과가 아니다.
    ⚠️ **밖을 누르면 닫는다.** 포커스가 빠질 때(`blur`)만 닫으면, 목록 안 항목을 누르는 손짓이
       blur를 먼저 일으켜 **눌리기 전에 사라진다** — 그래서 마우스 다운을 막고 바깥 클릭을 본다.
  */
  const [isOpen, setIsOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const commit = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");

      router.replace(`/app/search${params.size > 0 ? `?${params}` : ""}`, { scroll: false });
      if (trimmed) setRecentSearches(addRecentSearch(trimmed));
    },
    [router, searchParams],
  );

  /*
    ⚠️ **주소가 바깥에서 바뀌면 입력칸도 맞춘다 — 렌더 중에, 이펙트가 아니다**
       (react.dev "Adjusting some state when a prop changes"). 최근 검색어 칩·탭처럼
       `Link`로 `q`가 바뀌는 경로가 따로 있다 — 그때 입력칸이 옛 글자를 그대로 들고 있으면
       주소와 화면이 다른 말을 한다.
    ⚠️ 여기서 타이머를 직접 건드리지 않는다(ref는 렌더 중에 못 읽는다) — `value`가 이
       렌더에서 `keyword`로 맞춰지면 아래 디바운스 이펙트가 다시 돌면서 **그 이펙트의
       클린업이** 밀린 타이머를 알아서 지운다.
  */
  if (keyword !== syncedKeyword) {
    setSyncedKeyword(keyword);
    setValue(keyword);
  }

  useEffect(() => {
    if (value.trim() === keyword.trim()) return;
    debounceTimer.current = setTimeout(() => commit(value), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value, keyword, commit]);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutside(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const canOpen = recentSearches.length > 0 && value.trim().length === 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <Search
        className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-5 size-[18px] -translate-y-1/2"
        aria-hidden
      />
      <Input
        id="workbench-search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          /* 적기 시작하면 닫는다 — 목록이 결과를 가리면 안 된다 */
          if (event.target.value.trim().length > 0) setIsOpen(false);
        }}
        onFocus={() => canOpen && setIsOpen(true)}
        onClick={() => canOpen && setIsOpen(true)}
        /*
          ⚠️ **`role="combobox"`를 선언하지 않는다**(2026-08-10 리뷰). 그 역할은 화살표로
             후보를 오르내리고 Enter로 고르는 **동작 약속**인데, 이 목록은 그냥 링크 몇 개다 —
             선언만 하면 스크린리더 사용자는 콤보박스인 줄 알고 화살표를 눌렀다가 아무 일도
             안 일어나는 걸 겪는다. 없는 기능을 있다고 말하지 않는다(§정직성).
             후보 탐색을 진짜 붙이는 날 `listbox`·`option`·`aria-activedescendant`까지 함께 단다.
        */
        placeholder="회의·액션·프로젝트·사람을 검색해 주세요"
        /*
          ⚠️ **찾으러 온 사람이 제일 먼저 보는 것**이라 크게 세운다(h-13·완전 둥근 모서리).
             검색 서비스들이 입력을 크고 둥글게 두는 이유는 "여기에 쓰면 된다"를 모양으로
             말하기 때문이다 — 다른 폼 입력과 같은 크기면 그 말을 못 한다.
          ⚠️ 그림자는 **아주 얕게**. 사내 도구라 붕 떠 보이면 산만하다(§디자인 토큰).
          ⚠️ 글자는 다섯 크기의 `13px`이다 — 상자가 커졌다고 글자까지 키우지 않는다.
        */
        className="focus-visible:border-foreground/30 h-13 rounded-full pl-12 text-[13px] shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_5%,transparent),0_2px_8px_color-mix(in_oklch,var(--foreground)_4%,transparent)] md:text-[13px]"
      />
      <label htmlFor="workbench-search" className="sr-only">
        검색
      </label>

      {isOpen && (
        /*
          ⚠️ **입력과 같은 폭·같은 모서리 결로 붙인다.** 폭이 다르면 입력에 딸린 것이 아니라
             따로 뜬 창처럼 보인다.
          ⚠️ `z-20`이다 — 아래 목록 카드 위에 떠야 한다.
        */
        <ul
          id="recent-search-list"
          className="border-border bg-popover absolute top-full right-0 left-0 z-20 mt-2 overflow-hidden rounded-2xl border py-1.5 shadow-[0_4px_16px_color-mix(in_oklch,var(--foreground)_8%,transparent)]"
        >
          <li className="text-muted-foreground/70 px-4 pt-1 pb-1.5 text-[11px] leading-4">
            최근 검색어
          </li>
          {recentSearches.map((keyword) => (
            <li key={keyword}>
              <Link
                href={`/app/search?q=${encodeURIComponent(keyword)}`}
                /* ⚠️ 마우스 다운이 포커스를 빼앗아 목록이 먼저 닫히는 것을 막는다 */
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setIsOpen(false)}
                className="hover:bg-foreground/5 focus-visible:bg-foreground/5 flex items-center gap-2.5 px-4 py-2 text-[13px] leading-5 outline-hidden"
              >
                <Clock className="text-muted-foreground/70 size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{keyword}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => setValue("")}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-4 flex size-7 -translate-y-1/2 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
