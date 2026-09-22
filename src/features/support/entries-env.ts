import { FAQ_CATEGORY, type FaqEntry } from "./faq";

/**
 * 이용 환경·정책에 대한 답.
 *
 * ⚠️ 근거는 `docs/CONVENTIONS.md`와 **코드의 실제 값**이다. 둘 다에 없는 것은 적지 않는다 —
 *    환불 규정·결제 수단처럼 팀이 안 정한 건 "모른다"로 흘린다(§정직성).
 * ⚠️ 키워드에 **범용어를 넣지 않는다.** "무엇"·"코드"·"어디" 같은 말은 아무 문장에나 들어가
 *    엉뚱한 항목이 걸린다. 못 찾는 건 갈래를 다시 보여 주면 되지만, 틀린 답은 못 되돌린다.
 * ⚠️ 답은 **빈 줄로 문단을 나눈다.** 한 덩어리로 쓰면 말풍선 안이 글 벽이 된다.
 */

export const ENV_ENTRIES: readonly FaqEntry[] = [
  {
    id: "browser",
    category: FAQ_CATEGORY.ENV,
    question: "어떤 브라우저에서 쓸 수 있나요?",
    keywords: ["브라우저", "크롬", "사파리", "chrome", "safari", "엣지", "지원 브라우저"],
    answer:
      "***회의 자막(음성 인식)은 크롬 계열 브라우저에서만 동작합니다.***\n\n사파리나 파이어폭스에서는 자막을 못 쓰고, 대신 화면에서 미리 안내해 드립니다.",
  },
  {
    id: "dark-mode",
    category: FAQ_CATEGORY.ENV,
    question: "다크 모드가 있나요?",
    keywords: ["다크", "어두운", "야간", "dark", "테마", "밝기"],
    answer: "네, **전 페이지**에 있습니다.\n\n상단바 오른쪽 끝 버튼으로 바꿀 수 있습니다.",
  },
  {
    id: "mobile",
    category: FAQ_CATEGORY.ENV,
    question: "모바일에서도 쓸 수 있나요?",
    keywords: ["모바일", "폰", "휴대폰", "아이폰", "안드로이드", "태블릿", "앱"],
    // ⚠️ 반응형 전면 구현은 아직이다 — 되는 척하지 않는다(§정직성)
    answer:
      "지금은 데스크톱 화면을 기준으로 만들어져 있습니다.\n\n***모바일 대응은 준비 중이라***, 당장은 PC에서 쓰시는 걸 권해 드립니다.",
  },
  {
    id: "data",
    category: FAQ_CATEGORY.ENV,
    question: "데이터는 어디에 보관되나요?",
    keywords: ["데이터", "보관", "저장", "서버", "aws", "클라우드", "안전"],
    answer:
      "서버는 **AWS**에서 운영합니다.\n\n어떤 정보를 왜 다루는지는 개인정보처리방침에 적어 뒀습니다.",
    links: [{ label: "개인정보처리방침", href: "/privacy" }],
  },
  {
    id: "mic",
    category: FAQ_CATEGORY.ENV,
    question: "마이크 권한을 꼭 줘야 하나요?",
    keywords: ["마이크", "권한 요청", "허용", "녹음 권한", "차단"],
    answer:
      "회의 자막을 쓰려면 **필요합니다.** 브라우저가 물어보면 허용해 주세요.\n\n거부하셨거나 지원하지 않는 브라우저라면 화면에서 알려 드립니다 — ***조용히 안 되는 채로 두지 않습니다.***",
  },
  {
    id: "account-manage",
    category: FAQ_CATEGORY.ENV,
    question: "계정은 누가 만들고 지우나요?",
    keywords: ["계정 발급", "계정 삭제", "계정은 누가", "탈퇴", "회사가 관리"],
    answer:
      "**회사가 관리합니다.** 계정은 회사 관리자가 발급하고, 한 계정은 하나의 회사에 속합니다.\n\n***개인이 직접 가입하거나 탈퇴하는 구조가 아닙니다.***",
    links: [{ label: "이용약관", href: "/terms" }],
  },
  {
    id: "legal",
    category: FAQ_CATEGORY.ENV,
    question: "약관과 개인정보 처리는 어디서 보나요?",
    keywords: ["약관", "이용약관", "개인정보", "정책", "처리방침", "법적", "동의"],
    answer:
      "**이용약관**과 **개인정보처리방침**을 각각 따로 두고 있습니다.\n\n아래에서 전문을 보실 수 있습니다.",
    links: [
      { label: "이용약관", href: "/terms" },
      { label: "개인정보처리방침", href: "/privacy" },
    ],
  },
  {
    id: "location",
    category: FAQ_CATEGORY.ENV,
    // ⚠️ 질문을 "위치"가 들어가게 적는다 — "어디"만으로 잡으면 "화장실이 어디"까지 걸린다
    question: "회사 위치가 어디인가요?",
    keywords: ["위치", "주소", "오시는", "찾아가", "지도", "사무실"],
    answer:
      "**을지대학교 박애관 421호**에 있습니다.\n\n지도와 대중교통 안내는 오시는 길에서 볼 수 있습니다.",
    links: [{ label: "오시는 길", href: "/location" }],
  },
];
