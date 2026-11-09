jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("../actions", () => ({
  confirmProjectAttachmentAction: jest.fn(),
  issueProjectAttachmentUploadUrlAction: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProjectForm } from "./project-form";

const HINT = "필수 항목(*)을 모두 채우면 만들 수 있습니다.";

function renderForm() {
  render(
    <ProjectForm
      action={jest.fn(async () => ({ errors: {} }))}
      teamOptions={["개발팀", "마케팅팀"]}
      cancelHref="/app/projects"
    />,
  );
}

describe("ProjectForm — 생성 버튼이 잠긴 이유", () => {
  it("필수 항목이 비면 버튼을 잠그고 그 이유를 버튼 옆에 적는다", () => {
    renderForm();

    const submit = screen.getByRole("button", { name: "프로젝트 생성" });
    expect(submit).toBeDisabled();
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(submit).toHaveAccessibleDescription(HINT);
  });

  it("일부만 채워도 남은 필수 항목이 있으면 안내가 남는다", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/프로젝트명/), "굿즈 앱");
    await user.type(screen.getByLabelText(/세부 설명/), "설명");

    expect(screen.getByRole("button", { name: "프로젝트 생성" })).toBeDisabled();
    expect(screen.getByText(HINT)).toBeInTheDocument();
  });
});
