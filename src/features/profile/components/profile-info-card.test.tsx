import { render, screen } from "@testing-library/react";

import { PROFILE_INFO_ROW_LABEL } from "@/constants/profile";
import { formatYearMonthDay } from "@/lib/date";

import { MY_PROFILE_MOCK } from "../mock/profile";
import { ProfileInfoCard } from "./profile-info-card";

describe("ProfileInfoCard", () => {
  it("머리를 그대로 이고, 각 행의 라벨·값을 정해진 순서대로 보여준다", () => {
    render(<ProfileInfoCard profile={MY_PROFILE_MOCK} header={<p>아바타 줄</p>} />);

    // 카드 제목 자리는 **머리로 넘어갔다**(2026-08-11) — 이름·아바타가 그 몫을 한다
    expect(screen.getByText("아바타 줄")).toBeInTheDocument();

    const expectedRows: [string, string][] = [
      [PROFILE_INFO_ROW_LABEL.NAME, MY_PROFILE_MOCK.name],
      [PROFILE_INFO_ROW_LABEL.EMAIL, MY_PROFILE_MOCK.email],
      [PROFILE_INFO_ROW_LABEL.TEAM, MY_PROFILE_MOCK.teamName],
      [PROFILE_INFO_ROW_LABEL.POSITION, MY_PROFILE_MOCK.position],
      /* ⚠️ 입사일은 **우리 표기로 그려진다**(`2021년 3월 2일`) — 서버가 준 ISO 그대로가 아니다 */
      [PROFILE_INFO_ROW_LABEL.JOINED_AT, formatYearMonthDay(MY_PROFILE_MOCK.joinedAt)],
    ];

    expectedRows.forEach(([label, value]) => {
      const row = screen.getByText(label).closest("div");
      expect(row).toHaveTextContent(value);
    });

    /*
      ⚠️ 순서는 `dt`로 본다 — 값 목록이 `<dl>`이라 라벨은 `<p>`가 아니다(§a11y: 라벨과 값을
         짝지어 읽힌다). `p`로 찾으면 하나도 못 찾은 채로 단언이 조용히 통과한다.
    */
    const labelNodes = [...document.body.querySelectorAll("dt")];
    const indices = expectedRows.map(([label]) =>
      labelNodes.findIndex((node) => node.textContent === label),
    );
    expect(indices).not.toContain(-1);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });
});
