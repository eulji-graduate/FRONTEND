import { type DepartmentNode, MAX_ORG_NAME_LENGTH, ONBOARDING_STEP } from "../types";
import { DepartmentPreview } from "./department-preview";
import { StepHeading } from "./step-heading";
import { StepHintList } from "./step-hint-list";
import { StepNote, StepNoteList } from "./step-note-list";

const BENEFITS = [
  "회의를 만들 때 팀 전체를 한 번에 초대",
  "인수인계 대상자를 팀 기준으로 추리기",
  "팀별 활동 통계 자동 집계",
] as const;

/** 온보딩 1단계 좌측 — 설명과 축약 미리보기. */
interface DepartmentIntroProps {
  departments: DepartmentNode[];
}

export function DepartmentIntro({ departments }: DepartmentIntroProps) {
  return (
    <section className="flex w-full flex-col gap-[17.5px] lg:h-full lg:w-[320px] lg:shrink-0">
      <StepHeading step={ONBOARDING_STEP.DEPARTMENT} title="팀 체계를 만들어 주세요">
        회의 참석자와 알림 대상, 인수인계 범위를 팀 단위로 관리합니다. 지금 만들어 두면 사원이
        합류할 때 바로 배정할 수 있습니다.
      </StepHeading>

      <StepHintList items={BENEFITS} />

      <StepNoteList>
        <StepNote>
          <span className="text-muted-foreground">이름을 더블클릭</span>하면 바로 고칠 수 있습니다.
          나중에 기업 설정에서도 바꿀 수 있습니다.
        </StepNote>
        {/*
          ⚠️ 글자 수 제한은 **여기 적어 둔다.** 3단계 초대 목록의 좁은 칸에서 역산한 값이라
             모르고 길게 적으면 거기서 잘린다 — 조용히 막지 않는다(§정직성).
        */}
        <StepNote>
          이름은 <span className="text-muted-foreground">{MAX_ORG_NAME_LENGTH}자까지</span>입니다.
          3단계 초대 목록의 좁은 칸에서 이 이름을 골라야 해서입니다.
        </StepNote>
        <StepNote>
          <span className="text-muted-foreground">역할</span>은 팀 안에서 맡는 일입니다. 개발팀 안의
          프론트엔드·백엔드가 그렇습니다.
        </StepNote>
        <StepNote>
          <span className="text-muted-foreground">손잡이를 끌면</span> 순서를 바꾸거나 다른 팀으로
          옮길 수 있습니다.
        </StepNote>
        {/*
          ⚠️ **아직 안 한 일을 과거형으로 말하지 않는다.** 여기는 1단계라 직급 권한을 정하는
             2단계를 보기 전이다 — `Leader 권한을 준 직급`이라고 적으면 이미 무언가 해 둔
             것처럼 읽히고, 어디서 준다는 건지도 알 수 없다. **다음 단계**라고 짚어 준다.
        */}
        <StepNote>
          역할은 비워 둬도 됩니다.{" "}
          <span className="text-muted-foreground">다음 단계에서 Leader 권한을 줄 직급</span>은
          여기서 만든 역할과 무관하게{" "}
          <span className="text-muted-foreground">&lsquo;리더&rsquo;</span>가 됩니다.
        </StepNote>
      </StepNoteList>

      <DepartmentPreview departments={departments} />
    </section>
  );
}
