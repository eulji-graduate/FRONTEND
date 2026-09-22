import {
  BadgeCheck,
  BookText,
  CreditCard,
  FileText,
  Mail,
  RefreshCw,
  ShieldAlert,
  UserCog,
  Wrench,
} from "lucide-react";

import { DocSection } from "@/features/landing/components/doc-page";

/**
 * 이용약관 본문.
 *
 * ⚠️ 페이지(`/terms`)와 모달이 **같은 글**을 쓴다. 두 벌로 두면 한쪽만 고쳐져 어긋난다.
 * ⚠️ 법무 검토 전 초안이다 — 출시 전 확정본으로 교체한다.
 */
export function TermsContent() {
  return (
    <>
      <DocSection title="1. 용어" icon={BookText}>
        <p>
          “회사 계정”은 Z에 가입해 조직을 만든 주체를, “구성원”은 그 조직이 발급한 계정을 쓰는
          사람을 말합니다. “기록”은 회의 녹음·자막·요약·액션·인수인계 문서를 통틀어 말합니다.
        </p>
      </DocSection>

      <DocSection title="2. 서비스 소개" icon={BadgeCheck}>
        <p>
          Z는 회의 내용을 기록하고, 결정과 할 일을 담당자에게 배정하는 사내 협업 도구입니다. 회사가
          계정을 발급하며, 한 계정은 하나의 회사에 속합니다.
        </p>
      </DocSection>

      <DocSection title="3. 계정과 이용자의 의무" icon={UserCog}>
        <p>
          계정은 회사의 관리자가 발급합니다. 발급받은 계정 정보를 다른 사람과 공유할 수 없고,
          비밀번호를 잃어버린 경우 로그인 화면의 [비밀번호를 잊으셨나요?]에서 새 비밀번호를 받을 수
          있습니다.
        </p>
        <p>
          법령이나 공서양속에 어긋나는 자료를 올리거나, 다른 회사·구성원의 데이터에 접근을 시도하는
          행위는 금지됩니다. 위반이 확인되면 회사와 협의해 이용을 제한할 수 있습니다.
        </p>
      </DocSection>

      <DocSection title="4. 회의 기록과 권리" icon={FileText}>
        <p>
          회의 녹음과 자막은 회의를 개설한 사람이 시작합니다. 기록은 회사에 귀속되며, 담당자가
          바뀌어도 회사 안에 남습니다. 회의에 참여하는 모든 분께 기록이 남는다는 사실을 미리 알려
          주세요.
        </p>
        <p>Z 서비스 자체(화면·상표·코드)에 대한 권리는 Z에 있습니다.</p>
      </DocSection>

      <DocSection title="5. 구독과 결제" icon={CreditCard}>
        <p>
          요금은 회사 단위 월 기본료와, 포함량을 넘긴 사용량(AI 토큰·저장 공간)에 대한 초과분으로
          이루어집니다. 언제든지 해지할 수 있고, 해지하면 다음 결제부터 청구되지 않습니다. 이미
          결제한 기간은 기간 만료일까지 쓸 수 있습니다.
        </p>
      </DocSection>

      <DocSection title="6. 서비스 변경과 중단" icon={Wrench}>
        <p>
          점검·장애·불가항력으로 서비스가 일시 중단될 수 있습니다. 계획된 점검은 미리 공지하고,
          서비스를 접게 되는 경우 기록을 내려받을 수 있는 기간을 안내합니다.
        </p>
      </DocSection>

      <DocSection title="7. 책임의 한계" icon={ShieldAlert}>
        <p>
          Z는 기록을 안전하게 보관하기 위해 노력하지만, 회사·구성원 사이의 분쟁이나 기록의 내용
          자체에 대해서는 책임지지 않습니다.
        </p>
      </DocSection>

      <DocSection title="8. 약관의 변경" icon={RefreshCw}>
        <p>
          약관이 바뀌면 적용 7일 전에 화면으로 알립니다. 이용자에게 불리한 변경은 30일 전에
          알립니다.
        </p>
      </DocSection>

      <DocSection title="9. 문의" icon={Mail}>
        <p>약관에 관한 문의는 회사의 관리자를 통해 전달해 주세요.</p>
      </DocSection>
    </>
  );
}
