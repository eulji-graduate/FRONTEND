# Z

**회의를 하면, 조직의 기억이 된다.**

회의를 녹음·자막으로 캡처하면 AI가 요약과 결정사항, 액션 아이템을 뽑아 담당자에게 자동으로 전달하는 사내 그룹웨어입니다. 여기서 만들어진 액션은 보드·타임라인·인수인계서까지 하나의 흐름으로 이어져, 회의에서 나온 말이 조직의 실행과 기억으로 남습니다.

10~50명 규모 성장기 스타트업을 대상으로 합니다.

<br>

## 서비스 흐름

회의 예약부터 인수인계까지 하나의 파이프라인으로 이어집니다.

```
[회의 예약]
    │
    ▼
[회의 캡처]  ──  브라우저 녹음 + 실시간 자막(STT) + 자막·메모 1:1 매핑
    │
    ▼
[AI 분석]    ──  3줄 요약 · 결정사항 · 액션 아이템(담당자·마감일) 초안
    │
    ▼
[액션 분배 검토]  ──  회의 담당자(Host)가 초안 확인·수정 후 [분배 확정]
    │
    ▼
[액션 관리]      ──  담당자별 보드(3열 칸반)·프로젝트 타임라인·마이페이지
    │
    ▼
[인수인계]       ──  휴가·오프보딩 시 담당 액션 자동 취합
```

- **회의 예약** — `/app/rooms`에서 회의실 예약이 곧 회의 개설입니다 (30분 단위 한 타임 · 대면·비대면 지원)
- **회의 캡처** — 브라우저에서 녹음 + `webkitSpeechRecognition` 기반 실시간 자막. 자막 옆에 메모를 1:1로 붙일 수 있습니다
- **AI 정리** — 3줄 요약 · 결정사항 · 액션 아이템(담당자·마감일이 채워진 초안)을 추출합니다
- **검토·확정** — 회의 담당자가 초안을 확인·수정한 뒤 [액션 분배 확정]을 눌러야 실제 액션이 생성됩니다 (반려된 항목은 안 생김)
- **액션 관리** — 3열 칸반(할일·진행중·완료) 보드와 프로젝트 타임라인에서 진행 상황을 관리합니다. 지연은 저장값이 아니라 마감일로 자동 계산됩니다
- **인수인계** — 휴가·오프보딩 시 담당 액션이 자동으로 취합돼 인수인계서 초안이 만들어집니다

<br>

## 역할별 진입

로그인하면 역할별로 시작 화면이 다릅니다. 화면은 **같은 셸**(사이드바 220px + 상단바)을 쓰되 네비 항목만 갈립니다 — 겸직자에게 URL이 거짓말하지 않도록 관리 기능은 `/manage/*` 하나로 모았습니다.

| 역할              | 시작 화면          | 주요 화면                                          |
| ----------------- | ------------------ | -------------------------------------------------- |
| **대표(Owner)**   | `/owner` 대시보드  | 기업 설정 · 팀장 오프보딩 인수인계 · 프로젝트 개설 |
| **관리자(admin)** | 본인 역할 대시보드 | `/manage/*` — 사원·회의실·구독·저장소 관리         |
| **팀장(Leader)**  | `/team` 대시보드   | 팀원 관리 · 팀 액션 · 팀 내 인수인계               |
| **사원(Member)**  | `/my` 대시보드     | 내 액션 · 개인 화면                                |

모든 역할이 공통으로 사용하는 워크벤치(`/app/*`)에서 회의·액션·프로젝트·인수인계·공지 등 대부분의 실무 화면이 열립니다.

<br>

## 이런 문제를 풉니다

- **회의는 매주 하는데 기록은 남지 않습니다.** 결정 사항을 각자 다르게 기억하고, 하기로 한 일은 회의록 어딘가에 묻힙니다
- **액션이 사람 사이에서 잃어버려집니다.** 누가 언제까지 뭘 할지 흩어져 있어 지연이 나서야 알아챕니다
- **인수인계 시 담당 액션이 어디 있는지 모릅니다.** 휴가·퇴직 앞에서 담당 업무를 다시 수집해야 합니다

Z는 이 흐름을 회의 → AI 분석 → 액션 분배 → 관리 → 인수인계 파이프라인 하나로 잇습니다.

<br>

## 기술 스택

