"use client";

import { Check, MapPin, Search } from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { hasPinnedCoords, type PickedPlace } from "../register-draft";
import { type KakaoPlace, readKakao } from "./kakao-sdk";

/**
 * 회사 위치 고르기 — 이름·주소로 찾아 지도에 핀을 꽂는다.
 *
 * ⚠️ 좌표를 직접 받지 않는다. 사람이 아는 건 "판교 우리 건물"이지 위경도가 아니다 —
 *    검색으로 고르게 하고 좌표는 뒤에서 챙긴다.
 * ⚠️ 키(`NEXT_PUBLIC_KAKAO_MAP_KEY`)가 없거나 SDK가 안 뜨면 **직접 입력 칸으로 내려간다.**
 *    조용히 빈 상자를 두지 않는다(§정직성) — 지도가 없어도 신청은 끝낼 수 있어야 한다.
 * ⚠️ 여기 쓰는 건 JavaScript 앱 키다. 브라우저에 노출되는 게 정상이고 보호는 도메인 등록이 한다.
 */
/** SDK 전역 — 타입을 통째로 들이지 않고 쓰는 만큼만 좁게 적는다 */
/** SDK가 이만큼 지나도 안 뜨면 못 쓰는 것으로 본다 — 느린 회선에서도 넉넉한 값 */
const SDK_TIMEOUT_MS = 8000;

interface AddressPickerProps {
  /** 이미 고른 곳. 아직 안 골랐으면 `null` */
  picked: PickedPlace | null;
  onPick: (place: PickedPlace) => void;
  /**
   * 고른 곳을 지운다 — **없으면 지우기 버튼 자체가 안 뜬다.**
   *
   * ⚠️ 신청 화면은 이 prop을 안 넘긴다. 위치는 신청을 끝내는 데 반드시 있어야 하는 값이라
   *    (`registerSchema.shape.place`가 `null`을 거절한다) 지울 수 있으면 안 된다 — 기업 설정
   *    (이미 회사가 있고, 위치는 선택 값)에서만 넘긴다(§연동 검증: BE `UpdateCompanyRequest`
   *    가 빈 주소로 지우기를 지원한다).
   */
  onClear?: () => void;
  hasError: boolean;
  /**
   * 지도 상자 크기.
   * ⚠️ 폭이 화면마다 다르다 — 좁은 카드(신청)에서 알맞은 높이가 전폭(기업 설정)에서는
   *    납작한 띠가 된다. 기본값은 신청 화면 기준이다.
   */
  mapClassName?: string;
}

