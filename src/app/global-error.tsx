"use client";

import { RotateCw } from "lucide-react";

/**
 * 루트 레이아웃까지 터졌을 때의 마지막 그물.
 *
 * ⚠️ 이 파일은 **자기 `html`·`body`를 직접 그린다.** 루트 레이아웃이 죽은 상황이라
 *    그 위에 얹힐 수 없다(Next 규칙).
 * ⚠️ 그래서 **폰트·토큰·컴포넌트를 쓸 수 없다.** 여기만 값을 직접 적는다 —
 *    토큰 하드코딩 금지 규칙의 유일한 예외다.
 * ⚠️ `console`은 커밋 금지다 — 오류 수집 경로가 정해지면 그때 붙인다.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
          background: "#ffffff",
          color: "#1c1917",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>화면을 열지 못했습니다</h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#78716c", margin: 0, maxWidth: 360 }}>
          잠시 후 다시 시도해 주세요. 계속 안 되면 담당자에게 알려주세요.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 40,
            padding: "0 18px",
            borderRadius: 8,
            border: 0,
            cursor: "pointer",
            background: "#1c1917",
            color: "#ffffff",
            fontSize: 14,
          }}
        >
          <RotateCw size={15} />
          다시 시도
        </button>
      </body>
    </html>
  );
}