| 구분       | 사용                                                                          |
| ---------- | ----------------------------------------------------------------------------- |
| 프레임워크 | Next.js 16 (App Router) · React 19                                            |
| 언어       | TypeScript (`strict` + `noUncheckedIndexedAccess`)                            |
| 스타일     | Tailwind CSS v4 · shadcn/ui · CSS 변수 토큰 (라이트·다크 동시 정의)           |
| 데이터     | Server Component 조회 · Server Action 변경(22곳) · BFF 프록시                 |
| 인증       | httpOnly 쿠키 (토큰을 브라우저에 두지 않습니다) · `middleware.ts` 라우트 가드 |
| 최적화     | `next/dynamic` 지연 로드 · `next/image` · `next/font`                         |
| 테스트     | Jest · React Testing Library · `next/jest` · jsdom (1,555개 · 100% 통과)      |
| 실시간     | SSE (알림 스트림) · `webkitSpeechRecognition` (STT · 캡처 전용)               |

1440px 데스크톱을 기준으로 설계했습니다. 로그인 뒤에만 쓰는 사내 도구라 SEO는 범위에 넣지 않았고, 반응형은 고정 px과 absolute를 쓰지 않는 방식으로 여지만 남겨뒀습니다.

<br>

## 시작하기

```bash
npm install     # git 훅도 함께 설치됩니다
npm run dev     # http://localhost:3000
```

올리기 전에 아래 네 개를 돌려보면 CI에서 막히는 일이 줄어듭니다.

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

PR을 열면 이 네 가지가 `verify` 체크 하나로 묶여 실행되고, 하나라도 실패하면 머지할 수 없습니다.

<br>

## 프로젝트 구조

```
src/
├─ app/
│  ├─ (public)/          로그인 전 — 랜딩 · 로그인 · 기업등록 · 초대
│  ├─ (onboarding)/      대표 초기설정 4단계 (결제가 개통 관문)
│  ├─ (shell)/           로그인 후 공용 셸 — 사이드바 · 상단바 · 알림 프로바이더
│  │  ├─ (authority)/    권한별 대시보드 (owner · manage · team · my)
│  │  └─ app/            공용 워크벤치 — 회의 · 액션 · 프로젝트 · 인수인계 등
│  ├─ (gate)/            구독이 끊긴 회사의 재개 화면
│  ├─ (dev)/             개발용 화면 (프로덕션 노출 X)
│  ├─ (system)/          목업/시연용
│  └─ api/[...path]/     BFF 프록시 · SSE 릴레이
├─ features/<도메인>/    27개 도메인 — 각자 소유
│  ├─ types.ts           UI 계약
│  ├─ mapper.ts          BE shape → UI 계약
│  ├─ server.ts          Server Component 조회 · isMock 분기
│  ├─ actions.ts         Server Action · revalidatePath
│  ├─ components/        도메인 컴포넌트 (필요할 때만 `"use client"`)
│  └─ *.test.ts(x)       매퍼·유틸 단위 테스트
├─ components/
│  ├─ ui/                shadcn 프리미티브
│  ├─ common/            테마·아바타·에러 등 앱 공용
│  └─ domain/            여러 도메인이 공유하는 컴포넌트
├─ hooks/                커스텀 훅 (무한 스크롤 등)
├─ constants/            도메인 상수 + 한글 라벨 (`as const` + 라벨맵)
├─ mocks/                Mock → Live 격리막 (`isMock` 분기 시 사용)
├─ types/                전역 타입
├─ styles/               Tailwind 진입점 + 토큰 정의
└─ lib/
   ├─ permission.ts      권한 판정 (`import "server-only"` — 서버 전용 강제)
   ├─ endpoints.ts       BE API 경로 정본
   └─ api.ts             `serverApi` — 봉투 벗기기 · 타임아웃 · 에러 매핑
```

**27개 features 도메인**: `action` · `appearance` · `auth` · `billing` · `board` · `calendar` · `company` · `handover` · `landing` · `leader-handover` · `legal` · `meeting` · `member` · `notice` · `notification` · `onboarding` · `owner` · `profile` · `project` · `rooms` · `search` · `shell` · `storage` · `support` · `system` · `team` · `team-handover`

<br>

## 설계에서 신경 쓴 것

