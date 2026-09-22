# CONVENTIONS.md — Z 프론트엔드 개발 가이드 (팀 공용 · 풀 버전)

> **Z = 회의 기반 지식관리 그룹웨어.** 회의를 캡처(STT·녹음)하면 AI가 요약·결정·액션을 추출해 담당자에게 하달한다.
> 이 문서는 **상세 참고용**이다. 매 세션 자동 로드되는 레포 루트 `CLAUDE.md`는 **린 버전**을 쓰고, 예시·설명이 필요할 때 여기를 본다.
> 팀이 확정한 것·아직 못 정한 것은 `DECISIONS.md`.
>
> 📌 **여기에는 잘 바뀌지 않는 것만 둔다** — 코드 규칙과 화면을 만들 때 지켜야 할 것.
> 화면별 요구사항·업무 정책·역할별 세부 기능은 **팀 명세와 이슈**에 있다. 바뀌는 것을 문서에 복사해 두지 않는다.
> **⚠️ ERD·API 스펙은 아직 없다**(BE 협의 전). 지금은 목 기준이고, 격리막(§19)이 그 교체를 감당한다.

---

## 0. 가장 중요한 원칙 (핵심 4원칙)

1. **서버 우선(Server-First).** 조회 화면은 기본 **Server Component**, `'use client'`는 상호작용이 필요한 **잎사귀(버튼·폼·입력·캡처)** 에만.
2. **데이터 변경(CUD)은 Server Action + BFF.** 브라우저가 백엔드를 직접 부르지 않는다 — **Next 서버가 중계**한다.
   ⚠️ Z에서 이 원칙의 이유는 SEO가 아니라 **권한과 토큰 은폐**다. 사내 도구라 인증이 뚫리면 조직 전체 데이터가 샌다.
3. **정직한 목업 + 3상태.** 목은 지어내지 말고 **API 스펙 success 예시 그대로**. 모든 화면에 **loading / error / empty** 필수.
4. **⚡ 최적화는 기본값 — 처음부터.** 이미지 넣을 때 바로 `next/image`, 폰트는 `next/font`, 무거운 건 `next/dynamic`, 마크업은 시맨틱 태그. **코드를 쓰는 그 순간 적용.**

---

## 1. 프로젝트 개요 & 스택

- **무엇:** 10~50명 성장기 스타트업용 B2B SaaS 그룹웨어. 회의 → 캡처 → AI 요약 → 액션 하달까지가 코어 흐름.
- **슬로건:** "회의를 하면, 조직의 기억이 된다"
- **스택:** Next.js(App Router) · React · TypeScript · **Tailwind + shadcn/ui**.
  데이터 = **Server Component 조회 + Server Action 변경 + BFF + httpOnly 쿠키**. 서버상태 라이브러리 미사용(`DECISIONS.md` B-4).
- **⚠️ 로그인 뒤 사내 도구다.** 공개 페이지가 아니므로 SEO·OG는 대상이 아니다(§14).
- **1440 기준 설계 + 반응형 여지 확보** — 브레이크포인트 작업은 지금 하지 않되, **고정 px·absolute를 쓰지 않는다**(§9). 모바일 대응 화면 선별은 디자인 확정 후.

```bash
npm install
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드 (빈 page.tsx 있으면 실패)
npm run lint
npm run typecheck
```

---

## 2. 디렉터리 구조

```text
src/
├─ app/
│  ├─ (public)/       /  /login  /register  /plans
│  ├─ (onboarding)/   /onboarding/*                  ← OWNER 초기설정
│  ├─ (shell)/        (role)/ · (app)/               ← 사이드바 셸 하나를 공유한다
│  │   ├─ (role)/     /owner  /manage  /team  /my    ← 역할 전용 대시보드·관리
│  │   └─ (app)/      /app/*                         ← 공용 워크벤치(권한 차등)
│  ├─ (gate)/         /subscription                  ← 구독이 끊긴 회사의 재개 화면(셸 밖)
│  ├─ (system)/       /system/*                      ← 확장(데모 제외)
│  ├─ api/[...path]/  BFF 프록시
│  └─ layout.tsx · globals.css · middleware.ts       ← ⚠️ 셸 담당 1인 단독 소유
├─ features/<도메인>/  schemas · types · server · actions · components · *.test
├─ components/  ui/(shadcn 원자) · common/(공용 복합) · domain/
├─ hooks/  lib/  types/  constants/  styles/
└─ mocks/  factories.ts · config.ts(isMock)
```

