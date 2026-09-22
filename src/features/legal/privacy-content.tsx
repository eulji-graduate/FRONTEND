import { Archive, Database, Handshake, KeyRound, Target } from "lucide-react";

import { DocSection } from "@/features/landing/components/doc-page";

/**
 * 개인정보처리방침 본문.
 *
 * ⚠️ 페이지(`/privacy`)와 모달이 **같은 글**을 쓴다. 두 벌로 두면 한쪽만 고쳐져 어긋난다.
 * ⚠️ 법무 검토 전 초안이다 — 출시 전 확정본으로 교체한다.
 */
const COLLECTED = [
  {
    kind: "계정 정보",
    items: "이름 · 회사 이메일 · 팀 · 직급",
    when: "관리자가 계정을 발급할 때",
  },
  {
    kind: "이용 기록",
    items: "회의 녹음 · 자막 · 액션 · 인수인계 문서",
    when: "서비스를 쓰는 동안",
  },
  {
    kind: "결제 기록",
    items: "플랜 · 결제 일시 · 금액 (카드번호 제외)",
    when: "유료 플랜을 결제할 때",
  },
] as const;

export function PrivacyContent() {
  return (
    <>
      <DocSection title="1. 다루는 정보" icon={Database}>
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="border-border bg-secondary border-b">
                <th scope="col" className="px-4 py-2.5 text-[12px] leading-[18px] font-medium">
                  구분
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] leading-[18px] font-medium">
                  항목
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] leading-[18px] font-medium">
                  언제
                </th>
              </tr>
            </thead>
            <tbody>
              {COLLECTED.map((row) => (
                <tr key={row.kind} className="border-border border-t first:border-t-0">
                  <th
                    scope="row"
                    className="px-4 py-2.5 text-[13px] leading-5 font-normal whitespace-nowrap"
                  >
                    {row.kind}
                  </th>
                  <td className="text-muted-foreground px-4 py-2.5 text-[13px] leading-5 break-keep">
                    {row.items}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5 text-[13px] leading-5 break-keep">
                    {row.when}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection title="2. 쓰는 목적" icon={Target}>
        <p>
          회의 기록을 정리해 담당자에게 할 일을 전달하고, 인수인계 문서를 구성하기 위해 씁니다. 그
          밖의 목적으로 쓰지 않으며, 광고에 활용하지 않습니다.
        </p>
      </DocSection>

      <DocSection title="3. 처리 위탁" icon={Handshake}>
        <p>
          결제는 Toss Payments에 위탁합니다. 카드 정보는{" "}
          <strong className="text-foreground">Z가 받지 않으며</strong>, 카드번호는 우리 서버에
          저장되지 않습니다. 서버는 AWS에서 운영합니다.
        </p>
      </DocSection>

      <DocSection title="4. 보관과 파기" icon={Archive}>
        <p>
          기록은 회사가 구독을 유지하는 동안 보관됩니다. 회사가 프로젝트를 삭제하면 그에 속한 녹음도
          함께 삭제되고, 탈퇴한 조직의 데이터는 관련 법령이 정한 기간이 지나면 파기합니다.
        </p>
      </DocSection>

      <DocSection title="5. 이용자의 권리" icon={KeyRound}>
        <p>
          자신의 정보 열람·정정·삭제는 회사의 관리자를 통해 요청할 수 있습니다. 회의 기록처럼 회사에
          귀속되는 자료는 회사의 정책에 따릅니다.
        </p>
      </DocSection>
    </>
  );
}
