import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // shadcn 생성물은 우리 규칙(import 정렬 등) 대상에서 제외 — 업데이트 시 diff가 커진다.
    "src/components/ui/**",
  ]),
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      // 조용한 any 금지 — 타입 구멍이 런타임까지 흘러간다 (CONVENTIONS §3)
      "@typescript-eslint/no-explicit-any": "error",
      // import 순서를 결정론적으로 → diff 노이즈·머지 충돌 감소
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      // 커밋 금지 항목 (CONVENTIONS §3)
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
]);

export default eslintConfig;
