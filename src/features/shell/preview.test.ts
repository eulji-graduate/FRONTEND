import { AUTHORITY } from "@/constants/authority";

import { readPreview } from "./preview";

describe("readPreview", () => {
  it("쿼리가 없으면 아무것도 정하지 않는다", () => {
    expect(readPreview("")).toEqual({ role: null, isAdmin: false });
  });

  it("as로 권한을 정한다 — 대소문자를 가리지 않는다", () => {
    expect(readPreview("as=member").role).toBe(AUTHORITY.MEMBER);
    expect(readPreview("as=LEADER").role).toBe(AUTHORITY.LEADER);
    expect(readPreview("as=Owner").role).toBe(AUTHORITY.OWNER);
  });

  it("모르는 권한은 무시한다 — admin은 권한이 아니다", () => {
    expect(readPreview("as=admin").role).toBeNull();
    expect(readPreview("as=system").role).toBeNull();
    expect(readPreview("as=").role).toBeNull();
  });

  it("admin=1 또는 true면 관리자 겸직을 얹는다", () => {
    expect(readPreview("as=member&admin=1")).toEqual({ role: AUTHORITY.MEMBER, isAdmin: true });
    expect(readPreview("as=leader&admin=true").isAdmin).toBe(true);
    expect(readPreview("admin=TRUE").isAdmin).toBe(true);
  });

  it("그 밖의 admin 값은 겸직이 아니다", () => {
    expect(readPreview("as=member&admin=0").isAdmin).toBe(false);
    expect(readPreview("as=member&admin=no").isAdmin).toBe(false);
    expect(readPreview("as=member&admin=").isAdmin).toBe(false);
  });

  it("admin만 있어도 읽는다 — 권한은 주소가 정한다", () => {
    expect(readPreview("admin=1")).toEqual({ role: null, isAdmin: true });
  });

  it("앞의 ?를 붙여도 읽는다", () => {
    expect(readPreview("?as=member&admin=1")).toEqual({ role: AUTHORITY.MEMBER, isAdmin: true });
  });
});
