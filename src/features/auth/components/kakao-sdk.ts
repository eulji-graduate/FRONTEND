/**
 * 카카오맵 SDK가 붙여 놓는 전역 — **쓰는 만큼만** 좁게 적는다.
 *
 * ⚠️ 공식 타입 패키지를 통째로 들이지 않는다. 지금 부르는 건 지도·마커·장소검색 셋뿐인데
 *    수백 줄을 들여오면 무엇을 실제로 의존하는지 안 보인다.
 */
export interface KakaoPlace {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

export interface KakaoNamespace {
  maps: {
    load: (callback: () => void) => void;
    LatLng: new (lat: number, lng: number) => unknown;
    Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown;
    Marker: new (options: { position: unknown }) => { setMap: (map: unknown) => void };
    services: {
      Places: new () => {
        keywordSearch: (
          keyword: string,
          callback: (data: KakaoPlace[], status: string) => void,
        ) => void;
      };
      Status: { OK: string };
    };
  };
}

export function readKakao(): KakaoNamespace | undefined {
  return (window as unknown as { kakao?: KakaoNamespace }).kakao;
}
