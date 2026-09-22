import { render, screen } from "@testing-library/react";

import { AUTHORITY, AUTHORITY_LABEL } from "@/constants/authority";

import { MY_PROFILE_MOCK } from "../mock/profile";
import type { MyProfile } from "../types";
import { ProfileHeader } from "./profile-header";

describe("ProfileHeader", () => {
  it("이름·이메일·역할 라벨을 보여준다", () => {
    render(<ProfileHeader profile={MY_PROFILE_MOCK} />);

    expect(screen.getByText(MY_PROFILE_MOCK.name)).toBeInTheDocument();
    expect(screen.getByText(MY_PROFILE_MOCK.email)).toBeInTheDocument();
    expect(screen.getByText(AUTHORITY_LABEL[MY_PROFILE_MOCK.role])).toBeInTheDocument();
  });

  it("OWNER는 회사명 · 대표로 소속을 보여준다", () => {
    render(<ProfileHeader profile={MY_PROFILE_MOCK} />);

    expect(screen.getByText(`${MY_PROFILE_MOCK.companyName} · 대표`)).toBeInTheDocument();
  });

  it("LEADER는 회사명 · 팀 · 직책으로 소속을 보여준다(팀 안 역할 라벨은 안 붙는다)", () => {
    const leader: MyProfile = {
      ...MY_PROFILE_MOCK,
      role: AUTHORITY.LEADER,
      roleLabel: "리더",
      position: "팀장",
    };
    render(<ProfileHeader profile={leader} />);

    expect(
      screen.getByText(`${leader.companyName} · ${leader.teamName} · ${leader.position}`),
    ).toBeInTheDocument();
  });

  it("MEMBER는 팀 안 역할이 있으면 회사명 · 팀 · 역할 · 직책으로 보여준다", () => {
    const member: MyProfile = {
      ...MY_PROFILE_MOCK,
      role: AUTHORITY.MEMBER,
      roleLabel: "프론트엔드",
      position: "사원",
    };
    render(<ProfileHeader profile={member} />);

    expect(
      screen.getByText(
        `${member.companyName} · ${member.teamName} · ${member.roleLabel} · ${member.position}`,
      ),
    ).toBeInTheDocument();
  });

  it("MEMBER는 팀 안 역할이 없으면 회사명 · 팀 · 직책으로 보여준다", () => {
    const member: MyProfile = {
      ...MY_PROFILE_MOCK,
      role: AUTHORITY.MEMBER,
      roleLabel: null,
      position: "사원",
    };
    render(<ProfileHeader profile={member} />);

    expect(
      screen.getByText(`${member.companyName} · ${member.teamName} · ${member.position}`),
    ).toBeInTheDocument();
  });
});