**규칙**

- `(role)` 하위 4개는 **같은 셸(사이드바 220px)** 을 쓰고 **네비 항목만 역할별로** 다르다 → 레이아웃 1개 + 역할별 네비 구성.
- **관리 화면은 `/manage/*` 한 곳이다**(2026-08-05). 사원 관리·구독·결제는 대표와 Admin 겸직자가 같이 쓰므로
  역할 경로(`/owner/*`)에 두지 않는다 — 주소가 거짓말을 하게 된다. 판정은 `lib/permission.ts` 한 곳.
- `/app/*`은 공용 화면에서 권한만 다르다 → 라우트를 쪼개지 말고 **컴포넌트 레벨 가드**.
- 한 화면에서만 쓰는 컴포넌트는 그 도메인 폴더에, 여러 곳에서 쓰면 `components/common/`.
- **빈(0바이트) 파일은 의도된 스캐폴딩**이다. 단 활성 라우트의 `page.tsx`가 비면 빌드가 실패하므로 빌드 전엔 채운다.

---

## 3. 네이밍 & 컴포넌트 규칙

- **네이밍:** 컴포넌트 `PascalCase` / 함수·변수 `camelCase` / 훅 `use~` / 상수 `UPPER_SNAKE_CASE` / 타입 `PascalCase`.
  boolean은 `is·has·should~`, 핸들러는 `handle~`, 핸들러 prop은 `on~`.
- **컴포넌트:** props 인터페이스 **명시**. `any` 금지 → `unknown` + 타입 가드. **200줄 넘으면 분리.** 로직은 **커스텀 훅**. `enum` 금지 → **`as const`**.
- **원칙:** 일관성 > 개인 취향. 주석은 **"왜"만**. `console.log`·주석 처리된 코드 **커밋 금지**. TODO는 `// TODO: 내용 (담당자)`.

---

## 4. 렌더링 & 데이터 (Server-First + BFF)

- **조회는 Server Component에서** `async/await`. `useEffect`+`useState` 페칭 금지.
  - 렌더링 전략 = `fetch` 옵션: `cache:'force-cache'` / `cache:'no-store'` / `next:{revalidate:N}`.
  - **사내 도구는 대부분 `no-store`** 다(권한별로 결과가 다르고 실시간성이 중요). 공지·조직도처럼 잘 안 변하는 것만 캐시.
- **변경(CUD) = Server Action(`'use server'`) + BFF.** 끝나면 `revalidatePath`.
  - 폼: `useActionState(action, initial)` + 제출 버튼은 `useFormStatus()`의 `pending`으로 비활성화.
  - 파일 업로드(multipart): `fetch`에 **`Content-Type` 직접 넣지 말 것**(§5). `body`에 `FormData` 그대로.
  - `redirect()`는 **`try/catch` 밖**에서.
  - **결과 피드백 = 토스트**(shadcn `sonner`). 단 폼 검증 오류는 **필드 인라인**, 파괴적 작업 확인은 `Dialog`, 페이지 전체 실패는 `error.tsx`다 — 토스트는 사라지므로 **결과는 `revalidatePath` 후 화면에 남아 있어야** 하고 토스트는 보조다. `<Toaster />`는 `app/layout.tsx`에 1개.
- **`'use client'` 최소화:** 경계는 가장 작은 잎사귀에만. 데이터는 Server에서 받아 **props로** 내려주고, client가 server를 `import`하지 말고 **`children`** 으로 합성.
- **인증 = httpOnly 쿠키.** `localStorage` 토큰 저장 **금지**. 서버 axios 인터셉터가 `cookies()`로 토큰을 꺼내 헤더 첨부, 401 → refresh 재발급.
  ⚠️ Z는 **비밀번호 변경·재설정 화면이 없다**(회사 계정 통제). 재발급은 관리자 요청 안내로.
