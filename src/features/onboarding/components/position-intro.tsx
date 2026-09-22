import { AUTHORITY_LABEL, AUTHORITY_SCOPE_LABEL, POSITION_AUTHORITIES } from "@/constants/domain";

import { MAX_ORG_NAME_LENGTH, ONBOARDING_STEP, type Position } from "../types";
import { PositionPreview } from "./position-preview";
import { StepHeading } from "./step-heading";
import { StepHintList } from "./step-hint-list";
import { StepNote, StepNoteList } from "./step-note-list";

/*
  ⚠️ **여기서 고를 수 있는 것만** 적는다(`POSITION_AUTHORITIES`). 예전엔 Owner까지 보여 줬는데
     정작 드롭다운에는 없어서, 읽은 사람이 목록에서 Owner를 찾다가 못 찾는다.
     Owner는 아래 안내 상자에서 "여기서 정하지 않는다"고 따로 말한다.
*/
const ROLE_HINTS = POSITION_AUTHORITIES.map(
  (role) => `${AUTHORITY_LABEL[role]}: ${AUTHORITY_SCOPE_LABEL[role]}`,
);

/** 온보딩 2단계 좌측 — 설명과 축약 미리보기. */
interface PositionIntroProps {
  positions: Position[];
}

export function PositionIntro({ positions }: PositionIntroProps) {
  return (
    <section className="flex w-full flex-col gap-[17.5px] lg:h-full lg:w-[320px] lg:shrink-0">
      <StepHeading step={ONBOARDING_STEP.POSITION} title="직급 체계를 설정해 주세요">
        회사에서 쓰는 직급을 적고, 그 직급이 갖는 권한을 고릅니다. 나중에 사원마다 따로 바꿀 수
        있습니다.
      </StepHeading>

      <StepHintList items={ROLE_HINTS} />

      <StepNoteList>
        <StepNote>
          <span className="text-muted-foreground">직급명</span>은 회사에서 쓰는 말 그대로{" "}
          {MAX_ORG_NAME_LENGTH}자까지 적습니다.
        </StepNote>
        <StepNote>
          <span className="text-muted-foreground">이름과 권한은 별개</span>입니다.
          &lsquo;과장&rsquo;에 Leader를 줘도 됩니다.
        </StepNote>
        <StepNote>
          <span className="text-muted-foreground">Owner</span>는 목록에 없습니다. 기업 등록이
          승인되면 시스템이 계정을 만들어 대표 메일로 보내 드립니다.
        </StepNote>
        {/*
          ⚠️ 전에는 "두 권한이 필요하면 계정을 따로 쓴다"고 안내했다. **더 이상 아니다** —
             Admin은 따로 떨어진 권한이 아니라 겸직이라 한 계정이 Leader이면서 Admin일 수 있다.
             낡은 안내를 남겨 두면 대표가 계정을 두 개 만들어 놓고 시작한다.
        */}
        <StepNote>
          <span className="text-muted-foreground">Admin</span>도 직급이 아니라 사람에게 붙는
          권한입니다. 3단계에서 초대할 때 켜면 되고, 한 사람이 Leader이면서 Admin일 수 있습니다.
        </StepNote>
      </StepNoteList>

      <PositionPreview positions={positions} />
    </section>
  );
}
