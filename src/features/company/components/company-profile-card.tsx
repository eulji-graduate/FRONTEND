"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/common/field-error";
import { LeaveGuard } from "@/components/common/leave-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMPANY_FIELD_LABEL, COMPANY_SECTION_TITLE } from "@/constants/company";
import { formatBusinessNumber } from "@/features/auth/business-number";
import { AddressPicker } from "@/features/auth/components/address-picker";

import { type CompanyProfileFormState, saveCompanyProfileAction } from "../actions";
import type { CompanyProfile, CompanyProfileDraft, PickedPlace } from "../types";
import { SettingCard } from "./setting-card";

/** 폼 한 칸 — 라벨·입력·오류 한 줄. 오류 자리는 비워 두지 않는다(떠도 카드가 안 출렁인다) */
function Field({
  name,
  controlId,
  label,
  error,
  children,
}: {
  /**
   * 칸 이름 — id를 만드는 데 쓴다.
   * ⚠️ `code`는 폼이 보내는 값이 아니라 **읽기 전용 줄**이라 draft에 없다. 그래도 같은
   *    `Field`를 쓰는 건, 위 두 칸과 라벨·간격이 한 톨도 어긋나면 안 되기 때문이다.
   */
  name: keyof CompanyProfileDraft | "code";
  /**
   * 라벨이 가리킬 입력의 id.
   * ⚠️ 위치 칸만 다르다 — `AddressPicker`가 자기 입력에 `company-address`를 박아 두고 있어서,
   *    여기서 `company-place`로 부르면 라벨이 아무것도 안 가리킨다(§a11y: `label htmlFor`).
   */
  controlId?: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = controlId ?? `company-${name}`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {/*
        ⚠️ `role="alert"` — [저장]을 누르면 포커스가 버튼에 남는다. 이 자리가 live region이
           아니면 오류가 떠도 스크린리더는 아무 말도 안 해서 저장된 줄 안다(신청 화면의
           `AuthField`가 같은 이유로 달아 뒀다).
        ⚠️ 비어 있어도 노드는 남긴다 — 없다 생겼다 하면 읽히지 않고 높이도 출렁인다.
      */}
      <FieldError id={`${id}-error`} message={error} reserveSpace />
    </div>
  );
}

/**
 * 기본 정보 — 기업 등록 신청에서 받은 값을 고친다.
 *
 * ⚠️ **칸은 신청에서 받는 셋뿐이다**(기업명·사업자등록번호·회사 위치). 대표자·대표 연락처는
 *    신청에서도 온보딩에서도 안 받는 값이라 두지 않는다 — 없는 값을 칸으로 두면 여기가
 *    정본이 아닌 값의 유일한 출처가 된다(§types.ts).
 * ⚠️ 위치는 **입력이 아니라 고르는 일**이라 신청 화면의 `AddressPicker`를 그대로 쓴다.
 *    사람이 아는 건 "판교 우리 건물"이지 위경도가 아니다. 키가 없거나 SDK가 죽으면 그
 *    컴포넌트가 알아서 직접 입력 칸으로 내려간다(§정직성).
 * ⚠️ **기업 코드는 위 두 칸과 같은 모양이되 `readOnly`**다. 값이 나란히 서야 셋이 한 묶음으로
 *    읽히고, 흐린 배경과 커서 없음이 "적는 곳이 아니다"를 말한다.
 * ⚠️ 검증 오류는 **칸 밑 인라인**이다(§토스트). 성공만 토스트로 알린다 — 화면이 그대로라
 *    안 알리면 저장됐는지 알 수 없다.
 */