- **라우트 보호:** `middleware.ts`로 1차 차단 + **Server Action·BFF에서 반드시 재검사**(§권한).
- **알림 = SSE.** BFF가 스트림을 중계하며 토큰을 주입한다. 60초 idle 끊김 대비는 서버가 주기 신호를 보내야 한다(FE 단독 불가).
- 라우트마다 `loading.tsx`(Suspense) / `error.tsx`(Error Boundary, `'use client'`+`reset()`).

---

## 5. API 연동 규칙 (이전 프로젝트 시행착오 반영)

- ⛔ **`multipart/form-data`에 `Content-Type` 수동 설정 절대 금지** — boundary 누락으로 요청이 깨진다. `FormData`를 넘기면 런타임이 알아서 붙인다. **회의 녹음 파일 제출**이 여기 해당.
- **목 데이터는 지어내지 말고 API 스펙 success 예시 그대로** — 목·타입·실응답 3자 일치.
- **개발 순서 고정:** 실응답 확인 → 타입 정의 → API 함수 분리(`lib/`) → 목으로 화면 완성 → 실연동 교체.
- **컴포넌트에서 직접 fetch 금지** — `lib/` 래퍼로 일원화, 에러는 인터셉터에서 일괄.
- **모든 화면에 loading / error / empty 3상태 필수.**
- **정직성:** 목·미구현·폴백이면 **주석에 명시**. 안 되는 걸 빈 화면으로 조용히 숨겨 "되는 척" 금지. 없는 필드를 기본값(0·''·false)으로 채워 진짜처럼 렌더 금지 → "미제공/집계 전".

---

## 6. 도메인 상수 (ERD 명칭과 100% 일치)

> 화면엔 한글 라벨, 코드엔 영문 상수. `enum` 금지 → `as const` + 라벨 맵.

```ts
// constants/action.ts
export const ACTION_STATUS = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
} as const;
export type ActionStatus = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS];

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  TODO: "할일",
  IN_PROGRESS: "진행중",
  DONE: "완료",
};
```

⚠️ **`DELAYED`는 상태가 아니다.** 마감 경과로 계산되는 **파생 플래그**다. 상태 필드에 넣으면 `IN_PROGRESS`와 충돌한다.

```ts
export const isDelayed = (a: { status: ActionStatus; dueDate: string }) =>
  a.status !== "DONE" && new Date(a.dueDate) < new Date();
```

- **팀은 계층이 없는 플랫 목록이다**(백엔드 스키마 확정, 2026-08-06 — 이전의 2계층 부서 트리 설계를 대체).
  - **팀 안의 세부 라벨은 별도 테이블(역할)이다.** 사원은 **팀에 소속되고**, 역할은 비워둘 수 있다(=`없음`, 예: 팀장). `roleId` 1="리더"·2="없음"은 전역 시드로 고정된다.
  - **권한은 팀이 아니라 직급에서 온다.** LEADER 직급은 회사에 하나, 그 직급을 가진 사람은 팀마다 정확히 한 명이다(규칙).
  - **LEADER는 자기 팀 전체**를 관리한다(조회·초대·통계·중간승인 전부 그 팀의 모든 역할 포함).
  - ⚠️ 판정은 `lib/permission.ts`의 `isWithinTeamScope` — **`teamId`가 같은지만 비교**한다. `roleId`(팀장 자신의 역할이 "리더"든 "없음"이든)는 범위 판정과 무관하다.
- 코드 문자열은 **ERD 명칭과 100% 일치**(BE와 계약). 값 목록은 ERD 확정 후 `constants/`에 정의한다 — 문서에 옮겨 적지 않는다.

---

### 화면에 안 내보내는 값

