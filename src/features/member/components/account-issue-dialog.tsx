"use client";

import { ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FieldError } from "@/components/common/field-error";
import { ResultDialog } from "@/components/common/result-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUTHORITY,
  type Authority,
  AUTHORITY_LABEL,
  POSITION_AUTHORITIES,
} from "@/constants/authority";
import { ROLE_NONE_LABEL } from "@/constants/member";
import { cn } from "@/lib/utils";

import { validateAccount } from "../account-validate";
import { issueAccountAction } from "../manage-actions";
import type { AccountDraft, AccountErrors } from "../manage-types";
import type { TeamRoleOption } from "../team-roles";

/**
 * 계정 발급 — **공용 확인 창**(`ConfirmDialog`)에 폼을 담아 연다.
 *
 * ⚠️ 전용 라우트를 두지 않는다. 목록에서 하는 일이라 목록을 떠나지 않는다 — 한 번 쓰고 마는
 *    폼에 주소를 만들면 뒤로 가기가 어색해진다(공지 작성과 같은 판단).
 * ⚠️ 모달 껍데기를 직접 그리지 않는다. `ConfirmDialog`의 `children`이 "제목과 버튼 사이"
 *    자리라 폼이 그대로 들어간다 — 창마다 다르게 생기면 같은 서비스로 안 읽힌다.
 * ⚠️ **확인 창을 두 번 겹치지 않는다.** 이 창 자체가 확인이다 — 설명이 "메일이 바로 나가고
 *    되돌릴 수 없다"고 말하고 실행 버튼이 [계정 발급]이다. 똑같이 생긴 창을 하나 더 띄우면
 *    무엇을 두 번 확인하는지 알 수 없다.
 * ⚠️ 비밀번호를 받지 않는다. 아이디와 첫 비밀번호는 **메일로 나간다** — 화면에서 정하면
 *    그 값을 누군가 알고 있게 된다(§온보딩 3단계와 같은 방식).
 * ⚠️ 끝나면 **결과 창**으로 알린다. 여기서 알아야 할 건 "어디로 메일이 갔는지"라 토스트처럼
 *    사라지면 안 된다 — 다음 걸음(그 사람 보기)도 같이 준다.
 */
