import fs from "node:fs";
import path from "node:path";

import { AUTHORITY } from "@/constants/authority";
import type { Actor } from "@/lib/permission";

import { roleHome } from "./home";
import { dashboardFor, navFor } from "./nav-config";

/**
 * 사이드바 구성 — **Admin이 역할을 갈아치우지 않는지**가 핵심이다.
 * 겸직자가 자기 대시보드나 팀 관리를 잃으면 그게 이 파일에서 가장 크게 터지는 실수다.
 */

const actor = (role: Actor["role"], isAdmin = false): Actor => ({ id: 1, role, isAdmin });

const titles = (sections: ReturnType<typeof navFor>) => sections.map((s) => s.title ?? "(기본)");
const labels = (sections: ReturnType<typeof navFor>, title: string) =>
  sections.find((s) => s.title === title)?.items.map((i) => i.label) ?? [];
const allHrefs = (sections: ReturnType<typeof navFor>) =>
  sections.flatMap((s) => s.items.map((i) => i.href));

describe("대시보드", () => {
  it.each([
    [AUTHORITY.OWNER, "/owner"],
    [AUTHORITY.LEADER, "/team"],
    [AUTHORITY.MEMBER, "/my"],
  ])("%s의 첫 항목은 자기 대시보드다", (role, href) => {
    expect(navFor(actor(role))[0]?.items[0]?.href).toBe(href);
  });
});

describe("Owner", () => {
  it("회사 운영을 늘 본다 — `is_admin` 없이도", () => {
    expect(titles(navFor(actor(AUTHORITY.OWNER)))).toContain("회사 운영");
  });

  it("기업 설정·인수인계서 관리는 Owner만 본다", () => {
    const items = labels(navFor(actor(AUTHORITY.OWNER)), "회사 운영");
    expect(items).toContain("기업 설정");
    expect(items).toContain("인수인계서 관리");
  });

  it("회의실 관리가 **없다** — 들어가도 아무것도 못 하는 목록이라 메뉴가 거짓말을 한다", () => {
    expect(labels(navFor(actor(AUTHORITY.OWNER)), "회사 운영")).not.toContain("회의실 관리");
  });

  /*
    ⚠️ Owner에게 `is_admin`을 켜도 마찬가지다 — **Owner는 Admin을 겸할 수 없어**
       (`canGrantAdmin`) 값이 잘못 내려와도 `canManageRooms`가 걸러 낸다(§권한).
  */
  it("`is_admin`이 잘못 켜져 내려와도 회의실 관리는 안 붙는다", () => {
    expect(labels(navFor(actor(AUTHORITY.OWNER, true)), "회사 운영")).not.toContain("회의실 관리");
  });

  it("내 액션·인수인계가 **없다** — 액션을 받는 자리가 아니고 인수인계를 쓰는 쪽도 아니다", () => {
    const hrefs = allHrefs(navFor(actor(AUTHORITY.OWNER)));
    expect(hrefs).not.toContain("/app/my/actions");
    expect(hrefs).not.toContain("/app/handover");
  });

  it("팀 관리는 없다 — 부서 스코프는 팀장의 것이다", () => {
    expect(titles(navFor(actor(AUTHORITY.OWNER)))).not.toContain("팀 관리");
  });
});

describe("Leader", () => {
  it("팀 관리가 붙는다", () => {
    expect(labels(navFor(actor(AUTHORITY.LEADER)), "팀 관리")).toEqual([
      "팀원 관리",
      "팀 액션 관리",
      "인수인계서 관리",
    ]);
  });

  it("겸직이 아니면 회사 운영은 없다", () => {
    expect(titles(navFor(actor(AUTHORITY.LEADER)))).not.toContain("회사 운영");
  });

  it("내 액션·인수인계를 본다 — Owner와 갈리는 지점이다", () => {
    const hrefs = allHrefs(navFor(actor(AUTHORITY.LEADER)));
    expect(hrefs).toContain("/app/my/actions");
    expect(hrefs).toContain("/app/handover");
  });
});

describe("Member", () => {
  it("워크벤치만 본다 — 팀 관리도 회사 운영도 없다", () => {
    expect(titles(navFor(actor(AUTHORITY.MEMBER)))).toEqual(["(기본)", "워크벤치"]);
  });
});