설계에 **아예 없는 것**이라, 만들지 않는 것이 규칙이다. 금지 문장만 문서에 두면
"있는데 가리는 것"으로 읽혀서 나중에 누가 만든다.

| 안 만드는 것             | 대신 쓰는 것                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| 내부 식별자 (`GOODS-01`) | 이름 그대로. 링크는 `id`로 걸되 화면에 찍지 않는다               |
| 임의 해시태그 (`#OKR`)   | **프로젝트 태그 하나뿐.** 라벨은 상위 팀 액션·회의 안건이 맡는다 |

> 태그가 여러 종류가 되면 무엇을 눌러야 상위로 가는지 알 수 없어진다 —
> Z의 순환 추적은 **태그 한 종류**를 전제로 한다.

## 7. 권한 — 축이 2개다 ⭐

> Z에서 가장 틀리기 쉬운 부분. **역할 가드만 짜면 안 된다.**

- **① 역할(Role)** — 화면·메뉴 접근. 역할 종류와 역할별 범위는 **팀 명세·`DECISIONS.md`** 를 따른다(정책이라 바뀐다).
- **② 리소스 소유권** — 역할과 **무관**하게 그 문서의 담당자만 조작할 수 있다. 예) 회의 시작·녹음·제출은 그 회의 담당자 1명만 — `OWNER`라도 담당자가 아니면 못 한다.

**지킬 것**

- **화면 숨김은 UX일 뿐 보안이 아니다.** Server Action·BFF에서 **반드시 재검사**한다.
- 권한 판정 로직은 `lib/permission.ts`에 모으고 컴포넌트에 흩뿌리지 않는다.
- 역할 상수를 화면에 하드코딩하지 않는다 — 정책이 바뀌면 한 곳만 고쳐야 한다.

---

## 8. 디자인 토큰 (Notion/Linear 톤 · **CSS 변수**, 하드코딩 금지)

> 🎨 **이 절과 §9는 "값"이다.** 그 값을 **언제 어떻게 고르는지**와 실제로 겪은 함정은
> [`DESIGN.md`](DESIGN.md)에 있다 — 새 화면을 시작하기 전에 그쪽을 먼저 본다.
>
> **다크모드는 전 페이지 적용이다.** 토큰만 쓰면 자동으로 따라오므로, 화면마다 따로 대응하지 않는다.

|         | 라이트                     | 다크                       |
| ------- | -------------------------- | -------------------------- |
| 배경·셸 | `#FFFFFF`                  | `#1A1715`                  |
| 카드    | `#FFFFFF` (보더 `#E7E5E4`) | `#242120` (보더 `#33302D`) |
| 보조면  | 섹션띠 `#FAFAF9`           | `#2E2A28`                  |
| 텍스트  | 기본/보조                  | `#FAFAF9` / `#A8A29E`      |

- **시맨틱:** 액센트 `#3B82F6` · 성공 `#22C55E` · 경고 `#F59E0B` · 에러 `#EF4444`
- **포커스 링(`--ring`)은 먹색**이다. 색으로 알리는 건 **에러(빨강)뿐** — 나머지 상태는 명도·아이콘·문구로 구분한다(DECISIONS 2026-07-31).
- **상태점:** 할일=회색 · 진행중=초록 · 완료=보라 · **지연=빨강**(마감일로 계산, 저장하지 않음)
- `globals.css`에 CSS 변수로 정의하고 Tailwind는 그 변수를 참조한다. 컴포넌트에 생 hex 금지.
- ⚠️ **다크 배경에 순검정(`#000`·`#0C0A09`)을 쓰지 않는다.** 흰 텍스트가 번져 보이고(halation) 층이 사라진다. 다크 최저값은 `#1A1715`.
- **셸 표면:** 사이드바·상단바·본문 `--background` **한 색** · 카드 `--card`.
  라이트는 둘 다 흰색이라 카드를 **얕은 그림자**로 띄운다(`.app-shell .bg-card`).
  ⚠️ 로그인 뒤 워크스페이스에는 **점 그리드를 안 깐다**(2026-08-05 변경). `.bg-dot-grid`는
  랜딩·온보딩·결제에만 쓴다. 바탕을 회색·크림으로 밀지 않는다 — 조각나 보이거나 누렇게
  읽힌다(DECISIONS §셸 표면).
  ⚠️ 예전의 `사이드바 < 배경 < 카드` 명도 3단 규칙은 폐기했다(DECISIONS 2026-08-01 §셸 표면).
