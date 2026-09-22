/**
 * 사업자등록번호를 `000-00-00000` 모양으로 굳혀 준다.
 *
 * ⚠️ **적는 자리마다 같은 함수를 쓴다**(기업 등록 신청 · 기업 설정). 한쪽만 하이픈을 넣어
 *    주면 같은 회사의 같은 번호가 화면마다 다르게 보이고, 검증 정규식에도 한쪽만 걸린다.
 * ⚠️ 사람마다 다르게 적으면(`1234567890`·`123 45 67890`) 서버가 고생한다 — 적는 순간 굳힌다.
 */
export function formatBusinessNumber(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
