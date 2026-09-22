import { directionParticle, objectParticle, subjectParticle, topicParticle } from "./korean";

/**
 * 조사 고르기 — **사이드바 라벨이 실제로 지나가는 값**으로 묶는다.
 * 메뉴 이름은 모음으로 끝나는 게 더 많아서, 한쪽으로 고정하면 대부분이 틀린 말이 된다.
 */
describe("topicParticle", () => {
  it.each(["프로젝트", "캘린더", "회의", "보드", "마이페이지", "인수인계", "대시보드"])(
    "받침 없는 `%s`에는 `는`",
    (word) => {
      expect(topicParticle(word)).toBe("는");
    },
  );

  it.each(["검색", "회의실", "사람", "팀원", "녹음 용량", "계정 발급", "기업 설정"])(
    "받침 있는 `%s`에는 `은`",
    (word) => {
      expect(topicParticle(word)).toBe("은");
    },
  );

  it("띄어쓴 이름은 **마지막 글자**로 판단한다 — `녹음 용량`은 `량`이 받침을 갖는다", () => {
    expect(topicParticle("녹음 용량")).toBe("은");
    expect(topicParticle("팀 액션")).toBe("은");
  });

  it("한글이 아니면 받침이 있는 쪽으로 본다 — `Admin은`이 `Admin는`보다 덜 어색하다", () => {
    expect(topicParticle("Admin")).toBe("은");
    expect(topicParticle("STT")).toBe("은");
  });

  it("빈 문자열에도 터지지 않는다", () => {
    expect(topicParticle("")).toBe("은");
  });
});

describe("나머지 조사", () => {
  it("주격 — 받침 유무로 갈린다", () => {
    expect(subjectParticle("프로젝트")).toBe("가");
    expect(subjectParticle("검색")).toBe("이");
  });

  it("목적격 — 받침 유무로 갈린다", () => {
    expect(objectParticle("프로젝트")).toBe("를");
    expect(objectParticle("검색")).toBe("을");
  });
});

/**
 * 방향 조사 — **받침 `ㄹ`만 예외**라 다른 조사와 같이 묶을 수 없다.
 * 실제로 지나가는 값은 뒤로가기 라벨(화면 이름)이다.
 */
describe("directionParticle", () => {
  it.each(["회의", "공지", "회의 상세", "프로젝트", "대시보드", "저장소 관리"])(
    "받침 없는 `%s`에는 `로`",
    (word) => {
      expect(directionParticle(word)).toBe("로");
    },
  );

  it.each(["회의실", "메일", "프로필"])("받침 `ㄹ`도 `로`다 — `%s`", (word) => {
    expect(directionParticle(word)).toBe("로");
  });

  it.each(["기업 가입 승인", "검색", "인수인계 목록"])("그 밖의 받침에는 `으로` — `%s`", (word) => {
    expect(directionParticle(word)).toBe("으로");
  });

  it("괄호가 문구에 남지 않는다 — 이 조사가 없어서 `(으)로`가 박혀 있었다", () => {
    expect(`회의 상세${directionParticle("회의 상세")} 돌아가기`).toBe("회의 상세로 돌아가기");
    expect(`기업 가입 승인${directionParticle("기업 가입 승인")} 돌아가기`).toBe(
      "기업 가입 승인으로 돌아가기",
    );
  });
});
