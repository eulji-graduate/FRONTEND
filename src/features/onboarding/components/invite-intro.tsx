import type { Invite } from "../types";
import { ONBOARDING_STEP } from "../types";
import { InvitePreview } from "./invite-preview";
import type { SelectOption } from "./option-select";
import { StepHeading } from "./step-heading";
import { StepHintList } from "./step-hint-list";
import { StepNote, StepNoteList } from "./step-note-list";

const BENEFITS = [
  "계정과 첫 비밀번호를 메일로 보내드립니다",
  "팀·역할·직급을 미리 지정해서 보낼 수 있습니다",
  "나중에 기업 설정에서 추가로 초대할 수 있습니다",
] as const;

interface InviteIntroProps {
  /** 보낸 줄 + 이번에 보낼 줄 */
  invites: Invite[];
  departments: SelectOption[];
  rolesOf: (departmentId: string) => SelectOption[];
  positions: SelectOption[];
}

/** 온보딩 3단계 좌측 — 설명과 축약 미리보기. */
export function InviteIntro({ invites, departments, rolesOf, positions }: InviteIntroProps) {
  return (
    <section className="flex w-full flex-col gap-[17.5px] lg:h-full lg:w-[320px] lg:shrink-0">
      <StepHeading step={ONBOARDING_STEP.INVITE} title="사원을 초대하세요">
        보내면 계정이 바로 만들어지고, 아이디와 첫 비밀번호가 메일로 갑니다. 여기서 정한
        팀·역할·직급으로 배정됩니다.
      </StepHeading>

      <StepHintList items={BENEFITS} />

      <StepNoteList>
        <StepNote>
          {/*
            ⚠️ 링크를 보내 본인이 가입하는 방식이 **아니다.** 보내는 순간 계정이 만들어지고
               아이디·첫 비밀번호가 메일로 나간다.
               ⚠️ 인원이 늘어도 금액은 그대로다 — 좌석 과금이 아니다(2026-08-04).
               ⚠️ 받은 사람은 **그 비밀번호를 그대로 쓴다.** 강제 변경 화면은 두지 않는다(팀 결정).
          */}
          보내면 <span className="text-muted-foreground">계정이 바로 만들어집니다.</span> 아이디와
          첫 비밀번호가 메일로 갑니다.
        </StepNote>
        {/*
          ⚠️ **팀장을 어떻게 지정하는지 여기서 말한다.** 전에는 `리더`를 고를 자리가 없어서
             직급을 먼저 고르는 우회로밖에 없었다(2026-08-10 수정) — 이제 역할 목록에
             `리더`가 있으므로, 그걸 모르면 여전히 못 찾는다.
        */}
        <StepNote>
          <span className="text-muted-foreground">역할은 팀을 고른 뒤</span> 정합니다. 팀장은 역할에
          &lsquo;리더&rsquo;를, 세부 역할이 없으면 &lsquo;없음&rsquo;을 고르면 됩니다.
        </StepNote>
        <StepNote>
          직급은 <span className="text-muted-foreground">2단계에서 만든 것</span>만 고를 수
          있습니다. 더 필요하면 이전 단계에서 추가해 주세요.
        </StepNote>
        {/*
          ⚠️ 이 자리에서 Admin을 켜야 회사에 관리자가 **처음부터** 있다. 계정 발급은 대표
             혼자서도 되지만(2026-08-06), 회의실 관리는 Admin 전용이라 안 켜고 넘어가면
             그 일을 할 사람이 없어 대표 혼자 막힌다.
        */}
        <StepNote>
          <span className="text-muted-foreground">Admin은 권한 위에 얹는 겸직</span>이라 직급과 따로
          켭니다. Leader이면서 Admin일 수 있고, 대표는 겸할 수 없습니다.
        </StepNote>
        <StepNote>
          <span className="text-muted-foreground">보낸 초대장은 되돌릴 수 없습니다.</span> 주소를 한
          번 더 확인하고 [완료]를 눌러 주세요.
        </StepNote>
      </StepNoteList>

      <InvitePreview
        invites={invites}
        departments={departments}
        rolesOf={rolesOf}
        positions={positions}
      />
    </section>
  );
}