describe("Admin 겸직", () => {
  /*
    ⚠️ 여기가 이 파일의 핵심이다. Admin은 **역할이 아니라 덧붙는 권한**이라(WORKFLOW §9),
       겸직해도 원래 역할의 구역이 그대로 남아야 한다.
  */
  it("팀장이 겸직해도 **팀 관리를 잃지 않는다**", () => {
    const sections = navFor(actor(AUTHORITY.LEADER, true));
    expect(titles(sections)).toEqual(["(기본)", "워크벤치", "팀 관리", "회사 운영"]);
  });

  it("사원이 겸직하면 워크벤치는 그대로 두고 회사 운영만 붙는다", () => {
    expect(titles(navFor(actor(AUTHORITY.MEMBER, true)))).toEqual([
      "(기본)",
      "워크벤치",
      "회사 운영",
    ]);
  });

  it("회의실 관리는 **겸직자만** 본다 — 사원 관리 바로 뒤에 붙는다", () => {
    const items = labels(navFor(actor(AUTHORITY.LEADER, true)), "회사 운영");
    expect(items.slice(0, 2)).toEqual(["사원 관리", "회의실 관리"]);
  });

  it("겸직자는 대시보드가 **그대로다** — 관리 화면으로 첫 화면이 바뀌지 않는다", () => {
    expect(navFor(actor(AUTHORITY.LEADER, true))[0]?.items[0]?.href).toBe("/team");
  });

  it("겸직자에게 기업 설정·인수인계서 관리는 **안 보인다** — 위계상 Owner의 것이다", () => {
    const items = labels(navFor(actor(AUTHORITY.MEMBER, true)), "회사 운영");
    expect(items).not.toContain("기업 설정");
    expect(items).not.toContain("인수인계서 관리");
  });

  it("**계정 발급은 별도 탭이 아니다** — 사원 관리 화면 안 버튼이라 사이드바엔 안 뜬다", () => {
    // ⚠️ Owner·겸직자 모두 "사원 관리"만 보인다. 발급 가능 여부(canIssueAccount)는
    //    같은 화면 안에서 canManageMembers와 같은 문으로 갈리므로 nav엔 항목이 없다.
    expect(labels(navFor(actor(AUTHORITY.OWNER)), "회사 운영")).not.toContain("계정 발급");
    expect(labels(navFor(actor(AUTHORITY.MEMBER, true)), "회사 운영")).not.toContain("계정 발급");
  });
});

/**
 * 로고가 데려갈 곳 — **메뉴 [대시보드]와 한 항목**이어야 한다.
 * 둘이 갈라지면 메뉴는 "준비 중"이라 말하는데 로고만 404로 데려간다.
 */
describe("dashboardFor", () => {
  it.each([
    [AUTHORITY.OWNER, "/owner"],
    [AUTHORITY.LEADER, "/team"],
    [AUTHORITY.MEMBER, "/my"],
    [AUTHORITY.SYSTEM, "/system"],
  ])("%s의 로고는 자기 대시보드로 간다 — 랜딩이 아니다", (role, href) => {
    expect(dashboardFor(role).href).toBe(href);
    expect(dashboardFor(role).href).not.toBe("/");
  });

  /*
    ⚠️ 참조가 아니라 **값**을 본다. 둘 다 `isReady`를 입히며 새 객체를 만들기 때문이다.
       지켜야 하는 건 "같은 객체"가 아니라 **로고와 메뉴가 같은 곳·같은 준비 상태**라는 것이다.
  */
  it("사이드바 첫 항목과 값이 같다 — 갈라지면 한쪽만 준비 상태를 본다", () => {
    for (const role of [AUTHORITY.OWNER, AUTHORITY.LEADER, AUTHORITY.MEMBER] as const) {
      expect(navFor(actor(role))[0]?.items[0]).toStrictEqual(dashboardFor(role));
    }
  });

  it("겸직해도 로고는 그대로다 — Admin은 첫 화면을 바꾸지 않는다", () => {
    expect(dashboardFor(actor(AUTHORITY.LEADER, true).role).href).toBe("/team");
  });
});

/**
 * 로그인 뒤 데려다 놓는 곳(`roleHome`)과 로고가 가리키는 곳(`dashboardFor`)은
 * **같아야 한다.** 갈라지면 로그인 직후 떨어진 화면과 로고가 데려가는 화면이 달라진다 —
 * 둘 다 "첫 화면"이라고 말하면서 서로 다른 곳을 가리킨다.
 */
