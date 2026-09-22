"use client";

import { ExternalLink, MapPin } from "lucide-react";
import Script from "next/script";
import { useCallback, useRef, useState } from "react";

/**
 * 카카오맵 실지도.
 *
 * ⚠️ **JavaScript 앱 키가 있어야 뜬다**(`NEXT_PUBLIC_KAKAO_MAP_KEY`). 카카오 개발자 콘솔에서
 *    앱을 만들고 [플랫폼 > Web]에 배포 도메인과 `http://localhost:3000`을 등록해야 한다.
 *    키가 없거나 SDK를 못 불러오면 **조용히 빈 상자를 두지 않고** 주소 카드로 대체한다(§정직성).
 * ⚠️ 키는 `NEXT_PUBLIC_`이라 브라우저에 노출된다 — 카카오 JS 키는 원래 그런 키이고,
 *    보호는 위의 **도메인 등록**이 한다. REST 키를 여기 넣으면 안 된다.
 */
interface KakaoMapProps {
  /** 지도 중심 위도 */
  lat: number;
  /** 지도 중심 경도 */
  lng: number;
  /** 마커 위에 띄울 이름 */
  label: string;
  /** 지도가 못 뜰 때 보여줄 주소 */
  address: string;
  /** 카카오맵으로 나가는 주소 */
  mapUrl: string;
  /** 지도에서 찾을 이름 — 좌표 대신 이걸로 검색한다 */
  searchKeyword: string;
}

/** SDK가 붙여 놓는 전역. 타입 정의를 통째로 들이지 않고 쓰는 만큼만 좁게 적는다 */
interface KakaoNamespace {
  maps: {
    load: (callback: () => void) => void;
    LatLng: new (lat: number, lng: number) => unknown;
    Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown;
    Marker: new (options: { position: unknown }) => { setMap: (map: unknown) => void };
    InfoWindow: new (options: { content: string }) => {
      open: (map: unknown, marker: unknown) => void;
    };
    services: {
      Places: new () => {
        keywordSearch: (
          keyword: string,
          callback: (data: { x: string; y: string }[], status: string) => void,
        ) => void;
      };
      Status: { OK: string };
    };
  };
}

function readKakao(): KakaoNamespace | undefined {
  return (window as unknown as { kakao?: KakaoNamespace }).kakao;
}

