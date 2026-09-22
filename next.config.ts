import type { NextConfig } from "next";

/*
  ⚠️ 서버 프로세스의 시간대를 한국 시간(KST, UTC+9)으로 고정한다.
     `new Date("2026-08-05T00:00:00")`처럼 오프셋 없는 문자열은 **프로세스의 로컬 시간대**로
     해석된다(Mock 데이터·Server Action이 전부 이 방식이다, `src/features/calendar/mock/events.ts`
     등). 배포 환경(컨테이너 등)이 기본값으로 UTC를 쓰면, 자정 근처 시각이 하루 앞뒤로 밀려
     보인다 — 브라우저(사용자 KST)와 서버가 서로 다른 시간대로 같은 문자열을 해석해서 생기는
     문제다. `next.config.ts`가 가장 먼저 로드되므로 여기서 프로세스 전체에 못 박는다.
*/
process.env.TZ = "Asia/Seoul";

const nextConfig: NextConfig = {
  // Docker 이미지에 node_modules 전체 대신 추적된 최소 런타임만 담기 위함(.next/standalone).
  output: "standalone",
  /*
    개발 서버 표시등(왼쪽 아래 동그란 `N` 배지)을 끈다.

    ⚠️ **우리 코드가 아니다.** `next dev`가 `<nextjs-portal>`로 띄우는 것이라 배포된 화면에는
       원래 없다. 다만 개발 중에 **사이드바 계정 줄 위에 겹쳐 앉아**, 화면을 보거나 스크린샷으로
       디자인을 확인할 때 없는 요소가 있는 것처럼 읽힌다.
    ⚠️ 끄는 건 **배지뿐이다.** 오류 오버레이(빨간 화면)와 HMR은 그대로 동작한다 —
       빌드 실패를 조용히 넘기지 않는다(§정직성).
  */
  devIndicators: false,
  // 프록시(nginx) 뒤에서 도메인으로 접속하면 Server Action이 Origin 불일치로 막힌다.
  experimental: {
    serverActions: {
      allowedOrigins: ["www.z-groupware.site", "z-groupware.site"],
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