- ⚠️ **컴포넌트에서 `dark:` 클래스를 쓰지 않는다.** `dark:`가 필요하다고 느껴지면 십중팔구 토큰을 안 쓴 것이다.
- 테마 전환: `components/common/theme-provider.tsx`(`<html>`에 `.dark` 부착) · `theme-toggle.tsx`(버튼).
- 텍스트 중심 **고밀도** UI — 여백을 넉넉히 주는 소비자 서비스 톤과 반대다.

---

## 9. 레이아웃

- **좌측 사이드바 220px** 고정 + `PageLayout` **4 variant**

| variant    | 폭·구성             | 쓰는 곳              |
| ---------- | ------------------- | -------------------- |
| `list`     | 1440                | 목록 화면            |
| `detail`   | 1440 2컬럼          | 상세(회의·액션·사원) |
| `form`     | 960 (좌 네비 180px) | 설정·작성            |
| `centered` | 560 세로 중앙       | 로그인·온보딩        |

**⚠️ 위 폭은 목표 치수이지 고정값이 아니다.** 반응형 여지를 남기려면 아래를 지킨다 — 비용이 거의 없고, 안 지키면 나중에 전 화면을 뜯는다.

```tsx
❌ w-[1440px]              ✅ mx-auto max-w-[1440px] px-8
❌ absolute top-[64px]     ✅ flex / grid
❌ <table> 단독             ✅ overflow-x-auto 컨테이너로 감싸기
❌ 사이드바를 layout에 직접  ✅ 컴포넌트로 분리 (모바일은 Sheet로 교체)
```

- Tailwind는 **모바일 퍼스트**다. 접두사 없는 스타일을 유연하게 쓰고, 넓은 화면 전용은 `md:`·`lg:`로 얹는다.
- 폼은 **2열(`FormRow`)**, 제출 버튼은 **하단 우측**.
- 로딩은 **스켈레톤**. 모션 100/150/250ms. 숫자는 `tabular-nums`.
- **카피:** **~합니다체**(2026-08-04 변경) · 명령은 `~해 주세요` · 날짜 `8월 5일(화)` · 역할 워딩은 영어(`OWNER`).

---

## 10. Git · PR 규칙

> **이슈 번호가 브랜치·커밋·PR을 잇는 고리다.** 작업 전에 이슈부터 만들고, 그 번호를 셋 모두에 박는다.

- **브랜치:** `feature/{도메인}-{기능}#{이슈번호}` · `fix/{도메인}-{내용}#{이슈번호}` · `docs/{내용}#{이슈번호}`
  예) `feature/meeting-capture#12` · `fix/board-dnd#31` · `docs/conventions-git#40`
  base는 항상 `develop`. `main`은 릴리즈용이라 직접 안 건드린다.
- **커밋:** `type: 제목 #{이슈번호}` — 한글 50자 이내. 예) `feat: 회의 캡처 녹음 버튼 #12`
  type 9종: `feat` · `fix` · `style` · `refactor` · `docs` · `chore` · `test` · `design` · `merge`
- **PR:** 본문에 **무엇·왜·확인방법** + **`Closes #{이슈번호}`**(머지 시 이슈 자동 종료). 리뷰 **1명 승인** 후 머지. 충돌은 올린 사람이 해결.
- ⛔ 금지: `console.log`·주석 코드 커밋, `main`/`develop` 직접 push, `any`, 토큰 `localStorage`.

---

## 11. AI(Claude Code) 작업 지시 규칙

