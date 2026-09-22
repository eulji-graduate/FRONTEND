"use client";

import { ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  ADMIN_ELIGIBLE_AUTHORITIES,
  AUTHORITY,
  type Authority,
  AUTHORITY_LABEL,
  POSITION_AUTHORITIES,
} from "@/constants/authority";

import { canChangeGradeOf } from "../grade";
import { changeMemberGradeAction } from "../manage-actions";
import type { ManagedMember } from "../manage-types";
import type { TeamRoleOption } from "../team-roles";

/**
 * 직급 및 권한 변경 — **Owner·Admin 겸직자 둘 다** 쓴다(WORKFLOW §11).
 *
 * ⚠️ 권한 선택지는 **Leader·Member뿐**이다. Owner는 회사에 하나라 여기서 만들지 않고,
 *    Admin은 권한이 아니라 **위에 덧붙는 겸직**이라 별도 칸이다(§권한: 축이 2개다).
 * ⚠️ Owner인 사람에게는 Admin 칸을 안 보인다 — 이미 다 되는 사람에게 겸직을 붙이면
 *    "Admin을 빼면 권한이 줄어든다"는 오해가 생긴다(`ADMIN_ELIGIBLE_AUTHORITIES`).
 * ⚠️ 안 고쳤으면 [저장]을 안 연다 — 눌러도 아무 뜻이 없는 저장을 만들지 않는다.
 */
