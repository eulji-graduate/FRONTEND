import type { Metadata } from "next";

import { OrgChartView } from "@/features/member/components/org-chart-view";
import { getPeopleDirectory } from "@/features/member/org-server";

export const metadata: Metadata = {
  title: "구성원",
};

/** 주소에서 온 검색어를 한 줄로 맞춘다 — 여러 번 왔으면 **첫 값**만 쓴다 */
function toKeyword(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * 구성원 — **회사에서 사람을 찾는 자리**다.
 *
 * 워크플로우를 따라가 보면 여기서 하는 일은 하나다: **누구에게 말을 걸어야 하는가.**
 * 회의 참석자를 고를 때(§3-1), 액션 담당자가 누구인지 볼 때(§4·§6), 인수인계를 넘길
 * 사람을 찾을 때(§7), 다른 팀에 뭘 물어볼지 정할 때 — 전부 "이 사람 어느 팀이고 뭘 맡나"다.
 * 그래서 **검색**(찾기)과 **조직도**(구조), 둘이 이 화면의 전부다.
 *
 * ⚠️ **권한 가드가 없다.** `(app)`은 로그인한 전원이 쓰는 공용 워크벤치다 — 사원 관리
 *    (`/manage/members`)와 **다른 화면**이고, 관리자만 알아야 하는 값(승인 대기·이메일·
 *    입사일)은 여기 안 싣는다.
 * ⚠️ 조회뿐이라 Server Component 하나로 끝난다. 검색 입력만 잎사귀로 나가 있다.
 */
export default async function AppPeoplePage({
  searchParams,
}: {
  /*
    ⚠️ **`string`으로만 적으면 거짓말이다.** 주소는 같은 이름을 여러 번 받을 수 있어
       (`?q=김&q=이`) 값이 배열로 온다 — 타입만 좁게 적어 두면 타입 검사는 통과하고
       실행할 때 `keyword.trim()`에서 터진다(주소만 치면 누구나 낼 수 있는 500이다).
  */
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const keyword = toKeyword((await searchParams).q);
  const { summary, chart } = await getPeopleDirectory(keyword);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      {/*
        ⚠️ **카드 한 장이다.** 인원·팀·휴직을 큰 숫자 카드로 따로 뒀더니 값이 셋뿐이라
           1440을 못 채우고 빈 띠만 얹혔다 — 조직도 머리 오른쪽 한 줄로 옮겼다(§DESIGN 2).
      */}
      <div className="mx-auto w-full max-w-[1440px]">
        <OrgChartView chart={chart} summary={summary} keyword={keyword} />
      </div>
    </main>
  );
}
