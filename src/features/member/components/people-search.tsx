"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

/**
 * 구성원 찾기 — **상호작용 잎사귀만** 클라이언트다(§핵심 4원칙 1).
 *
 * ⚠️ 검색어는 **주소에 적는다**(`?q=`). 화면 안 상태로 두면 새로고침·뒤로 가기에서 조건이
 *    날아가고, 찾은 사람을 남에게 링크로 보낼 수도 없다.
 * ⚠️ **적는 동안 보내지 않는다.** 한 글자마다 서버를 부르면 요청이 줄줄이 나가고 커서가
 *    튄다 — 잠깐 멈추면 그때 보낸다(사원 관리 목록과 같은 규칙).
 */

/** 적기를 멈춘 뒤 이만큼 지나면 보낸다 — 짧으면 요청이 줄줄이 나가고 길면 굼떠 보인다 */
const SEARCH_DEBOUNCE_MS = 300;

export function PeopleSearch({ keyword }: { keyword: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* 입력칸은 화면이 들고 있다 — 주소를 곧바로 따라가면 한 글자마다 주소가 바뀐다 */
  const [value, setValue] = useState(keyword);

  const pushKeyword = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim()) params.set("q", next.trim());
      else params.delete("q");

      /*
        ⚠️ `replace` + `scroll: false`. 찾기는 새 화면이 아니라 같은 화면의 다른 모습이라
           뒤로 가기 기록을 쌓지 않고, 스크롤도 그대로 둔다.
      */
      router.replace(`/app/people${params.size > 0 ? `?${params}` : ""}`, { scroll: false });
    },
    [router, searchParams],
  );

  /*
    ⚠️ **다듬은 값끼리 견준다.** 주소에는 `trim`한 값을 적는데 가드는 원본을 견주면,
       `김 `처럼 뒤에 공백이 남는 순간(한글 조합·붙여넣기에서 흔하다) `"김 " !== "김"`이라
       가드가 영영 안 걸린다 — 이미 같은 주소인데 300ms마다 `replace`를 다시 부른다.
  */
  useEffect(() => {
    if (value.trim() === keyword.trim()) return;
    const timer = setTimeout(() => pushKeyword(value), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, keyword, pushKeyword]);

  return (
    <div className="relative w-full max-w-[280px]">
      <Search
        className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        id="people-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="이름·팀·역할·직급 검색"
        className="pl-9"
      />
      {/* 칸 이름을 자리표시자로만 두지 않는다 — 적기 시작하면 사라진다(§a11y) */}
      <label htmlFor="people-search" className="sr-only">
        구성원 검색
      </label>
    </div>
  );
}
