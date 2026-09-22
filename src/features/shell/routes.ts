import "server-only";

import fs from "node:fs";
import path from "node:path";

/**
 * **실제로 만들어진 화면 목록** — `src/app` 아래에서 `page.tsx`를 찾아 URL로 바꾼다.
 *
 * ⚠️ 이게 있는 이유: 전에는 사이드바 항목마다 `isReady`를 손으로 켰다. 그래서 대시보드 3개와
 *    캘린더가 머지됐는데도 플래그가 안 올라가, **화면은 멀쩡한데 눌러도 "준비 중"만 뜨고
 *    안 넘어갔다.** 화면을 만드는 PR과 사이드바를 고치는 PR이 달라서 아무도 못 봤다.
 *    누가 화면을 만들든 **자동으로 이어지게** 하려고 라우트를 직접 읽는다.
 *
 * ⚠️ **서버에서만 돈다**(`server-only`). 클라이언트 번들에 들어가면 `node:fs`가 터진다 —
 *    사이드바는 서버가 구성을 만들어 props로 내려주므로 여기 있는 게 맞다.
 * ⚠️ **모듈 한 번만 읽는다.** 요청마다 디스크를 훑지 않는다. 개발 중에 화면을 새로 만들면
 *    Next가 모듈을 다시 컴파일하면서 여기도 다시 돈다.
 * ⚠️ 배포는 EC2에서 `pull → build → restart`라 실행 시점에도 소스가 그대로 있다
 *    (`output: "standalone"`이 아니다). 그 설정을 켜게 되면 **여기가 먼저 깨진다** —
 *    그때는 빌드 시점에 목록을 뽑아 두는 방식으로 바꿔야 한다.
 */

/** 괄호 그룹(`(shell)`·`(role)`)은 URL에 안 들어간다 */
function isRouteGroup(segment: string) {
  return segment.startsWith("(") && segment.endsWith(")");
}

/**
 * 동적 구간(`[id]`·`[...slug]`)이 있는 경로.
 *
 * ⚠️ 사이드바는 **고정 주소만** 가리킨다. `/app/notice/[id]`는 목록에서 눌러 들어가는
 *    자리라 메뉴에 걸릴 일이 없다 — 넣어 두면 `[id]`가 그대로 주소가 된다.
 */
function isDynamic(segment: string) {
  return segment.includes("[");
}

function collectRoutes(): ReadonlySet<string> {
  const root = path.join(process.cwd(), "src/app");
  const found = new Set<string>();

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name !== "page.tsx") continue;

      const segments = path.relative(root, dir).split(path.sep).filter(Boolean);
      if (segments.some(isDynamic)) continue;

      found.add("/" + segments.filter((segment) => !isRouteGroup(segment)).join("/"));
    }
  };

  walk(root);
  return found;
}

/*
  ⚠️ 못 읽으면 **빈 집합**으로 둔다. 그러면 모든 메뉴가 "준비 중"이 되는데, 그 편이
     전부 404로 보내는 것보다 낫다 — 눌러서 빈 화면을 만나는 것보다 안 열리는 게 정직하다.
     실제로 이런 일이 나면 배포 방식이 바뀐 것이므로 위 주석의 경고를 본다.
*/
let cached: ReadonlySet<string> | null = null;

/** 그 주소의 화면이 실제로 있는지 */
export function hasRoute(href: string): boolean {
  cached ??= (() => {
    try {
      return collectRoutes();
    } catch {
      return new Set<string>();
    }
  })();

  return cached.has(href);
}