export function CompanyProfileCard({ profile }: { profile: CompanyProfile }) {
  const [state, formAction, isPending] = useActionState<CompanyProfileFormState, FormData>(
    saveCompanyProfileAction,
    { errors: {} },
  );
  const [businessNumber, setBusinessNumber] = useState(profile.businessNumber);
  const [name, setName] = useState(profile.name);
  /*
    ⚠️ 고친 칸의 오류는 **그 자리에서 감춘다**(신청 화면 `register-form`과 같은 규칙).
       `useActionState`의 `errors`는 다음 제출까지 남아 있어서, 이름을 제대로 다시 적어도
       빨간 글씨가 붙어 있다 — 같은 폼 조작이 화면마다 다르게 반응하면 안 된다.
  */
  const [fixed, setFixed] = useState<ReadonlySet<string>>(new Set());
  const markFixed = (field: keyof CompanyProfileDraft) =>
    setFixed((prev) => new Set(prev).add(field));
  const errorOf = (field: keyof CompanyProfileDraft) =>
    fixed.has(field) ? undefined : state.errors[field];
  const [place, setPlace] = useState<PickedPlace | null>(profile.place);
  /* 다시 제출했으니 가려 뒀던 오류를 되살린다 */
  const handleSubmit = () => setFixed(new Set());

  /*
    ⚠️ **안 고쳤으면 저장을 안 연다.** 열자마자 눌러도 요청이 나가고 "저장했습니다"가 뜨는데,
       이 카드는 저장 결과가 화면에 남지 않아(값이 그대로다) 그 토스트가 유일한 신호다 —
       아무것도 안 바뀐 저장에도 뜨면 신호가 아니게 된다. 옆 두 카드도 같은 규칙이다.
  */
  const isDirty =
    name !== profile.name ||
    businessNumber !== profile.businessNumber ||
    JSON.stringify(place) !== JSON.stringify(profile.place);

  /*
    ⚠️ 의존성이 `state` **객체**다. `useActionState`는 제출할 때마다 새 객체를 주므로,
       같은 값을 두 번 저장해도 효과가 다시 돈다 — 안에 담긴 값으로 판정하면 두 번째가
       조용해진다(같은 밀리초·같은 결과).
  */
  useEffect(() => {
    if (state.isSaved) toast.success("기본 정보를 저장했습니다");
  }, [state]);

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      {/* 적어 둔 게 있으면 탭을 닫기 전에 브라우저가 한 번 물어본다 — 저장은 별도 행동이다 */}
      <LeaveGuard hasUnsaved={isDirty} />
      <SettingCard
        title={COMPANY_SECTION_TITLE.PROFILE}
        description={
          <>
            기업 등록 신청 때 적은 회사 정보입니다. 기업 코드는 사원이 로그인할 때 적는 값이라{" "}
            <span className="text-foreground font-medium">이 화면에서는 바꿀 수 없습니다.</span>
          </>
        }
        footer={
          <>
            {/*
              ⚠️ 칸과 무관한 실패는 **저장 줄에 남긴다.** 토스트로 띄우면 몇 초 뒤 사라져,
                 왜 저장이 안 됐는지 모른 채 같은 버튼을 다시 누르게 된다(§토스트는 보조다).
            */}
            {state.message && (
              <p role="alert" className="text-destructive mr-auto text-[12px] leading-4">
                {state.message}
              </p>
            )}
            <Button type="submit" size="sm" variant="ink" disabled={isPending || !isDirty}>
              {isPending ? "저장 중…" : "저장"}
            </Button>
          </>
        }
      >
        {/*
          ⚠️ **왼쪽이 지도, 오른쪽이 칸**이다. 세 가지를 다 시도해 보고 남은 배치다.
             · 좌 칸 / 우 지도 → 칸이 짧아 왼쪽 아래가 빈다
             · 전부 세로로 쌓기 → 지도가 전폭이라 5:1 띠가 된다
             · 지도만 폭을 720으로 → 카드 오른쪽 절반이 통째로 빈다
             지도를 반쪽에 두면 3:1에 가까워져 주변이 제대로 보이고, 남는 여백은
             오른쪽 칸 **아래**로 흩어져 눈에 덜 걸린다.
          ⚠️ `items-start` — 늘려 맞추면 지도만 커져 다시 비율이 무너진다.
        */}
        <div className="grid grid-cols-1 items-start gap-x-7 gap-y-6 px-7 py-6 lg:grid-cols-2">
          <Field
            name="place"
            controlId="company-address"
            label={COMPANY_FIELD_LABEL.PLACE}
            error={errorOf("place")}
          >
            <AddressPicker
              picked={place}
              onPick={(next) => {
                setPlace(next);
                markFixed("place");
              }}
              /*
                ⚠️ **여기서만 넘긴다.** 신청 화면은 위치가 신청을 끝내는 데 반드시 있어야 하는
                   값이라 지울 수 없다 — 이미 회사가 있는 이 화면만 위치를 선택 값으로 다룬다
                   (BE `UpdateCompanyRequest`가 빈 주소로 지우기를 지원한다).
              */
              onClear={() => {
                setPlace(null);
                markFixed("place");
              }}
              hasError={Boolean(errorOf("place"))}
              mapClassName="h-[232px]"
            />
          </Field>

          {/*
            ⚠️ 입력칸에는 **상한을 건다.** 반쪽이라도 1440에서는 한 칸이 680px가 되는데,
               `000-00-00000`을 적는 칸이 그만큼 넓으면 라벨과 커서가 멀어져 읽고 쓰기가
               나빠진다 — 폼 규격(720)을 둔 이유와 같다.
          */}
          <div className="flex max-w-[420px] flex-col gap-6">
            <Field name="name" label={COMPANY_FIELD_LABEL.NAME} error={errorOf("name")}>
              <Input
                id="company-name"
                name="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  markFixed("name");
                }}
                placeholder="사업자등록증에 적힌 이름"
                autoComplete="organization"
                aria-invalid={Boolean(errorOf("name"))}
                aria-describedby="company-name-error"
              />
            </Field>

            <Field
              name="businessNumber"
              label={COMPANY_FIELD_LABEL.BUSINESS_NUMBER}
              error={errorOf("businessNumber")}
            >
              {/* 적는 순간 하이픈을 넣어 굳힌다 — 신청 화면과 **같은 함수**다 */}
              <Input
                id="company-businessNumber"
                name="businessNumber"
                value={businessNumber}
                onChange={(event) => {
                  setBusinessNumber(formatBusinessNumber(event.target.value));
                  markFixed("businessNumber");
                }}
                placeholder="000-00-00000"
                inputMode="numeric"
                aria-invalid={Boolean(errorOf("businessNumber"))}
                aria-describedby="company-businessNumber-error"
              />
            </Field>

            {/*
              ⚠️ 기업 코드는 **사업자등록번호 바로 아래, 위 두 칸과 같은 모양**이다.
                 셋이 나란히 서야 한 묶음(회사를 가리키는 값)으로 읽힌다 — 카드 머리로 빼면
                 수치처럼 보이고, 폼 밖에 두면 어디에 딸린 값인지 알 수 없다.
              ⚠️ `readOnly`이지 `disabled`가 아니다. `disabled`는 탭 순서에서 빠져 **키보드로
                 골라 복사할 수 없다** — 대표가 사원에게 알려 줘야 하는 값이라 복사가 막히면
                 안 된다. 읽기 전용이라는 뜻도 `readOnly`가 정확하다.
              ⚠️ `name`을 주지 않는다 — 폼이 보내는 값이 아니다(서버는 이 값을 안 받는다).
            */}
            <Field name="code" label={COMPANY_FIELD_LABEL.CODE}>
              <Input
                id="company-code"
                value={profile.code}
                readOnly
                className="bg-muted text-muted-foreground cursor-default tracking-[0.1em] tabular-nums"
              />
            </Field>
          </div>
        </div>

        {/*
          ⚠️ 지도가 고른 값은 눈에 보이는 칸이 없다 — `FormData`에 실으려면 숨은 칸이 필요하다.
             좌표를 사람이 고칠 일은 없으니 `hidden`이 맞다(신청 화면과 같은 모양).
        */}
        <input type="hidden" name="placeAddress" value={place?.address ?? ""} />
        <input type="hidden" name="placeLat" value={place?.lat ?? ""} />
        <input type="hidden" name="placeLng" value={place?.lng ?? ""} />
      </SettingCard>
    </form>
  );
}
