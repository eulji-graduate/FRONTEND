import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    /*
      ⚠️ **`^@/...`로 걸면 안 된다.** SWC(next의 jest 트랜스포머)가 `tsconfig.json`의
         `paths`를 이미 트랜스파일 시점에 써서 `@/components/common/markdown-content`를
         `../../../components/common/markdown-content` 같은 **상대 경로로 먼저 바꿔치기한다**
         (2026-08-13 실측 — `jest-transform-cache`에 남은 컴파일 결과로 확인). moduleNameMapper는
         그 뒤에 남은 문자열을 보므로, 별칭이 아니라 **경로 끝(파일 이름)으로** 잡아야 호출한
         파일의 상대 깊이와 무관하게 걸린다.
      ⚠️ `react-markdown`·`remark-gfm`·`rehype-sanitize`는 ESM만 내놓는데 `next/jest`가
         `transformIgnorePatterns`를 덮어써서 변환 대상에 못 넣는다 — 대역으로 바꾼다
         (`lenis`와 같은 문제, 대역 파일 주석 참고).
    */
    "components/common/markdown-content$": "<rootDir>/test/markdown-content-stub.tsx",
    "^@/(.*)$": "<rootDir>/src/$1",
    /*
      ⚠️ `next/cache`를 대역으로 바꾼다. `"use server"` 파일을 클라이언트 컴포넌트가 import할 때
         실제 Next는 그 자리를 클라이언트 참조로 바꾸지만 jest에는 그 변환이 없어서,
         서버 내부 구현이 그대로 로드되며 jsdom에 없는 전역(`Request` 등)을 건드려 터진다.
         자세한 이유는 대역 파일 주석에 있다.
    */
    "^next/cache$": "<rootDir>/test/next-cache-stub.ts",
    /*
      ⚠️ `lenis`는 ESM만 내놓는데 `next/jest`가 `transformIgnorePatterns`를 덮어써서 변환 대상에
         못 넣는다 — 대역으로 바꾼다. 부드러운 스크롤은 jsdom에서 잴 것이 없다(대역 주석 참고).
    */
    "^lenis$": "<rootDir>/test/lenis-stub.ts",
  },
  /*
    테스트는 전부 `src/` 안에 있다. 수집 범위를 여기로 못박아야 레포 안에 생기는 체크아웃
    사본(`.claude/worktrees/*` 등)의 테스트를 끌어오지 않는다.
    ⚠️ 한 번 들어왔다가 develop 병합 때 사라졌던 줄이다(#248) — 지우면 전체 `jest`가 남의
       작업본까지 돌며 남의 실패를 우리 실패로 보고한다.
  */
  roots: ["<rootDir>/src"],
  // Playwright 스펙은 e2e/ 에만 둔다 (CONVENTIONS §18)
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/", "<rootDir>/e2e/"],
};

export default createJestConfig(config);