- **단계 분리:** ① 타입/스키마만 → ② API 함수(`lib/`)만 → ③ 화면. (UI 버그와 연동 버그를 섞지 않기)
- **BE에 스펙 요구할 때 체크리스트(구멍 5종):** ①request body 실제 예시 JSON ②multipart 배열 인코딩 ③모호한 필드 타입 ④경로+HTTP 메서드 ⑤인증 방식(쿠키 자동 vs 헤더)
- 연동은 **BE 실코드/실응답으로 검증**, 못 했으면 "가정 shape·미검증" 주석.

**모델 특성 대응 (Claude Opus 5 기준)**

1. **간결하게.** 답변·문서·주석 군더더기 없이. (길이는 프롬프트로만 줄어든다 — 노력 단계로는 안 줄어듦)
2. **요청한 범위만.** 안 시킨 리팩터·추가 파일 금지. 애매하면 **한 줄 묻고 진행**.
3. **"다시 확인해" 지시 금지** — 알아서 검증하므로 중복이다. 단 **성공 기준**(스키마·필수 필드·§21)은 명세이므로 유지.
4. **서브에이전트 위임은 크고 독립적인 작업만.** 검증용 위임 금지.
5. **코드리뷰에 "고위험만/보수적으로" 금지** — 전부 보고시키고 필터는 별도 단계.

---

## 12. 디자인 시안 → 코드 변환 (시안 = 원자재)

> 시안에서 뽑은 CSS는 **그대로 붙여넣지 않는다.** 아래 ①②③ 기준으로 정리해서 구현한다.

- **① 구조:** `position:absolute`+고정 px → **flex/grid**. 1440 기준이라도 고정 px으로 박으면 반응형 여지가 사라진다(§9).
- **② 스타일:** 생 hex·임의값(`w-[327px]`) → **CSS 변수 토큰(§8)·Tailwind 스케일**.
- **③ 시맨틱·최적화:** `<div>`→시맨틱 태그 / `<img>`→`next/image` / 반복 블록→컴포넌트 추출.
- **아이콘:** 표준 UI=`lucide-react` / 브랜드·커스텀=SVGR 컴포넌트(`currentColor`). ❌ 이모지 · ❌ `<img src=".svg">`
- 피그마의 커스텀 UI는 **초안**이다. `components/ui`(shadcn)로 치환 가능한 건 치환한다.

---

## 13. 성능

- **목표:** INP < 200ms · CLS < 0.1 · First Load JS < 200KB. 측정은 **프로덕션 빌드(`build && start`)** 기준.
- **이미지:** `<img>` 금지 → `next/image`. `fill` 시 부모 `relative`+`sizes` 필수. `alt` 필수(장식은 `""`).
- **폰트:** `next/font`(빌드타임 self-host, CLS 0). `display:'swap'`.
- **번들:** 무거운 것(차트·에디터·캘린더·**STT/녹음**)은 `next/dynamic`. tree-shaking은 개별 import. moment 금지 → date-fns/dayjs.
- **고밀도 목록(액션·회의·사원)은 한 번에 다 그리지 않는다** — 다음 페이지는 스크롤로 이어 붙인다(CLAUDE.md §목록·페이지네이션). 수백 행을 넘어가면 그때 가상화를 검토한다(미리 하지 않는다).

---

## 14. SEO — 대상 아님

- **로그인 뒤 사내 도구다.** OG·sitemap·구조화 데이터 **불필요**, `app/robots.ts`는 **noindex**.
- 다만 아래는 **a11y·품질 이유로 그대로 지킨다:**
  - 시맨틱 태그(`header/nav/main/section`), **`<h1>` 페이지당 1개**
  - 이동은 `<a>`/`<Link>`(button+`router.push` 지양)
  - `alt`·의미 있는 파일명
- 예외: 랜딩 `/`·요금제 `/plans`는 공개 마케팅 페이지라 **여기만 metadata·OG를 붙인다.**

---

## 15. 브라우저 API — 캡처 화면 ⚠️

