import "server-only";

import { Font } from "@react-pdf/renderer";
import { join } from "path";

export const PDF_FONT_FAMILY = "Pretendard";

let registered = false;

/**
 * 한글 폰트 등록 — **서버(Node)에서만** 한다. `@react-pdf/renderer`의 기본 폰트는
 * 한글 글리프가 없어 등록 안 하면 PDF에 한글이 네모(□)로 뜬다.
 * ⚠️ **파일을 저장소에 직접 둔다**(`src/assets/fonts`) — 런타임에 외부 CDN에서 받으면
 *    그 요청이 실패하는 순간 PDF 생성 전체가 막힌다. OFL 라이선스라 재배포 가능하다.
 * ⚠️ `Font.register`의 `src`는 **경로 문자열**이다 — 직접 읽은 버퍼를 넘기면 타입이 안 맞고,
 *    fontkit이 내부에서 그 경로로 다시 읽는다.
 * ⚠️ 모듈 스코프에서 **한 번만** 등록한다 — 요청마다 다시 등록할 이유가 없다.
 */
export function registerPdfFont(): void {
  if (registered) return;

  const fontsDir = join(process.cwd(), "src/assets/fonts");
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: join(fontsDir, "Pretendard-Regular.ttf"), fontWeight: "normal" },
      { src: join(fontsDir, "Pretendard-Bold.ttf"), fontWeight: "bold" },
    ],
  });

  registered = true;
}
