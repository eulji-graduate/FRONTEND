import type { Company } from "../types";

/**
 * 기업 코드 목 데이터.
 *
 * ⚠️ **목이다.** 코드 확인 API가 아직 없다(BE 미개발). 연동되면 이 파일을 지우고
 *    `actions.ts`의 `isMock` 분기만 고친다(§격리막).
 * ⚠️ 코드 모양은 **발급받는 값**처럼 보여야 한다. 회사 이름+연도(`TECHSTART-2025`)로 두면
 *    사람이 직접 지어 넣는 값으로 오해한다 — 실제로는 등록 승인 후 메일로 받는다.
 */
export const MOCK_COMPANIES: readonly Company[] = [
  { code: "NOVA-7K3D", name: "노바랩스" },
  { code: "Z-DEMO", name: "Z 데모" },
];

/** 코드로 회사를 찾는다. 대소문자·앞뒤 공백은 무시한다 — 메일에서 복사하면 공백이 붙는다 */
export function findMockCompany(code: string): Company | null {
  const normalized = code.trim().toUpperCase();
  return MOCK_COMPANIES.find((company) => company.code === normalized) ?? null;
}