export function KakaoMap({ lat, lng, label, address, mapUrl, searchKeyword }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  const draw = useCallback(() => {
    const kakao = readKakao();
    const container = containerRef.current;
    if (!kakao || !container) {
      setHasFailed(true);
      return;
    }

    // `autoload=false`로 불렀으니 여기서 직접 로드한다 — 안 하면 `kakao.maps.Map`이 없다
    kakao.maps.load(() => {
      /*
        ⚠️ 좌표를 손으로 박지 않는다 — 지도에서 눈으로 찍은 위도·경도는 틀리기 쉽고,
           틀려도 지도는 아무 말 없이 엉뚱한 곳을 보여준다(예전에 아주대 근처가 잡혔다).
           **이름으로 검색**해 카카오가 준 좌표를 쓰고, 검색이 실패할 때만 넘겨받은 값으로 돈다.
      */
      const drawAt = (center: unknown) => {
        const map = new kakao.maps.Map(container, { center, level: 3 });
        const marker = new kakao.maps.Marker({ position: center });
        marker.setMap(map);
        new kakao.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:12px;white-space:nowrap;color:#1a1715">${label}</div>`,
        }).open(map, marker);
      };

      const places = new kakao.maps.services.Places();
      places.keywordSearch(searchKeyword, (data, status) => {
        const top = data[0];
        if (status === kakao.maps.services.Status.OK && top) {
          drawAt(new kakao.maps.LatLng(Number(top.y), Number(top.x)));
          return;
        }
        drawAt(new kakao.maps.LatLng(lat, lng));
      });
    });
  }, [lat, lng, label, searchKeyword]);

  // 키가 없으면 스크립트를 부르지도 않는다 — 401을 콘솔에 흘리는 대신 대체 화면으로 간다
  const isDisabled = !appKey || hasFailed;

  return (
    /*
      지도 액자 — 카카오 타일은 밝은 색이라 어두운 무대 위에 그냥 놓으면 **혼자 튄다.**
      ① 안쪽 그림자로 가장자리를 눌러 앉히고 ② 아래를 무대 색으로 흐리게 덮어 배경에 잇는다.
      ③ **밝기에 따라 세기를 다르게 준다** — 검정 무대에서는 타일을 78%까지 눌러야 눈이 덜 부시고,
         흰 바탕에서는 같은 세기를 쓰면 지도가 탁해 보인다. 그림자·덮개도 같은 이유로 갈린다.
    */
    <div className="ring-rgb-static border-border relative h-[380px] overflow-hidden rounded-2xl border shadow-[0_14px_40px_-22px_rgba(124,58,237,0.35)] [.landing-night_&]:shadow-[0_18px_50px_-24px_rgba(124,58,237,0.55)]">
      {!isDisabled && (
        <Script
          src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`}
          strategy="afterInteractive"
          onReady={draw}
          onError={() => setHasFailed(true)}
        />
      )}

      {isDisabled ? (
        <div className="bg-secondary flex h-full items-center justify-center">
          <div className="bg-dot-grid absolute inset-0" aria-hidden />
          <div className="relative flex flex-col items-center gap-2 text-center">
            <MapPin className="size-4 shrink-0 text-white/90" aria-hidden />
            <p className="text-[13px] leading-[21px] font-medium break-keep">{address}</p>
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="text-landing-accent flex items-center gap-1 text-[13px] leading-5 hover:underline"
            >
              {/* 한글 글자가 상자 안에서 위쪽에 앉아 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
              <span>카카오맵에서 열기</span>
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className="relative z-0 size-full [.landing-night_&]:brightness-[0.78] [.landing-night_&]:contrast-[1.08] [.landing-night_&]:saturate-[0.85]"
          />

          {/* 가장자리를 눌러 앉히는 안쪽 그림자 — 액자 밖으로 타일이 튀어나와 보이지 않게 */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.12)] [.landing-night_&]:shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]"
          />

          {/* 아래를 무대 색으로 덮어 배경에 잇는다 */}
          <span
            aria-hidden
            className="from-landing-stage/60 [.landing-night_&]:from-landing-stage/55 pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t to-transparent [.landing-night_&]:h-20"
          />

          {/* 좌상단 주소 칩 — 지도만 두면 어디를 가리키는지 글로 남지 않는다 */}
          {/*
            ⚠️ 지도 위 요소는 `--card`(카드 바탕)를 쓰지 않는다. 그 값은 밝은 모드에서 흰색이라
               밝은 지도 타일에 묻혀 사라진다. **`--foreground`를 바탕으로 뒤집어** 쓴다 —
               밝은 모드에선 먹색 칩, 어두운 모드에선 흰 칩이 되어 양쪽 다 또렷하다.
            ⚠️ 유리 알약 하나로 통일한다 — 밝기와 무관하게 **흰 테두리 + 아주 옅은 흰 바탕**이다.
               지도 타일은 밝기 설정과 무관하게 밝고, 아래쪽은 무대색 덮개가 깔려 어둡다.
               두 배경 위에 다 얹히려면 색을 고르는 대신 **투명하게 두고 테두리로만** 형태를 잡는 게 낫다.
            ⚠️ `z-10`이 있어야 보인다. 카카오 SDK가 지도 안에 z-index를 가진 요소를 잔뜩 만드는데,
               우리 오버레이는 형제라 z를 안 주면 타일 밑으로 깔린다.
          */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-[#0a0a0a]/62 px-3.5 py-2 backdrop-blur-md [.landing-night_&]:border-white/30 [.landing-night_&]:bg-white/12">
            <MapPin className="size-4 shrink-0 text-white/90" aria-hidden />
            <span className="text-[12px] leading-4 font-medium text-white">{address}</span>
          </div>
          {/* 지도 위에 바로가기 하나 — 길찾기는 결국 카카오맵 앱에서 한다 */}
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-visible:ring-ring absolute right-3 bottom-3 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0a0a0a]/62 px-3.5 py-2 text-[12px] leading-4 font-medium text-white backdrop-blur-md transition-colors hover:bg-[#0a0a0a]/80 focus-visible:ring-2 focus-visible:outline-hidden [.landing-night_&]:border-white/30 [.landing-night_&]:bg-white/12 [.landing-night_&]:hover:bg-white/20"
          >
            {/* 한글 글자가 상자 안에서 위쪽에 앉아 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
            <span>카카오맵에서 열기</span>
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </>
      )}
    </div>
  );
}