export function AccountIssueDialog({
  teamNames,
  positionNames,
  teamRoles,
}: {
  teamNames: string[];
  /**
   * 회사가 만든 직급 이름들(온보딩 2단계·기업 설정).
   * ⚠️ 손으로 적게 두면 회사에 없는 직급이 생긴다 — 직급에는 권한이 매여 있다.
   */
  positionNames: string[];
  /** 팀 이름 → 그 팀의 역할들. 역할은 팀에 매여 있다(`team-roles`) */
  teamRoles: Record<string, TeamRoleOption[]>;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<AccountDraft>(() =>
    emptyDraft(teamNames, positionNames, teamRoles),
  );
  const [errors, setErrors] = useState<AccountErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ id: number; name: string; email: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  /** 고른 팀의 역할들 — 팀이 바뀌면 같이 바뀐다 */
  const roleOptions = teamRoles[draft.teamName] ?? [];

  const set = <K extends keyof AccountDraft>(key: K, value: AccountDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    // 고치는 순간 그 칸의 오류는 감춘다 — 다 고칠 때까지 빨간 글씨를 남길 이유가 없다
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    /*
      ⚠️ 밑단 문구도 같이 지운다. 안 지우면 옛 실패 사유가 남아, 이번엔 다른 이유로 막혔는데
         **서로 다른 두 사유가 동시에** 보인다.
    */
    setMessage(null);
  };

  const reset = () => {
    setDraft(emptyDraft(teamNames, positionNames, teamRoles));
    setErrors({});
    setMessage(null);
  };

  const handleIssue = () => {
    /*
      ⚠️ 보내기 전에 **화면에서 먼저 본다.** 서버 왕복 없이 잡히는 건 여기서 잡아야
         창이 닫혔다 열렸다 하지 않는다. 서버는 같은 함수로 다시 본다(§검증은 한 벌).
    */
    const found = validateAccount(draft);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length > 0) return;

    startTransition(async () => {
      /*
        ⚠️ **거절도 받아 낸다.** 액션은 BE 실패를 값으로 돌려주지만, 브라우저에서 Next 서버까지
           가는 길이 끊기면(네트워크·서버 재시작·배포) `await` 자체가 던진다 — 안 잡으면 화면이
           통째로 `error.tsx`로 넘어가거나 잠긴 채로 남는다(2026-08-12 전 화면 정리).
      */
      let result;
      try {
        result = await issueAccountAction(draft);
      } catch {
        setMessage("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      if (result.message) {
        setMessage(result.message);
        return;
      }
      if (Object.keys(result.errors).length > 0) {
        setErrors(result.errors);
        return;
      }

      setIsOpen(false);
      setIssued(result.issued ?? null);
      /*
        ⚠️ **계정은 났는데 겸직만 못 붙은 경우를 성공으로 뭉개지 않는다**(§정직성).
           발급과 겸직은 BE에서 두 호출이라 가운데서 끊길 수 있다 — 그때 "발급했습니다"만
           띄우면 관리자는 겸직이 붙은 줄 알고 넘어간다. 다음에 할 일까지 말해 준다.
      */
      if (result.adminGrantFailed) {
        toast.warning("계정은 발급됐지만 관리자 겸직은 붙지 않았습니다 — 사원 상세에서 켜 주세요");
      } else {
        toast.success("계정을 발급했습니다");
      }
      // 목록은 서버 컴포넌트라 다시 받아온다(`revalidatePath`가 캐시를 이미 비웠다)
      router.refresh();
    });
  };

  /** 라벨 · 입력 · 오류 한 덩이 — 오류 자리는 비워 두지 않는다(떠도 창이 안 출렁인다) */
  const field = (
    key: keyof AccountDraft,
    label: string,
    control: React.ReactNode,
    /*
      ⚠️ 가리킬 입력이 없으면 **라벨을 붙이지 않는다.** 없는 id를 가리키는 `htmlFor`는
         스크린리더에서 이름 없는 라벨이 되어 오히려 방해가 된다(§a11y).
    */
    hasControl = true,
    /** 라벨 옆 `?` — 설명이 길어 창 문구로 두면 창 크기가 흔들리는 칸에만 붙인다 */
    help?: React.ReactNode,
  ) => (
    <div className="flex flex-col gap-1.5 text-left">
      {/*
        ⚠️ **라벨 줄 높이를 고정한다.** 라벨 글자는 14px인데 옆에 붙는 `?`는 16px이라,
           그 칸만 라벨 줄이 2px 높아지고 **컨트롤이 그만큼 내려앉는다** — 옆 칸과
           위아래가 어긋나 보인다. 높이를 잡아 두면 무엇이 붙든 컨트롤이 같은 자리에 선다.
      */}
      <span className="flex h-4 items-center gap-1">
        {label &&
          (hasControl ? (
            <Label htmlFor={`account-${key}`}>{label}</Label>
          ) : (
            <p className="text-[13px] leading-none font-medium">{label}</p>
          ))}
        {help}
      </span>
      {control}
      <FieldError id={`account-${key}-error`} message={errors[key]} reserveSpace />
    </div>
  );

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ink"
        className="gap-1.5"
        onClick={() => setIsOpen(true)}
      >
        <UserPlus className="size-3.5" aria-hidden />
        계정 발급
      </Button>

      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={(next) => {
          // ⚠️ 보내는 중엔 Esc·바깥 클릭으로 안 닫는다 — 요청은 계속 가는데 화면만 사라진다
          if (isPending) return;
          setIsOpen(next);
          if (!next) reset();
        }}
        title="계정을 발급할까요?"
        description={
          <>
            {/* ⚠️ 문장마다 줄을 나눈다 — 한 덩어리로 두면 되돌릴 수 없다는 말을 지나친다 */}
            <span className="text-foreground font-medium">아이디와 비밀번호가 메일로</span> 바로
            나갑니다.
            <br />
            보낸 메일은 되돌릴 수 없습니다.
            {/*
              ⚠️ 겸직 설명을 **여기 넣지 않는다.** 켤 때만 한 줄이 늘어나 창이 세로로 커지고,
                 누르는 순간 아래 버튼이 움직인다 — 설명은 라벨 옆 `?`가 맡는다.
            */}
          </>
        }
        confirmLabel="계정 발급"
        isPending={isPending}
        pendingLabel="발급 중…"
        onConfirm={handleIssue}
      >
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {field(
            "name",
            "이름",
            <Input
              id="account-name"
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="홍길동"
              aria-invalid={Boolean(errors.name)}
              aria-describedby="account-name-error"
            />,
          )}

          {field(
            "email",
            "이메일",
            <Input
              id="account-email"
              type="email"
              value={draft.email}
              onChange={(event) => set("email", event.target.value)}
              placeholder="name@company.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby="account-email-error"
            />,
          )}

          {field(
            "teamName",
            "소속 팀",
            teamNames.length > 0 ? (
              <Select
                items={Object.fromEntries(teamNames.map((name) => [name, name]))}
                value={draft.teamName}
                /*
                  ⚠️ **팀이 바뀌면 역할도 그 팀의 기본값(`없음`)으로 되돌린다.** 역할은
                     팀에 매여 있어서, 안 바꾸면 개발팀의 `프론트엔드` id를 단 채로 마케팅팀
                     으로 넘어간다(온보딩과 같은 규칙).
                */
                onValueChange={(value) => {
                  const teamName = value ?? "";
                  setDraft((prev) => ({
                    ...prev,
                    teamName,
                    roleId: defaultRoleId(teamRoles[teamName] ?? []),
                  }));
                }}
              >
                <SelectTrigger
                  id="account-teamName"
                  className="w-full"
                  aria-invalid={Boolean(errors.teamName)}
                  aria-describedby="account-teamName-error"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {teamNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              /* ⚠️ 팀이 하나도 없으면 고를 게 없다 — 빈 셀렉트 대신 갈 곳을 말한다 */
              <p className="text-muted-foreground py-2 text-[13px] leading-5 break-keep">
                기업 설정에서 팀을 먼저 만들어 주세요
              </p>
            ),
            teamNames.length > 0,
          )}

          {/*
            ⚠️ **역할 칸이다.** 온보딩 3단계 초대는 줄마다 이 칸을 갖는데 발급 창에만 없어서,
               온보딩 뒤에 들어온 사람은 계속 `없음`이었다 — 그리고 뒤에 고칠 화면도 없었다.
            ⚠️ 역할은 **고른 팀의 것만** 나온다(`teamRoles`). 팀을 바꾸면 그 팀의 `없음`으로
               되돌아간다.
            ⚠️ **`없음`도 실제 역할 행이다.** BE가 모든 팀의 역할 목록에 그 행을 진짜 id로
               끼워 주므로(2026-08-14 BE PR #489) 화면이 따로 빈 값을 만들지 않는다 — 항상
               고른 상태로 시작한다(`defaultRoleId`).
          */}
          {field(
            "roleId",
            "역할",
            <Select
              items={Object.fromEntries(roleOptions.map((role) => [role.id, role.name]))}
              value={draft.roleId ?? ""}
              onValueChange={(value) => set("roleId", value || null)}
              disabled={roleOptions.length === 0}
            >
              <SelectTrigger
                id="account-roleId"
                className="w-full"
                aria-invalid={Boolean(errors.roleId)}
                aria-describedby="account-roleId-error"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {roleOptions.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>,
          )}

          {/*
            ⚠️ **직급은 고르는 값이다.** 손으로 적게 두니 회사에 없는 직급(`왕`)도 그대로
               발급됐다 — 직급은 온보딩 2단계·기업 설정이 만든 **회사 목록**이고 거기에
               권한이 매여 있다. 목록 밖 값은 어느 권한에도 안 걸린다.
            ⚠️ 소속 팀과 같은 문법이다 — 고를 게 없으면 빈 셀렉트 대신 **갈 곳을 말한다.**
          */}
          {field(
            "position",
            "직급",
            positionNames.length > 0 ? (
              <Select
                items={Object.fromEntries(positionNames.map((name) => [name, name]))}
                value={draft.position}
                onValueChange={(value) => set("position", value ?? "")}
              >
                <SelectTrigger
                  id="account-position"
                  className="w-full"
                  aria-invalid={Boolean(errors.position)}
                  aria-describedby="account-position-error"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {positionNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-muted-foreground py-2 text-[13px] leading-5 break-keep">
                기업 설정에서 직급을 먼저 만들어 주세요
              </p>
            ),
            positionNames.length > 0,
          )}

          {/*
            ⚠️ **겸직 방패를 권한 칸 안에** 둔다. 역할 칸이 늘면서 칸이 여섯이 됐는데, 방패를
               따로 한 칸으로 두니 마지막 줄에 라벨도 없이 혼자 남았다 — 겸직은 권한에 얹는
               표식이라 그 칸 안에 붙어 있는 게 뜻에도 맞는다.
            ⚠️ 권한 셀렉트에 **넣지는 않는다.** 목록 안에 두면 "Member 대신 Admin"으로
               읽힌다(§권한: 축이 2개다).
          */}
          {field(
            "authority",
            "권한",
            <div className="flex items-center gap-2">
              <Select
                items={AUTHORITY_LABEL}
                value={draft.authority}
                onValueChange={(value) => set("authority", value as Authority)}
              >
                <SelectTrigger
                  id="account-authority"
                  className="min-w-0 flex-1"
                  aria-invalid={Boolean(errors.authority)}
                  aria-describedby="account-authority-error"
                >
                  <SelectValue />
                </SelectTrigger>
                {/* ⚠️ Owner는 회사에 하나라 발급 대상이 아니다(WORKFLOW §11) */}
                <SelectContent alignItemWithTrigger={false}>
                  {POSITION_AUTHORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {AUTHORITY_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/*
                ⚠️ **글자를 붙이지 않는다.** `부여함`/`부여 안 함`은 폭이 달라 누를 때마다
                   버튼이 늘었다 줄었다 했다 — 켜짐은 **채움**이 말한다(온보딩 `InviteAdminToggle`).
                ⚠️ 뜻은 옆의 `?`가 말하고, 스크린 리더는 버튼의 `aria-label`로 읽는다(§a11y).
              */}
              <button
                type="button"
                id="account-isAdmin"
                aria-pressed={draft.isAdmin}
                aria-label="관리자 겸직 부여"
                onClick={() => set("isAdmin", !draft.isAdmin)}
                className={cn(
                  "focus-visible:ring-ring flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:ring-3 focus-visible:outline-hidden",
                  draft.isAdmin
                    ? "bg-foreground text-background border-foreground"
                    : "border-input text-muted-foreground/60 hover:border-foreground/40 hover:text-foreground",
                )}
              >
                <ShieldCheck className="size-4" aria-hidden />
              </button>

              <Popover>
                <PopoverTrigger
                  type="button"
                  aria-label="관리자 겸직이 무엇인지 보기"
                  className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 focus-visible:ring-ring flex size-4 shrink-0 items-center justify-center rounded-full border text-[11px] leading-none transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
                >
                  ?
                </PopoverTrigger>
                {/*
                  ⚠️ **오른쪽으로 편다.** 아래로 펴면 바로 밑의 [계정 발급] 버튼을 덮어서,
                     설명을 읽는 동안 정작 눌러야 할 것이 가려진다.
                */}
                <PopoverContent side="right" align="center" className="w-56 text-center">
                  <p className="text-[13px] leading-5 font-medium break-keep">
                    관리자 화면에 들어갈 수 있습니다.
                  </p>
                  <p className="text-muted-foreground text-[12px] leading-[18px] break-keep">
                    사원·회의실 관리, 구독·저장소 화면입니다.
                    <br />
                    권한을 대체하지 않고 위에 덧붙습니다.
                    <br />
                    발급한 뒤에도 사원 상세에서 바꿀 수 있습니다.
                  </p>
                </PopoverContent>
              </Popover>
            </div>,
          )}

          {/* 칸과 무관한 실패는 칸 밑이 아니라 여기 — 그 칸이 틀렸다는 뜻이 아니다 */}
          <FieldError message={message ?? undefined} className="sm:col-span-2" />
        </div>
      </ConfirmDialog>

      <ResultDialog
        isOpen={issued !== null}
        onOpenChange={() => {
          setIssued(null);
          // ⚠️ 여기서 비운다 — 확인 창이 닫히는 동안 비우면 글자가 바뀌는 게 보인다
          reset();
        }}
        title="계정을 발급했습니다"
        /*
          ⚠️ **메일 주소를 한 줄에 세운다.** 문장 안에 섞으면 주소가 줄 끝에서 잘려
             `hyun030514@g.eulji.` / `ac.kr으로 아이디와…`처럼 읽힌다 — 어디로 갔는지가
             이 창의 요점이다.
          ⚠️ **비밀번호를 바꾸게 된다고 적지 않는다.** 그런 화면이 아직 없다 —
             `받는 사람이 처음 로그인할 때 비밀번호를 바꿉니다`라고 적어 뒀는데,
             레포 어디에도 비밀번호 변경 경로가 없다. 안 되는 걸 되는 것처럼 쓰면
             받은 사람이 첫 비밀번호를 그대로 쓰게 된다(§정직성).
        */
        description={
          <>
            <span className="text-foreground font-medium">{issued?.email}</span>
            <br />위 주소로 아이디와 비밀번호를 보냈습니다.
          </>
        }
        action={
          <Link
            href={issued ? `/manage/members/${issued.id}` : "/manage/members"}
            className={cn(buttonVariants({ variant: "ink" }), "w-full")}
          >
            {issued?.name} 님 보기
          </Link>
        }
      />
    </>
  );
}

/** 팀이 하나뿐이면 고를 것도 없으니 첫 팀을 미리 넣어 둔다 */
function emptyDraft(
  teamNames: string[],
  positionNames: string[],
  teamRoles: Record<string, TeamRoleOption[]>,
): AccountDraft {
  const teamName = teamNames[0] ?? "";
  return {
    name: "",
    email: "",
    teamName,
    position: positionNames[0] ?? "",
    authority: AUTHORITY.MEMBER,
    // ⚠️ 겸직은 **기본 꺼짐**이다. 권한을 주는 값이라 미리 켜 두면 확인 없이 나간다
    isAdmin: false,
    roleId: defaultRoleId(teamRoles[teamName] ?? []),
  };
}

/**
 * 그 팀의 `없음` 역할 id — 기본 선택값으로 쓴다.
 * ⚠️ BE가 모든 팀의 역할 목록에 이 행을 실제 id로 끼워 준다(2026-08-14 BE PR #489) —
 *    화면이 만들어 넣는 값이 아니라 받은 목록에서 찾을 뿐이다.
 */
function defaultRoleId(roleOptions: TeamRoleOption[]): string | null {
  return roleOptions.find((role) => role.name === ROLE_NONE_LABEL)?.id ?? null;
}