describe("첫 화면은 한 곳이다", () => {
  it.each([AUTHORITY.OWNER, AUTHORITY.LEADER, AUTHORITY.MEMBER, AUTHORITY.SYSTEM])(
    "%s의 roleHome과 로고 목적지가 같다",
    (role) => {
      expect(dashboardFor(role).href).toBe(roleHome(role));
    },
  );
});

/**
 * **화면을 만들면 자동으로 이어지는지** 본다.
 *
 * ⚠️ 전에는 항목마다 `isReady`를 손으로 켰다. 그래서 대시보드 3개와 캘린더가 머지됐는데도
 *    플래그가 안 올라가, **화면은 멀쩡한데 눌러도 "준비 중"만 뜨고 안 넘어갔다.**
 *    이제 `routes.ts`가 `src/app`을 읽어 자동으로 정한다 — 이 테스트는 그 자동 판정이
 *    실제 라우트와 어긋나지 않는지 지킨다.
 */
describe("화면이 있으면 자동으로 이어진다", () => {
  const everyItem = [AUTHORITY.OWNER, AUTHORITY.LEADER, AUTHORITY.MEMBER, AUTHORITY.SYSTEM].flatMap(
    (role) => [dashboardFor(role), ...navFor(actor(role)).flatMap((section) => section.items)],
  );

  it.each([
    ["/owner", "대시보드"],
    ["/team", "대시보드"],
    ["/my", "대시보드"],
    ["/app/projects", "프로젝트"],
    ["/app/search", "검색"],
    ["/app/calendar", "캘린더"],
    ["/app/notice", "공지"],
    ["/app/me", "마이페이지"],
    ["/manage/billing", "구독 관리"],
    ["/manage/storage", "녹음 용량"],
    ["/owner/setting", "기업 설정"],
    ["/manage/members", "사원 관리"],
    ["/app/meeting", "내 회의"],
  ])("만들어진 화면 `%s`(%s)는 링크가 된다", (href) => {
    const item = everyItem.find((candidate) => candidate.href === href);

    expect(item).toBeDefined();
    expect(item?.isReady).toBe(true);
  });

  /*
    ⚠️ 자동 판정이 **양쪽 다** 맞아야 한다. 한쪽만 보면 "전부 true"로 만들어도 통과한다.
  */
  it("모든 항목의 판정이 실제 `page.tsx` 존재와 일치한다", () => {
    const routes = collectAppRoutes(path.join(process.cwd(), "src/app"));

    const mismatched = everyItem
      .filter((item) => Boolean(item.isReady) !== routes.has(item.href))
      .map((item) => `${item.label} (${item.href}) — isReady=${item.isReady}`);

    expect(mismatched).toEqual([]);
  });

  /* ⚠️ 중첩 그룹(`/a/(x)/(y)/page.tsx`)도 한 라우트다 — 헬퍼가 여기서 한 번 깨졌다 */
  it("중첩 라우트 그룹도 한 겹이 아니라 끝까지 판다", () => {
    const routes = collectAppRoutes(path.join(process.cwd(), "src/app"));

    expect(routes.has("/owner")).toBe(true);
    expect(routes.has("/manage/billing")).toBe(true);
  });
});

/**
 * `src/app` 아래 **모든 고정 라우트**를 모은다.
 *
 * ⚠️ 경로를 거슬러 찾지 않는다. 전에는 href를 한 칸씩 따라가며 그룹을 건너뛰었는데,
 *    **중첩 그룹**(`/owner/(shell)/(dashboard)/page.tsx`)에서 한 겹만 보고 놓쳤다 —
 *    제품 코드는 맞게 판정했는데 테스트만 틀려서 잘못된 실패가 났다.
 *    전부 모아 놓고 `has`로 보면 깊이가 몇 겹이든 상관없다.
 */
function collectAppRoutes(root: string): Set<string> {
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
      // 동적 구간(`[id]`)은 사이드바가 가리키지 않는다
      if (segments.some((segment) => segment.includes("["))) continue;

      const url = segments.filter((segment) => !segment.startsWith("(")).join("/");
      found.add("/" + url);
    }
  };

  walk(root);
  return found;
}