export function MemberGradeCard({
  member,
  canEdit,
  positionNames,
  roleOptions,
  currentRoleId,
}: {
  member: ManagedMember;
  canEdit: boolean;
  /**
   * 회사가 만든 직급 이름들(온보딩 2단계·기업 설정).
   * ⚠️ 손으로 적게 두면 회사에 없는 직급이 생긴다 — 직급에는 권한이 매여 있다.
   */
  positionNames: string[];
  /** 이 사람 팀의 역할들 — 역할은 팀에 매여 있다(`team-roles`) */
  roleOptions: TeamRoleOption[];
  /**
   * 지금 이 사람에게 붙은 역할 id(`ManagedMemberDetail.roleId`).
   * ⚠️ **`member.roleLabel`(이름)로 되찾지 않는다.** 역할 이름은 회사 안에서도 중복될 수
   *    있어 이름으로 지금 값을 되찾으면 같은 이름의 다른 역할이 골라질 수 있다.
   */
  currentRoleId: string | null;
}) {
  const [position, setPosition] = useState(member.position);
  const [roleId, setRoleId] = useState<string | null>(currentRoleId);
  const [authority, setAuthority] = useState<Authority>(member.authority);
  const [isAdmin, setIsAdmin] = useState(member.isAdmin);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  /*
    ⚠️ **권한을 올릴 때만** 한 번 더 묻는다. 직급 이름을 고치는 건 되돌리기 쉬운 일이지만,
       Leader 승격과 Admin 부여는 **그 사람이 볼 수 있는 화면이 늘어나는 일**이라 실수로
       누르면 바로 회사 정보가 열린다(§토스트: 무게 있는 변경은 Dialog).
    ⚠️ 내리는 건 안 묻는다 — 권한이 줄어드는 쪽은 잘못 눌러도 다시 올리면 그만이다.
  */
  const [isConfirming, setIsConfirming] = useState(false);

  /*
    ⚠️ 판정을 `lib/permission`에서 가져오지 않는다 — 그 모듈은 `server-only`라 클라이언트
       컴포넌트가 import하면 빌드가 깨진다. 여기서 보는 건 **상수 하나**뿐이고, 진짜 판정은
       Server Action이 다시 한다(§권한: 화면 숨김은 보안이 아니다).
    ⚠️ Owner에게는 Admin 칸을 안 보인다 — 이미 다 되는 사람에게 겸직을 붙이면
       "Admin을 빼면 권한이 줄어든다"는 오해가 생긴다(`ADMIN_ELIGIBLE_AUTHORITIES`).
  */
  const eligible: readonly string[] = ADMIN_ELIGIBLE_AUTHORITIES;
  const showsAdmin = eligible.includes(authority);
  const isDirty =
    position !== member.position ||
    roleId !== currentRoleId ||
    authority !== member.authority ||
    (showsAdmin ? isAdmin : false) !== member.isAdmin;

  const raisesAuthority =
    (authority === AUTHORITY.LEADER && member.authority !== AUTHORITY.LEADER) ||
    (showsAdmin && isAdmin && !member.isAdmin);

  const handleSave = () =>
    startTransition(async () => {
      /*
        ⚠️ **거절도 받아 낸다.** 액션은 BE 실패를 값으로 돌려주지만, 브라우저에서 Next 서버까지
           가는 길이 끊기면(네트워크·서버 재시작·배포) `await` 자체가 던진다 — 안 잡으면 화면이
           통째로 `error.tsx`로 넘어가거나 잠긴 채로 남는다(2026-08-12 전 화면 정리).
      */
      let result;
      try {
        result = await changeMemberGradeAction(member.id, {
          position,
          roleId,
          authority,
          // Owner에게는 칸 자체가 없다 — 화면에 없는 값을 보내지 않는다
          isAdmin: showsAdmin ? isAdmin : false,
        });
      } catch {
        setIsConfirming(false);
        setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      if (!result.isSuccess) {
        /*
          ⚠️ 확인 창을 **먼저 닫는다.** 안 닫으면 오류 문구가 창 뒤에 그려져 보이지 않고,
             사용자는 아무 일도 안 일어난 줄 알고 같은 버튼을 다시 누른다.
        */
        setIsConfirming(false);
        setError(result.message ?? "저장하지 못했습니다");
        return;
      }
      setError(null);
      setIsConfirming(false);
      toast.success("직급·권한을 저장했습니다");
    });

  /*
    ⚠️ **대표에게는 이 카드를 아예 안 그린다.** 전에는 카드를 세워 놓고 안에
       "대표 계정은 이 화면에서 바꿀 수 없습니다" 한 줄만 넣었는데, 제목·설명까지 갖춘
       카드가 통째로 아무 일도 안 하는 자리가 됐다 — 오른쪽 칸이 빈 상자 둘로 남았다.
       못 고친다는 사실은 **사람 카드**가 한 줄로 말한다(`MemberProfileCard`).
    ⚠️ 판정은 `canChangeGradeOf` 한 곳이 한다 — 두 카드가 각자 세면 한쪽은 폼을 감추고
       다른 쪽은 이유를 안 적는 상태가 조용히 생긴다.
  */
  if (!canChangeGradeOf(member)) return null;

  return (
    <section className="border-border bg-card overflow-hidden rounded-2xl border">
      <h2 className="px-7 pt-6 pb-3 text-[17px] leading-7 font-semibold tracking-[-0.3px]">
        직급·권한 변경
      </h2>
      <p className="text-muted-foreground px-7 pb-5 text-[12px] leading-[18px] break-keep">
        권한은 이 사람이 <span className="text-foreground font-medium">볼 수 있는 화면</span>을
        정합니다. 관리자 권한은 권한을 대체하지 않고 위에 덧붙습니다.
      </p>

      {/* ⚠️ 구분선은 **카드 전폭**이다 — 안쪽 칸에 폭을 걸어도 선은 안 따라간다 */}
      <div className="border-border border-t px-7 py-5">
        <div className="@container flex flex-col gap-4">
          <>
            {/*
              ⚠️ **칸 수를 뷰포트가 아니라 카드 폭으로 정한다**(`@container`). 이 카드는
                 360px 곁 컬럼에 산다 — `sm:`으로 잡으면 화면이 넓다는 이유만으로 좁은
                 칸 안에서 3열이 되어 `프론트엔드` 같은 값이 잘린다. 카드가 넓어지는 날
                 (본 칸으로 옮기거나 컬럼을 늘리면) 저절로 3열이 된다.
              ⚠️ 셋은 같은 성격(그 사람이 무엇으로 불리는가)이라 한 줄에 놓을 값이다.
            */}
            <div className="grid gap-4 @md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="member-authority">권한</Label>
                <Select
                  items={AUTHORITY_LABEL}
                  value={authority}
                  onValueChange={(value) => setAuthority(value as Authority)}
                  disabled={!canEdit || isPending}
                >
                  <SelectTrigger id="member-authority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {POSITION_AUTHORITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {AUTHORITY_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="member-position">직급</Label>
                {/*
                  ⚠️ 직급은 **회사가 만든 목록**에서 고른다(온보딩 2단계·기업 설정).
                     한때 목록이 이 화면에 없어서 자유 입력이었는데, 그동안 회사에 없는
                     직급도 그대로 저장됐다 — 직급에는 권한이 매여 있어 목록 밖 값은
                     어느 권한에도 안 걸린다.
                  ⚠️ 고를 게 없으면 빈 셀렉트 대신 **갈 곳을 말한다**(발급 창과 같은 문법).
                */}
                {positionNames.length > 0 ? (
                  <Select
                    items={Object.fromEntries(positionNames.map((name) => [name, name]))}
                    value={position}
                    onValueChange={(value) => setPosition(value ?? "")}
                    disabled={!canEdit || isPending}
                  >
                    <SelectTrigger id="member-position" className="w-full">
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
                )}
              </div>

              {/*
                ⚠️ **역할도 여기서 고친다.** 전에는 발급 때만 정할 수 있어서, 팀을 옮기거나
                   맡은 일이 바뀌어도 첫 값이 그대로 남았다 — 한 번 쓰고 못 고치는 값은
                   시간이 지나면 화면이 거짓말을 한다.
                ⚠️ 고를 수 있는 건 **이 사람 팀의 역할**뿐이다. 팀은 여기서 안 바꾸므로
                   목록이 흔들리지 않는다.
                ⚠️ 역할이 없는 팀이면 고를 게 `없음`뿐이라 그대로 둔다.
              */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="member-role">역할</Label>
                {/*
                  ⚠️ **`없음`을 화면에서 만들어 넣지 않는다.** BE가 모든 팀의 역할 목록에
                     그 행을 실제 id로 끼워 준다(2026-08-14 BE PR #489) — 받은 목록을
                     그대로 그린다.
                */}
                <Select
                  items={Object.fromEntries(roleOptions.map((role) => [role.id, role.name]))}
                  value={roleId ?? ""}
                  onValueChange={(value) => setRoleId(value || null)}
                  disabled={!canEdit || isPending || roleOptions.length === 0}
                >
                  <SelectTrigger id="member-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/*
              ⚠️ **덧붙는 것은 아래다.** 전에는 이 칸이 맨 위에 있었는데, 카드 이름이
                 `직급·권한 변경`인데 정작 그 두 칸이 아래로 밀리고 큰 테두리 상자가 머리를
                 차지했다 — 설명문이 말하는 순서(권한 → 그 위에 덧붙는 관리자)와도 반대였다.
              ⚠️ **테두리 상자를 두르지 않는다.** 값 하나짜리 체크박스에 상자를 씌우면 위의
                 두 입력칸보다 무겁게 보여, 곁가지가 본 줄기보다 커진다.
              ⚠️ 표식은 **방패**다 — 목록 표·온보딩 초대 줄과 같은 것을 같게 그린다.
            */}
            {showsAdmin && (
              <div className="border-border mt-1 flex items-center gap-2.5 border-t pt-4">
                <Checkbox
                  id="member-admin"
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(checked === true)}
                  disabled={!canEdit || isPending}
                />
                <label
                  htmlFor="member-admin"
                  className="flex cursor-pointer items-center gap-1.5 text-[13px] leading-5 font-medium"
                >
                  <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                  관리자 권한 부여
                </label>

                {/*
                  ⚠️ **설명을 줄로 깔지 않는다.** 두 줄짜리 회색 문장이 체크박스 아래에 붙으니
                     값 하나짜리 칸이 위의 셀렉트 셋보다 무거워 보였다 — 곁 컬럼에서는 그 문장이
                     두 줄로 접혀 더 커졌다. 계정 발급 창과 **같은 `?`** 로 옮긴다.
                */}
                <Popover>
                  <PopoverTrigger
                    type="button"
                    aria-label="관리자 권한이 무엇인지 보기"
                    className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 focus-visible:ring-ring flex size-4 shrink-0 items-center justify-center rounded-full border text-[11px] leading-none transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
                  >
                    ?
                  </PopoverTrigger>
                  {/* ⚠️ 오른쪽으로 편다 — 아래로 펴면 바로 밑의 [저장]을 덮는다 */}
                  <PopoverContent side="right" align="center" className="w-56 text-center">
                    <p className="text-[13px] leading-5 font-medium break-keep">
                      관리자 화면에 들어갈 수 있습니다.
                    </p>
                    <p className="text-muted-foreground text-[12px] leading-[18px] break-keep">
                      사원·회의실 관리, 구독·저장소 화면입니다.
                      <br />
                      권한을 대체하지 않고 위에 덧붙습니다.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </>
        </div>
      </div>

      {/*
        ⚠️ 제출 버튼은 **밑단 우측**이다(§디자인 토큰). 폭 가득한 버튼은 이 카드만 다르게
           보이고, 비활성일 때 회색 덩어리가 카드 절반을 차지한다.
      */}
      {canEdit && (
        <div className="border-border flex items-center justify-end gap-2 border-t px-7 py-4">
          {error && (
            <p role="alert" className="text-destructive mr-auto text-[12px] leading-4 break-keep">
              {error}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            variant="ink"
            disabled={isPending || !isDirty}
            onClick={() => (raisesAuthority ? setIsConfirming(true) : handleSave())}
          >
            {isPending ? "저장 중…" : "저장"}
          </Button>
        </div>
      )}

      {/*
        ⚠️ **무엇이 열리는지** 적는다. "권한을 바꿀까요?"만 묻는 건 확인이 아니다 —
           올려 주는 쪽이 무엇을 할 수 있게 되는지 알아야 판단할 수 있다.
      */}
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={() => setIsConfirming(false)}
        title={`${member.name} 님의 권한을 올릴까요?`}
        description={
          <>
            {authority === AUTHORITY.LEADER && member.authority !== AUTHORITY.LEADER && (
              <>
                Leader가 되면 자기 팀 전체를 관리하고 팀원의 인수인계를 중간 승인합니다.
                <br />
              </>
            )}
            {showsAdmin && isAdmin && !member.isAdmin && (
              <>사원·회의실 관리와 구독·저장소 화면에 들어갈 수 있게 됩니다.</>
            )}
          </>
        }
        confirmLabel="권한 올리기"
        isPending={isPending}
        pendingLabel="저장 중…"
        onConfirm={handleSave}
      />
    </section>
  );
}