- **STT = `webkitSpeechRecognition`.** 표준 API가 아니고 **Chrome 계열 전용**이다.
  - `'use client'` + `next/dynamic(ssr:false)` 필수.
  - **미지원 브라우저는 안내를 띄운다.** 조용히 안 되는 척 금지(§0-3).
  - 권한 거부·중단·네트워크 끊김을 각각 처리한다(무한 재시도 금지).
- **녹음(MediaRecorder):** 마이크 권한 거부 상태를 명시적으로 표시. 제출은 multipart(§5).
- 자막↔메모 **1:1 대응** 구조를 유지한다.

---

## 16. 테스트

- **작성 시점(계층별 — "마지막에 몰아서" 금지):**
  - **유틸·로직·매퍼(순수함수) = 짜자마자.** 권한 판정·상태 전이·`isDelayed`·날짜 파싱은 함수와 동시에.
  - **컴포넌트(RTL) = 목으로 동작 확정된 직후.** 핵심 위주(회의 캡처 흐름·액션 보드·권한 분기), 단순 표시 컴포넌트는 생략.
  - **E2E(Playwright) = 실 BE 연동 후.** 핵심 시나리오만(회의 개설→캡처→AI검토→분배).
- **레벨:** 정적(TS·ESLint) → 단위(Jest) → 통합(RTL) → E2E(Playwright).
- **환경:** `next/jest` · jsdom · `moduleNameMapper` `@/` · `jest.setup.ts`에 `@testing-library/jest-dom`.
- **RTL:** 사용자가 보는 DOM 검증. **AAA**. 쿼리 우선순위 `getByRole > getByLabelText > getByText > getByTestId(최후)`. 이벤트는 `user-event`.
- **권한 테스트를 반드시 넣는다** — 역할별로 보이는 게 다른 서비스라, 권한 회귀가 제일 위험하다.
- **Mock:** 외부 의존만. 목=스펙 예시 그대로(§5).

---

## 17. 배포 · 환경변수 · CI/CD

- **환경변수:** `NEXT_PUBLIC_` = **빌드 시 번들에 박혀 브라우저 노출** → 시크릿 절대 금지. 값을 바꾸면 **재배포(재빌드)** 해야 반영된다.
- **배포 전:** 로컬 `npm run build && npm start`로 프로덕션 검증. `package-lock.json` 커밋 필수.
- **배포 = AWS**(서비스 미정 — Amplify / ECS·Fargate / EC2). `DECISIONS.md` 참고.
  - ⚠️ **정적 배포(S3+CloudFront 단독)는 불가.** Server Action·BFF 프록시·httpOnly 쿠키·SSE가 **Node 서버**를 요구한다. `next export` 전제로 코드를 짜지 않는다.
  - 컨테이너로 간다면 `next.config.ts`에 `output: 'standalone'`이 필요하다(Amplify는 불필요).
  - ⚠️ **AWS 고유 값을 코드에 박지 않는다.** 리전·버킷·엔드포인트는 전부 환경변수로.
- **CI:** GitHub Actions(`.github/workflows/ci.yml`). PR마다 `typecheck·lint·test·build` 4종이 `verify` 체크 하나로 묶여 돌고, 전부 통과해야 머지된다.

---

## 18. AI 기능 연동

- **아키텍처:** 모델 키 프론트 노출 금지 → **서버 프록시**(Server Action 또는 BFF)가 키·호출 담당, 프론트는 **UX(로딩·스트리밍·포맷팅)**.
- **스트리밍(SSE):** LLM 응답은 한 번에 기다리지 말고 점진 렌더.
- **마크다운:** `react-markdown` + `remark-gfm` + **`rehype-sanitize`(XSS 방어 필수)**. Tailwind면 `@tailwindcss/typography`.
- **Z의 AI 2종:** ①회의 요약(3줄·핵심 결정·액션 아이템) ②액션 분배.
  ⚠️ **"프로젝트 자동 매칭"은 없다**(2026-08-16 확정 — WORKFLOW.md에 없고 구현도 없다). 프로젝트는 사람이 필수로 고른다.
