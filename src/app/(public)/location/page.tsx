import { Car, Mail, TrainFront } from "lucide-react";
import type { Metadata } from "next";

import { DocPage, DocSection } from "@/features/landing/components/doc-page";
import { KakaoMap } from "@/features/landing/components/kakao-map";

export const metadata: Metadata = {
  title: "오시는 길 — Z",
  description: "Z 팀이 일하는 곳과 찾아오는 방법을 안내합니다.",
};

/**
 * 오시는 길.
 *
 * ⚠️ 지도는 **카카오맵 JS SDK 실지도**다. `NEXT_PUBLIC_KAKAO_MAP_KEY`(JavaScript 앱 키)가
 *    있어야 뜬다 — 없으면 `KakaoMap`이 주소 카드로 대체한다(§정직성).
 * ⚠️ 좌표는 지도 중심용 근사값이다. 정확한 위치가 확인되면 이 상수만 고친다.
 */
const ADDRESS = "을지대학교 박애관 421호";
const KAKAO_MAP_URL = "https://map.kakao.com/link/search/을지대학교 박애관";
const LAT = 37.2795;
const LNG = 127.0435;

export default function LocationPage() {
  return (
    <DocPage title="오시는 길" description="미리 연락 주시면 1층에서 맞이하겠습니다.">
      <KakaoMap
        lat={LAT}
        lng={LNG}
        label={ADDRESS}
        address={ADDRESS}
        mapUrl={KAKAO_MAP_URL}
        searchKeyword="을지대학교 성남캠퍼스 박애관"
      />

      <div className="pt-6">
        <DocSection title="대중교통" icon={TrainFront}>
          <p>8호선 남한산성입구역에서 캠퍼스까지 걸어서 올 수 있습니다.</p>
          <p>정문에서 박애관을 찾아 4층으로 올라오면 됩니다.</p>
        </DocSection>

        <DocSection title="주차" icon={Car}>
          <p>교내 주차장을 이용할 수 있습니다. 방문 전에 미리 알려주시면 안내할게요.</p>
        </DocSection>

        <DocSection title="문의" icon={Mail}>
          <p>방문 전 궁금한 점은 회사 대표 메일로 연락 주세요.</p>
        </DocSection>
      </div>
    </DocPage>
  );
}