export function AddressPicker({
  picked,
  onPick,
  onClear,
  hasError,
  mapClassName = "h-[160px]",
}: AddressPickerProps) {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const [keyword, setKeyword] = useState("");
  /** Esc로 목록을 닫은 뒤 포커스를 돌려놓을 자리 */
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<KakaoPlace[]>([]);
  /*
    ⚠️ 상태가 셋이다 — 기다리는 중 · 쓸 수 있음 · 못 씀.
       `onError`만 믿으면 안 된다. 스크립트가 차단되거나 `maps.load` 콜백이 영영 안 오면
       오류도 안 나고 입력칸이 잠긴 채로 남아 **신청을 아예 끝낼 수 없다**.
  */
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");
  const isReady = loadState === "ready";

  /*
    ⚠️ 정해진 시간 안에 SDK가 안 뜨면 **직접 입력으로 내려간다.** `onError`만으로는 부족하다 —
       스크립트가 차단되면 오류 없이 조용히 멈추고, 그러면 신청을 끝낼 방법이 없다.
    ⚠️ 상태를 바꾸는 건 효과 본문이 아니라 **타이머 콜백**이라 렌더가 한 번 더 돌지 않는다.
  */
  useEffect(() => {
    if (loadState !== "loading") return;
    const timer = setTimeout(
      () => setLoadState((current) => (current === "loading" ? "failed" : current)),
      SDK_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [loadState]);

  /*
    고른 곳에 핀을 꽂는다.
    ⚠️ 고르는 **그 자리에서** 그릴 수 없다. 지도 상자는 `picked`가 생겨야 렌더되므로
       그 시점엔 아직 DOM에 없다 — 상자가 붙을 때(**ref 콜백**) 그린다.
    ⚠️ `useEffect` 대신 ref 콜백인 이유는 같다. 아래 `key`가 좌표라 다시 고르면 상자가
       새로 붙고 콜백이 한 번 더 돈다 — 지도를 갱신하는 별도 코드가 필요 없다.
    ⚠️ **`useCallback`이 꼭 있어야 한다.** 인라인 화살표로 두면 렌더마다 함수 정체성이 바뀌어
       React가 `ref(null)` → `ref(container)`를 다시 부르고, 그때마다 카카오 지도 인스턴스가
       새로 만들어진다 — 검색어를 한 글자 칠 때마다 지도가 통째로 다시 그려지며 깜빡인다.
       `key`로 재마운트를 제어한다는 위 설명이 성립하려면 정체성이 고정돼 있어야 한다.
    ⚠️ 의존성은 `picked` 하나다. `picked`는 고를 때만 새로 만들어지므로 타이핑 중에는
       정체성이 안 바뀐다 — SDK 준비 여부는 상자의 `key`가 맡는다(그때 상자가 새로 붙는다).
  */
  const drawPin = useCallback(
    (container: HTMLDivElement | null) => {
      const kakao = readKakao();
      /* ⚠️ 좌표가 없으면(0,0) 그리지 않는다 — 아래에서 상자째 안 붙지만 판정은 여기도 둔다 */
      if (!kakao || !container || !hasPinnedCoords(picked)) return;

      const center = new kakao.maps.LatLng(picked.lat, picked.lng);
      const map = new kakao.maps.Map(container, { center, level: 4 });
      new kakao.maps.Marker({ position: center }).setMap(map);
    },
    [picked],
  );

  const handleSearch = () => {
    const kakao = readKakao();
    if (!kakao || !keyword.trim()) return;

    new kakao.maps.services.Places().keywordSearch(keyword, (data, status) => {
      setResults(status === kakao.maps.services.Status.OK ? data.slice(0, 5) : []);
    });
  };

  const handleChoose = (place: KakaoPlace) => {
    const lat = Number(place.y);
    const lng = Number(place.x);
    /*
      ⚠️ 좌표가 숫자가 아니면 **고르지 않는다.** `0`으로 저장하면 아프리카 앞바다를 회사 위치로
         적어 보내는 셈이다 — 틀린 값을 넘기느니 다시 고르게 한다.
    */
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLoadState("failed");
      return;
    }
    onPick({ address: place.road_address_name || place.address_name, lat, lng });
    setResults([]);
  };

  /* 키가 없거나 SDK가 죽으면 — 직접 입력. 신청 자체는 막지 않는다 */
  if (!appKey || loadState === "failed") {
    return (
      <div className="flex flex-col gap-2">
        {/*
          ⚠️ 좌표를 **0으로 덮어쓰지 않는다.** 신청 화면은 처음 적는 자리라 잃을 값이 없지만,
             이미 고른 곳을 들고 여는 화면(기업 설정)에서는 주소 한 글자만 고쳐도 실좌표가
             기니만 앞바다(0,0)로 조용히 바뀌어 저장된다 — `placeSchema`의 `lat: z.number()`도
             0을 통과시켜서 막아 주는 곳이 없다.
          ⚠️ 대신 좌표가 **주소를 따라오지 못한다는 사실**을 화면에 적는다. 지도를 못 쓰는
             상태를 숨기면 사용자는 위치가 옮겨진 줄 안다(§정직성).
          ⚠️ 문구는 **고른 곳이 있느냐로 갈린다.** 신청 화면에는 지킬 좌표가 아예 없어서
             "위치는 그대로입니다"가 거짓말이 된다 — 거기선 좌표 없이 주소만 간다.
        */}
        <Input
          id="company-address"
          value={picked?.address ?? ""}
          onChange={(event) =>
            onPick({
              address: event.target.value,
              lat: picked?.lat ?? 0,
              lng: picked?.lng ?? 0,
            })
          }
          placeholder="회사 주소를 입력해 주세요"
          autoComplete="street-address"
          aria-invalid={hasError}
          aria-describedby="company-address-error"
        />
        <p className="text-muted-foreground flex items-center gap-1.5 text-[12px] leading-4">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="break-keep">
            {picked
              ? "지도를 불러오지 못해 주소만 고칠 수 있습니다. 지도에 찍힌 위치는 그대로입니다."
              : "지도를 불러오지 못했습니다. 지도 위치 없이 주소만 저장됩니다."}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`}
        onReady={() => readKakao()?.maps.load(() => setLoadState("ready"))}
        onError={() => setLoadState("failed")}
      />

      {/*
        ⚠️ `form` 안에 `form`을 넣을 수 없다 — 여기서 Enter는 바깥 폼 제출로 새어 나간다.
           `keydown`에서 막고 검색으로 돌린다.
      */}
      {/*
        ⚠️ 떠 있는 것은 **닫는 길이 있어야 한다.** 결과가 지도를 가린 채 남으면 고르는 것
           말고는 치울 방법이 없다 — Esc와 바깥으로 나가는 포커스 둘 다로 닫는다.
        ⚠️ `onBlur`는 **컨테이너에** 건다. 입력에 걸면 결과 항목으로 가는 포커스 이동에도
           닫혀서 키보드로는 아무것도 못 고른다 — `relatedTarget`이 이 상자 밖일 때만 닫는다.
      */}
      <div
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setResults([]);
        }}
        /*
          ⚠️ Esc는 **입력이 아니라 이 상자에** 건다. 입력에만 걸면 Tab으로 결과 항목에 들어간
             뒤에는 Esc가 안 먹어서, 목록을 치우려면 원치 않는 값을 고르거나 상자 밖까지
             Tab으로 빠져나가는 수밖에 없다.
          ⚠️ 닫은 뒤 포커스를 입력으로 되돌린다 — 안 그러면 사라진 항목에 포커스가 남아
             다음 Tab이 어디로 갈지 알 수 없다.
        */
        onKeyDown={(event) => {
          if (event.key !== "Escape" || results.length === 0) return;
          event.stopPropagation();
          setResults([]);
          inputRef.current?.focus();
        }}
      >
        <Input
          ref={inputRef}
          id="company-address"
          value={keyword}
          /* 키워드를 고치는 순간 옛 결과는 답이 아니다 */
          onChange={(event) => {
            setKeyword(event.target.value);
            setResults([]);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            handleSearch();
          }}
          placeholder="건물명이나 주소로 찾아 주세요"
          disabled={!isReady}
          aria-invalid={hasError}
          aria-describedby="company-address-error"
          className="pr-10"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={!isReady}
          aria-label="주소 검색"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 focus-visible:ring-2 focus-visible:outline-hidden disabled:opacity-40"
        >
          <Search className="size-4" aria-hidden />
        </button>

        {/*
          ⚠️ **`role="combobox"`를 선언하지 않는다.** 선언하면 보조기술은 팝업이 listbox이고
             ↑↓로 옮겨 다니며 `aria-activedescendant`가 따라온다고 기대하는데, 여기 목록은
             그냥 버튼 줄이라 "펼쳐짐"만 읽히고 정작 무엇이 떴는지는 알 수 없다 —
             절반만 맞춘 ARIA는 아무것도 안 붙인 것보다 나쁘다. 버튼 목록은 Tab으로 닿고
             Enter로 골라지므로 키보드 접근은 이미 성립한다. 대신 **몇 개 떴는지**를 말해 준다.
          ⚠️ 결과는 **띄운다**(absolute). 줄 사이에 끼워 넣으면 검색할 때마다 아래 지도와
             카드 전체가 밀렸다 돌아와 화면이 출렁인다 — 고르는 동안 뒤가 안 움직여야
             무엇을 고르는지 눈이 따라간다.
          ⚠️ 지도 위에 떠야 하므로 `z-20`이다. 지도(카카오 SDK)가 자기 요소에 z-index를 매긴다.
        */}
        {results.length > 0 && (
          <ul
            id="company-address-results"
            aria-label="찾은 주소"
            className="border-border bg-card absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border shadow-lg"
          >
            {results.map((place) => (
              <li key={`${place.x},${place.y}`}>
                <button
                  type="button"
                  /*
                    ⚠️ `onMouseDown`에서 기본 동작을 막는다. Safari·Firefox(mac)는 버튼을 누를 때
                       포커스를 주지 않아서, 컨테이너 `onBlur`의 `relatedTarget`이 `null`이 된다 —
                       그러면 클릭이 처리되기 **전에** 목록이 사라져 `onClick`이 영영 안 뛴다.
                       Chrome에서만 우연히 되던 자리다. 기본 동작(포커스 이동)을 막으면
                       blur 자체가 안 나서 세 브라우저가 같이 동작한다.
                  */
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleChoose(place)}
                  className="hover:bg-secondary focus-visible:ring-ring flex w-full flex-col gap-0.5 px-3.5 py-2.5 text-left focus-visible:ring-2 focus-visible:outline-hidden"
                >
                  <span className="text-[13px] leading-5 font-medium">{place.place_name}</span>
                  <span className="text-muted-foreground text-[12px] leading-4">
                    {place.road_address_name || place.address_name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 결과가 몇 개 떴는지 — 보이지는 않고 읽히기만 한다 */}
      <p aria-live="polite" className="sr-only">
        {results.length > 0 ? `찾은 주소 ${results.length}개` : ""}
      </p>

      {picked && (
        <>
          <p className="text-muted-foreground flex items-center gap-1.5 text-[12px] leading-4">
            {/* ⚠️ 초록은 규칙에 없는 색이다 — 골랐다는 건 체크 표시가 이미 말한다(DESIGN §5) */}
            <Check className="text-foreground size-3.5 shrink-0" aria-hidden />
            <span className="flex-1">{picked.address}</span>
            {/* ⚠️ `onClear`가 없으면(신청 화면) 안 그린다 — 위치는 신청을 끝내는 데 반드시 있어야 한다 */}
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 rounded px-1 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-hidden"
              >
                지우기
              </button>
            )}
          </p>
          {/*
            ⚠️ `key`에 **SDK 상태를 함께 넣는다.** 이미 고른 곳을 들고 시작하는 화면
               (기업 설정)에서는 지도 상자가 SDK보다 먼저 붙어서, ref 콜백이 도는 시점에
               `readKakao()`가 아직 `null`이다 — 그대로 두면 **빈 상자가 영영 남는다.**
               상태가 `ready`로 바뀌면 상자가 새로 붙으면서 콜백이 한 번 더 돈다.
          */}
          {/*
            ⚠️ **좌표가 없으면 지도를 아예 안 그린다.** 지도를 못 쓴 채 저장된 회사는 주소만
               있고 좌표가 `0,0`인데, 그대로 그리면 **맞는 주소 아래 기니만 앞바다에 핀**이
               꽂혀 위치가 등록된 것처럼 읽힌다(§정직성 — 없는 걸 있는 것처럼 그리지 않는다).
            ⚠️ 자리는 비워도 **높이는 지도와 같게** 둔다 — 안 그러면 좌표 유무에 따라 카드가
               껑충 줄었다 늘어 옆 칸까지 밀린다.
          */}
          {!hasPinnedCoords(picked) ? (
            <div
              className={cn(
                "border-border flex items-center justify-center overflow-hidden rounded-lg border",
                mapClassName,
              )}
            >
              <EmptyState
                icon={MapPin}
                title="지도 위치가 등록되지 않았습니다"
                description="주소만 저장돼 있습니다. 위에서 다시 찾아 고르면 지도에 표시됩니다."
                className="px-4 py-0"
              />
            </div>
          ) : (
            <div
              key={`${loadState}:${picked.lat},${picked.lng}`}
              ref={drawPin}
              /*
              ⚠️ `aria-hidden`이 아니라 `inert`다. 지도 안에는 카카오 SDK가 만든 버튼·링크가
                 들어 있어서, `aria-hidden`만 걸면 **읽히지는 않는데 탭으로는 들어가진다** —
                 스크린리더 사용자가 이름 없는 것들 사이에 갇힌다. `inert`는 포커스까지 뺀다.
              ⚠️ 지도를 실제로 조작하게 둘 생각이면 반대로 `inert`를 떼고 이름을 줘야 한다.
                 지금은 **고른 곳을 눈으로 확인하는 그림**이라 빼는 게 맞다.
            */
              inert
              className={cn("border-border w-full overflow-hidden rounded-lg border", mapClassName)}
            />
          )}
        </>
      )}

      {!picked && (
        <p className="text-muted-foreground/70 flex items-center gap-1.5 text-[12px] leading-4">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span>찾은 곳을 고르면 지도에 표시됩니다</span>
        </p>
      )}
    </div>
  );
}