- ⚠️ **AI가 아닌 것을 AI라 부르지 않는다** — STT는 브라우저 기능, 인수인계 자동취합은 규칙 기반이다. 화면 카피·문서·발표 모두 동일.
- ⚠️ **데모는 목이다**(실 모델 미선정). 목이면 주석과 화면에 명시한다.

---

## 19. Mock → Live 격리막

```text
컴포넌트 ──props── UI계약 타입(types.ts) 에만 의존
     ▲
server.ts / actions.ts ── isMock 분기:  mock → mocks/*  |  live → serverApi(BFF)
     └ 매퍼: BE 응답 shape → UI 계약으로 흡수 (zod safeParse로 런타임 검증)
```

- **컴포넌트는 UI 계약 타입만 안다.** BE가 뭘 주든 매퍼가 흡수 → 연동 시 **server·actions·매퍼만 수정, 컴포넌트 0줄.**
- ⚠️ **Z는 ERD·API가 아직 없다.** 목으로 먼저 가고 나중에 교체하는 구조라, 이 격리막이 **선택이 아니라 전제**다.
- BE shape ≠ UI 계약(필드명·중첩 다름)이 정상. 컴포넌트에 BE 필드명 직접 노출 금지.

---

## 20. 컴포넌트 위생 · a11y

- **만들기 전 재사용 확인(매번):** `components/ui`(shadcn 원자) → `components/common`(공용 복합) → 같은 도메인. 있으면 **props로 유연화**, 없을 때만 신규.
- **a11y(RTL `getByRole`와 직결):** input=`<label htmlFor>` / 버튼=명확한 이름·`aria-label` / 이미지=`alt` / 모달=`role="dialog"`+포커스 / 클릭은 `<div onClick>` 말고 **`<button>`·`<a>`**.
- **DnD 보드는 키보드 대체 경로 필수.** 드래그로만 조작 가능하면 접근이 불가능하다.
- **실시간 자막 영역은 `aria-live`** 로 스크린리더에 변화를 알린다.

---

## 21. 연동 검증 — 두 단계다

### ① 담당자 도메인 문서로 정합성부터 맞춘다

BE는 **도메인별로 담당자가 문서를 따로 관리**한다. 화면을 짜기 전에 그 도메인 문서를 받아
정책 · Enum 이름·값 · 에러코드를 맞춘다. 문서에 없으면 물어보고, 답을 받으면 **그 자리에 근거를 남긴다**
(`// 2026-08-05 billing 담당 확인`). 근거 없이 맞춘 값은 나중에 왜 그런지 아무도 모른다.

| 우리 코드                              | BE 도메인 | 받아야 하는 것                                     |
| -------------------------------------- | --------- | -------------------------------------------------- |
| `features/billing/*`                   | billing   | 구독 상태 전이 · 결제 실패 코드 · 초과분 청구 시점 |
| `features/onboarding/*`                | company   | 온보딩 커밋 엔드포인트 · 계정 생성/메일 순서       |
| `features/shell/viewer` · `permission` | identity  | 세션 응답 필드(`isAdmin` · `departmentId`)         |
| `constants/domain.ts`                  | 각 도메인 | Enum 이름·값 — 지금은 추정으로 맞춰 둔 것이 있다   |

### ② 구현할 때 BE 레포 실코드로 재확인한다

- **컨트롤러·DTO를 직접 확인**: 실제 **경로 · HTTP 메서드 · 요청 바디 · 응답 shape.**
- ⚠️ **문서와 코드가 다르면 코드가 맞다.** 문서는 합의된 규약이지 배포된 스펙이 아니다.
- ⚠️ **Swagger·구두 설명 추측 금지** — 실코드와 다른 경우가 잦다. 둘 다 못 하면 "가정 shape·미검증" 주석.
- 실패(4xx/5xx)는 빈 화면으로 숨기지 말고 throw → `error.tsx`.

---

## 22. ⚠️[팀확정] 미결정

`DECISIONS.md`를 본다. **여기에 목록을 복사해 두지 않는다** — 두 벌이 되면 어긋난다.