**권한을 두 축으로 나눴습니다.** 역할(대표·관리자·팀장·사원)만으로는 부족합니다. 회의를 시작하고 녹음하고 종료하는 건 그 회의 담당자 한 명만 할 수 있어야 하고, 대표라도 담당자가 아니면 못 해야 합니다. 그래서 역할과 리소스 소유권을 따로 검사하고, 화면에서 버튼을 숨기는 것과 별개로 서버에서 다시 확인합니다. 판정은 `lib/permission.ts`에 `import "server-only"`로 잠가 두어 클라이언트에서 import하면 빌드 자체가 실패합니다.

**조회는 서버 컴포넌트, 조작만 클라이언트.** `app/` 아래 모든 `page.tsx`가 Server Component입니다(`'use client'` 페이지 0개). 조회는 `async/await`로 서버에서 직접 fetch하고, 변경(CUD)은 22개의 Server Action이 BE를 호출한 뒤 `revalidatePath`로 서버 기준을 다시 확정합니다. 토큰은 httpOnly 쿠키로만 다뤄 브라우저 JS가 접근할 수 없습니다.

**무거운 라이브러리는 처음부터 지연 로드.** three.js(랜딩 3D)·MarkdownEditor(공지)·`react-big-calendar`(캘린더)·Recharts(대시보드)·STT(캡처) 등 14곳에 `next/dynamic({ ssr: false })`를 적용했습니다. 이미지 `next/image`, 폰트 `next/font`도 쓰는 순간 적용합니다.

**색을 코드에 박지 않았습니다.** 모든 색은 CSS 변수로 정의하고 컴포넌트는 토큰만 참조합니다. 덕분에 다크모드가 전 페이지에 한 번에 적용됩니다.

**Mock → Live 격리막.** 컴포넌트는 `types.ts`의 UI 계약만 보고, `server.ts`·`actions.ts`가 `isMock` 분기로 목업과 실서버를 갈라줍니다. BE shape는 `mapper.ts`에서 UI 계약으로 흡수하므로 연동 시 컴포넌트를 건드릴 필요가 없습니다.

**반응형은 여지만 남겼습니다.** 1440 기준으로 만들지만 고정 px과 absolute를 쓰지 않습니다. 지금 전 화면 반응형을 하지 않는 이유는, 캡처 화면처럼 자막과 메모를 나란히 봐야 하는 구조는 좁은 화면에서 축소가 아니라 재설계가 필요해서입니다. 대상 화면은 디자인이 확정된 뒤에 고릅니다.

**짜자마자 테스트.** 로직·매퍼는 짜자마자 Jest 단위 테스트를, 화면은 mock이 확정된 뒤 React Testing Library로 렌더링 검증을 붙입니다. RTL은 `getByRole`을 우선 써서 접근성 트리를 그대로 검증 대상으로 삼습니다. 현재 1,555개 테스트 · 151개 스위트가 통과 상태로 유지됩니다.

**커밋 단계에서 걸러냅니다.** 커밋할 때 포맷과 린트가 자동으로 돌고, 푸시할 때 타입을 검사합니다. `any`와 `console.log`는 통과하지 못합니다.

<br>

## 작업 흐름

```
이슈 → 브랜치 → 커밋 → PR → 리뷰 → 머지
```

이슈 번호가 브랜치·커밋·PR을 잇습니다.

```bash
feature/meeting-capture#12          # 브랜치 (base: develop)
feat: 회의 캡처 녹음 버튼 #12        # 커밋
Closes #12                          # PR 본문
```

`main`은 릴리즈용이라 건드리지 않습니다. 본인 PR을 본인이 머지하지 않고, 리뷰 한 명을 받습니다.

<br>

## 문서

| 문서                                         | 언제 보나                            |
| -------------------------------------------- | ------------------------------------ |
| [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) | 코드 쓰다 막힐 때 — 상세 규칙과 예시 |
| [docs/WORKFLOW.md](./docs/WORKFLOW.md)       | 화면별 동작·라벨·예외 — 팀 정본      |
| [docs/DESIGN.md](./docs/DESIGN.md)           | 언제 어떤 값을 고르는지 — 폭·표면·색 |
| [DECISIONS.md](./DECISIONS.md)               | 팀이 정한 것과 아직 안 정한 것       |
| [CLAUDE.md](./CLAUDE.md)                     | 규칙 요약 (AI 협업용)                |

처음 합류했다면 팀에서 공유한 가이드북을 먼저 읽어주세요.

<br>

---

공개 저장소입니다. `.env` 실제 값과 토큰은 커밋하지 마세요.
