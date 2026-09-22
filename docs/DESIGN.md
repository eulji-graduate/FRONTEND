# DESIGN.md — 화면 만드는 법

> 📐 **화면끼리 생김새를 맞추려고 만든 규격서다.**
> 폭·간격·글자 크기 같은 건 정답이 있는 게 아니라 **하나로 정해 두는 편이 나은** 것들이라,
> 매번 새로 고민하지 않아도 되게 값을 박아 뒀다. 여기 있는 대로 쓰면 기존 화면과 같은 결이 나온다.
>
> 기준은 이미 만들어 둔 **구독**(`/manage/billing`)과 **저장소 관리**(`/manage/storage`)다 —
> 두 화면의 골격을 그대로 옮겨 적었으니 **§1을 복사해서 시작하면 된다.**
>
> 여기에 없는 상황이거나 규칙이 어색하면 **바꾸자고 이야기해 주세요.** 문서를 고치는 게
> 화면이 갈리는 것보다 낫다.
>
> | 문서                                     | 무엇이 있나                                |
> | ---------------------------------------- | ------------------------------------------ |
> | 여기                                     | **어떻게 만드는지** — 골격·값·규칙         |
> | [`WORKFLOW.md`](WORKFLOW.md)             | **무엇을 만드는지** — 화면별 요구사항·라벨 |
> | [`CONVENTIONS.md`](CONVENTIONS.md) §8·§9 | 토큰 값 (정본) · PageLayout 4종            |
> | [`../DECISIONS.md`](../DECISIONS.md)     | 왜 그렇게 정했는지                         |

---

## 1. 화면 골격 — 그대로 베낀다

### 파일 셋

```tsx
// page.tsx — 조회는 여기서. Server Component다
export default async function Page() {
  const [data, config, viewer] = await Promise.all([getData(), getConfig(), getViewer()]);
  return <View data={data} config={config} canManage={canX(viewer)} />;
}

// layout.tsx — 상단바는 여기서 그린다
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="저장소 관리" icon={HardDrive} />
      {children}
    </>
  );
}
```

⚠️ **상단바에 버튼을 두지 않는다.** 액션은 카드 안에 둔다.

### 본문 — 스크롤·폭은 여기서 한 번만

```tsx
<div className="flex-1 overflow-y-auto px-8 py-7">
  <div className="mx-auto w-full max-w-[1440px]">
    <div className="flex flex-col gap-7">
      <SummaryCard /> {/* 1. 요약 — 지금 어떤 상태인가 */}
      <DetailTable /> {/* 2. 내역 — 무엇 때문인가 */}
    </div>
  </div>
</div>
```

⚠️ **위에서 아래로 "지금 상태 → 그 근거 → 조작" 순서**로 쌓는다.
되돌릴 수 없는 조작(해지 등)은 맨 아래에 둔다.
카드를 늘리기 전에 **위 카드에 들어갈 수 있는지** 먼저 본다.

### 전폭 카드는 셋까지 — 넘으면 두 칸으로 나눈다 ⭐

전폭 카드를 넷 이상 쌓으면 **별거 없는데 스크롤만 긴 화면**이 된다.
구독이 그랬다 — 카드 다섯 장(플랜 → 사용량 → 결제 수단 → 결제 내역 → 해지)을 세로로 쌓았는데
결제 수단과 해지는 내용이 **한 줄**이라, 그 줄만 1440을 가로지르고 옆이 텅 비었다.
저장소가 안 그런 건 카드가 둘이고 그중 하나가 **표**라서 1440을 실제로 채우기 때문이다.

**기준은 카드 수가 아니라 "1440을 채우는가"다.** 표·막대·긴 글은 채우고, 값 두어 개는 못 채운다.

```tsx
<div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
  <div className="flex min-w-0 flex-col gap-7">
    <UsagePanel /> {/* 읽을 게 많은 것 — 주 컬럼 */}
    <HistoryTable />
  </div>
  <div className="flex flex-col gap-7">
    <PlanCard /> {/* 값 두어 개짜리 — 곁 컬럼 */}
    <PaymentMethod />
    <CancelCard />
  </div>
</div>
```

- **곁 컬럼은 360px 고정**이다. `1fr 1fr`로 반씩 나누면 표가 좁아져 열이 찌그러진다.
- **`items-start`를 쓰지 않는다.** 그러면 곁 컬럼이 내용만큼만 서서 오른쪽 아래가 휑하다.
  남는 높이는 **한 카드가 `flex-1`로 먹는다** — 그 안의 줄이 넉넉해질 뿐 빈 칸이 안 생긴다.
- **좁아지면 한 줄로 돌아간다**(`lg:` 아래). 주 컬럼이 먼저 오게 순서를 그대로 둔다.

⚠️ **곁 컬럼으로 옮기는 카드는 안쪽도 다시 짠다.** 1440에서 쓰던 3열 지표 격자를 360px에
그대로 넣으면 `2026년 9월 1일(화)`이 네 줄로 접혀 카드가 무너진다 — 좁은 칸에서는
**라벨 왼쪽 · 값 오른쪽 한 줄**이고 값에 `whitespace-nowrap`을 건다.

---

## 2. 카드

```tsx
<section className="border-border bg-card rounded-2xl border">
  {/* 표가 들어가면 overflow-hidden 을 더한다 */}

  <div className="flex items-baseline justify-between gap-3 px-7 pt-6 pb-3">
    <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">프로젝트별 사용량</h2>
    <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">전체 5개</p>
  </div>

  {/* 본문 */}
</section>
```

- **카드 제목 앞에 점을 붙이지 않는다**(2026-08-11 변경). 전에는 먹색 `size-2` 점을 모든 카드
  머리에 붙였는데, **상태점과 크기·모양이 같아** 뜻이 있는 표식처럼 읽혔다 — 색으로 뜻을
  나르는 자리는 상태점 하나뿐이라(§5) 그 값이 떨어진다. 17px 굵은 제목이면 머리로 충분하다.
- **오른쪽 끝에 보조 정보 한 줄** — 전체 건수·주기 범위. 버튼은 안 둔다.
- **제목과 안내 문구 사이에 선을 긋지 않는다.** 한 덩어리다. 카드 안의 선은 **표가 시작하는 자리** 하나뿐.

### 요약 카드 — 세 칸 균등

```tsx
<div className="grid gap-6 pt-6 lg:grid-cols-3 lg:items-center lg:gap-0">
  <div className="flex flex-col items-center gap-3 lg:px-4">…</div>
  <div className="border-border lg:border-l lg:px-6 …">…</div>
  <div className="border-border lg:border-l lg:px-6 …">…</div>
</div>
```

- 칸은 **세로선으로만** 가른다. 카드 안에 카드를 얹지 않는다.
- 칸마다 구조가 같다 — `작은 라벨 → 큰 값 → 보조 문구`.
- 좁아지면 세로로 쌓는다(세로선은 `lg:`에서만).
- **`flex-1`을 쓰지 않는다.** 늘어난 칸 안에서 내용이 왼쪽에 몰려 오른쪽만 빈다.

### 라벨·값 한 쌍

```tsx
<dt className="text-muted-foreground text-[12px] leading-4">월 기본료</dt>
<dd className="pt-1.5 text-[20px] leading-7 font-semibold tracking-[-0.4px] tabular-nums">₩150,000</dd>
<p className="text-muted-foreground/70 pt-0.5 text-[11px] leading-4">보조 설명</p>
```

### 안내 배너

```tsx
<p className="border-border bg-secondary mt-5 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-[12px] leading-[18px] break-keep">
  <span className="flex h-[18px] shrink-0 items-center">
    {" "}
    {/* 첫 줄 높이 상자 */}
    <Info className="text-muted-foreground size-3.5" aria-hidden />
  </span>
  <span>저장 공간 사용량이 80%를 넘었습니다. …</span>
</p>
```

- **아이콘은 첫 줄 높이(`h-[18px]`) 상자에 넣어 가운데** 맞춘다. `mt-px`로 눈대중하면 뜬다.
- 부모에 `items-center`를 주면 안 된다 — 두 줄이 되는 순간 아이콘이 가운데로 내려간다.
- 경고는 **표식만**, 색은 안 쓴다. 실제로 넘긴 뒤에만 빨강(`border-destructive/30 bg-destructive/5`).

---

## 3. 표

```tsx
<div className="border-border overflow-x-auto border-t">
  <table className="w-full min-w-[760px] table-fixed text-[13px]">
    <colgroup>
      <col className="w-[26%]" /> {/* 폭은 % 로 — px로 고정하면 첫 열이 남는 폭을 다 먹는다 */}
      <col className="w-[11%]" />
    </colgroup>
    <thead>
      <tr className="text-muted-foreground bg-secondary/50 border-border border-b text-[12px] leading-4">
        <th className="px-6 py-3 text-left font-normal">프로젝트</th> {/* 이름만 왼쪽 */}
        <th className="px-4 py-3 text-center font-normal">상태</th> {/* 나머지 가운데 */}
      </tr>
    </thead>
    <tbody>
      <tr className="group border-border hover:bg-foreground/[0.04] transition-colors not-first:border-t">
        …
      </tr>
    </tbody>
  </table>
</div>
```

- **머리에 섹션 띠**(`bg-secondary/50`) — 보더만으로는 머리와 본문이 같은 면으로 읽힌다.
- **줄 강조는 `hover:bg-foreground/[0.04]`** 다. `--secondary`는 흰 카드와 2%밖에 차이가 없다.
- **이름 열만 왼쪽**, 나머지 가운데. 이름은 길이가 제각각이라 가운데로 모으면 왼쪽 끝이 들쭉날쭉해진다.

### 열마다 축이 따로 선다 ⭐

**여기가 제일 놓치기 쉽다.** 묶음을 통째로 가운데 두면 안 된다 — 안에 든 글자 길이가
다르면 그 줄만 밀린다.

```tsx
❌ <span className="flex justify-center gap-2">{dot}{label}</span>
   // 진행중(3자) · 완료(2자) → 점이 줄마다 좌우로 밀린다

✅ <span className="mx-auto flex w-fit gap-2">
     {dot}
     <span className="w-[42px] text-center">{label}</span>   {/* 상자 폭 고정 */}
   </span>
   // 점은 점끼리, 글자는 가운데끼리 각각 한 세로선에 선다
```

숫자도 같다 — `10.9GB`(4자리)와 `9.1GB`(3자리)가 섞이면 **상자 폭을 고정하고 오른쪽 정렬**한다.

```tsx
<span className="w-[58px] shrink-0 text-right tabular-nums">{formatGb(gb)}</span>
```

### 조작은 키가 같다 ⭐

입력칸 · 셀렉트 · 날짜 칸 · 아이콘 버튼은 **모두 32px**이다. 한 줄에 섞여 서는 것들이라
하나만 40이면 그 줄의 중앙이 어긋난다 — 공용 컴포넌트(`Input`·`SelectTrigger`·
`DatePickerField`·`Button`)가 이미 32로 맞춰져 있으니 화면에서 높이를 덧칠하지 않는다.

### 선은 한 번만 긋는다 ⭐

**같은 자리에 선이 두 번 그이면 그 줄만 2px로 진해진다.** 머리에 `border-b`가 있으면
첫 줄에는 `border-t`를 안 준다(`not-first:border-t`). 카드 맨 아래 줄도 카드 테두리와
겹치므로 아랫선을 안 긋는다. 라이브러리(react-big-calendar 등)는 자기 기본 선을 따로
그으므로 **한쪽을 지우고 하나만 남긴다.**

### 그 밖에

- **아이콘만 있는 열에도 머리글을 준다.** `sr-only`로만 두면 표가 한 칸 덜 끝난 것처럼 보인다.
- **버튼을 줄마다 있다 없다 하지 않는다.** 자리는 늘 두고, 못 하는 줄은 **잠그고 `title`로 이유**를 말한다.
- **영문 슬러그를 한글 이름 옆에 붙이지 않는다**(`제품 v2.0  #product-v2`). 구분은 **줄 왼쪽 색 띠**가 맡는다.
- 세로 띠를 쓰면 카드에 `overflow-hidden` — 없으면 마지막 줄 띠가 둥근 모서리 밖으로 나간다.

---

## 4. 값 — 크기·간격

### 글자 (다섯 개만 쓴다)

| 쓰임      | 클래스                                                        |
| --------- | ------------------------------------------------------------- |
| 카드 제목 | `text-[17px] leading-7 font-semibold tracking-[-0.3px]`       |
| 큰 숫자   | `text-[30~32px] leading-9/10 font-semibold tracking-[-0.8px]` |
| 본문      | `text-[13px] leading-5`                                       |
| 라벨·보조 | `text-[12px] leading-4`                                       |
| 힌트      | `text-[11px] leading-4`                                       |

**숫자에는 `tabular-nums`.** 안 붙이면 자릿수가 바뀔 때 좌우로 흔들린다.

### 여백

```text
본문 바깥   px-8 py-7
카드 사이   gap-7
카드 안쪽   px-7 · 머리 pt-6 pb-3 · 단일 카드 p-7
            머리 아래가 **띠 없이 바로 줄이면 pb-5** (툴바가 든 머리도 pb-5)
표 셀       px-4 py-3.5 · **첫 열은 px-7**(카드 제목과 같은 세로선) · 지우기 열만 pr-5
```

### 폭

```text
목록·표 · 상세     max-w-[1440px]
폼 + 좌 네비       max-w-[960px]
폼 한 장 · 읽는 글  max-w-[720px]
로그인·확인        max-w-[560px]
```

**화면 제목(카드 밖, 상단바 아래)은 22px이다** — `text-[22px] leading-[30px] tracking-[-0.4px]`.
카드 제목(17px)과 다른 층이라 다섯 크기 표 밖에 따로 둔다. 20px·24px를 새로 만들지 않는다.

- **새 숫자를 만들지 않는다.** 1080·1144처럼 중간값이 늘면 화면마다 여백이 달라진다.
- ⚠️ 위 넷 말고 **`PAYMENT_WIDTH`(1120)** 가 하나 더 있다 — 온보딩·구독 재개가 같이 쓰는
  결제 카드 폭이고 `form` 성격이다. 랜딩(1144)은 마케팅 페이지라 이 규격 밖이다.
- **고정하지 않는다** — `w-[1440px]`이 아니라 `mx-auto max-w-[1440px] px-8`.
- **`loading`은 본문과 같은 폭·같은 개수**로 그린다. 다르면 로딩이 끝날 때 화면이 튄다.

---

## 5. 색 — 적게, 정해진 것만

### 원칙 셋

1. **기본은 무채색이다.** 배경·셸·카드·글자·보더는 전부 먹/회색 토큰이다.
2. **색으로 알리는 건 에러(빨강)뿐이다.** 나머지 구분은 명도·아이콘·문구로 한다.
3. **색을 쓰려면 "이 색이 뭘 뜻하냐"에 한 문장으로 답할 수 있어야 한다.** 못 하면 안 쓴다.

⚠️ **같은 모양의 줄이 여러 개면 색이 아니라 아이콘으로 가른다.** 구독의 사용량 두 줄
(`AI 토큰`·`저장 공간`)이 둘 다 `이름 · 숫자 · 막대`라 훑을 때 어느 줄인지 다시 읽어야 했다 —
막대에 색을 입히는 대신 `lucide` 아이콘(`Sparkles`·`HardDrive`)을 이름 앞에 붙였다.
**이모지는 안 쓴다**(§CLAUDE.md ❌이모지). 아이콘은 장식이라 `aria-hidden`이고,
한글 라벨은 아이콘보다 `translate-y-[1px]` 내려야 눈높이가 맞는다.
⚠️ 어느 줄인지는 **부르는 쪽이 안다**(`usage.tokens`·`usage.storage`) — 라벨 문자열을 보고
아이콘을 고르지 않는다. 이름이 바뀌면 조용히 사라진다(§라벨 하드코딩 금지).

### 색을 써도 되는 자리 — 이게 전부다

| 자리              | 뜻                                                  | 어디서                  |
| ----------------- | --------------------------------------------------- | ----------------------- |
| 상태점            | 할일 회색 · 진행중 초록 · 완료 보라 · **지연 빨강** | `StatusDot`             |
| 프로젝트 띠·막대  | 어느 프로젝트인지                                   | `pickPaletteColor(tag)` |
| 프로필 아바타     | 그 사람                                             | `useProfileAvatar(id)`  |
| 초과·에러         | 문제                                                | `--destructive`         |
| 액센트(링크·선택) | 지금 고른 것                                        | `--primary`             |

**이 표에 없으면 무채색이다.** 카드 배경·머리·버튼·구분선에 색을 넣지 않는다.

### 팔레트에서 고르는 법

색은 **직접 고르지 않는다.** `pickPaletteColor(key)`가 11색 중 하나를 골라 준다 —
같은 키는 언제나 같은 색이라 사람이 정할 일이 없다.

```text
slate · yellow · lime · emerald · teal · cyan · sky · indigo · purple · fuchsia · pink
```

세 값이 한 벌로 나온다. **섞어 쓰지 않는다.**

| 값           | 쓰는 곳                             | 왜                         |
| ------------ | ----------------------------------- | -------------------------- |
| `bgColor`    | 칩 배경                             | 아주 옅다                  |
| `textColor`  | 그 칩 **위의 글자**                 | 그 배경에서 4.5:1을 넘는다 |
| `solidColor` | 막대·띠처럼 **글자가 안 얹히는 면** | 원색(600단계)              |

```tsx
const color = pickPaletteColor(project.tag);

✅ <span style={{ backgroundColor: color.bgColor, color: color.textColor }}>칩</span>
✅ <span style={{ backgroundColor: color.solidColor }} />        {/* 막대 */}
❌ <span style={{ backgroundColor: color.bgColor, color: color.solidColor }}>칩</span>
   // 다른 벌을 섞으면 대비가 무너진다
```

### 조화 규칙

- **한 화면에 팔레트 색을 흩뿌리지 않는다.** 색이 붙는 건 **한 종류의 대상**뿐이다
  (프로젝트면 프로젝트, 사람이면 사람). 프로젝트도 색, 부서도 색, 태그도 색이면
  무엇을 구분하는 색인지 알 수 없다.
- **같은 대상은 화면이 달라도 같은 색**이다 — 키를 고정하면 자동으로 그렇게 된다
  (`useProfileAvatar`의 키가 `id` 하나인 이유).
- **뜻이 있는 색과 겹치지 않는다.** 팔레트에 빨강·주황이 없는 건 그래서다
  (에러 빨강 · Owner 오렌지 · 상태점 초록/보라와 섞이면 뜻이 두 개가 된다).
- **11색뿐이라 겹친다.** 색으로 **식별하지 않는다** — 식별은 이름과 태그가 하고,
  색은 훑을 때 눈이 걸리게 하는 보조다.

### 명도·대비

- 팔레트 원색은 **600단계**다. 700은 명도 0.08~0.16이라 여러 줄이 전부 시커멓게 보인다.
  단 `yellow`·`lime`은 600에서 대비가 3:1에 못 미쳐 **700을 유지**한다.
- **비문자 그래픽 3:1 · 글자 4.5:1**(WCAG). 옅게 깔 때 반드시 확인한다.
- **`dark:`를 컴포넌트에 쓰지 않는다.** 토큰만 쓰면 다크가 따라온다 —
  `dark:`가 필요하다고 느껴지면 토큰을 안 쓴 것이다.

### 표면

라이트에서 `--background`와 `--card`는 **둘 다 흰색**이다. 카드는 **색이 아니라 얕은
그림자**로 띄운다(`.app-shell .bg-card`, 다크에는 안 건다).

⚠️ **바탕을 회색·크림으로 밀지 않는다.** 밝은 색은 색조가 그대로 읽혀 화면 전체가
누레지거나 시멘트색이 된다. **점 그리드도 로그인 뒤에는 안 깐다**(랜딩·온보딩·결제 전용).

---

## 6. 글

- **~합니다체**. 돈·권한·기록이 걸린 화면이라 친근한 말투가 오히려 가볍게 읽힌다.
  명령은 `~해 주세요`.
- **버튼은 한 낱말** — `삭제` · `해지` · `발송` · `추가` · `등록`.
  `cancelLabel`은 안 넘긴다(기본값 `취소`).
- **날짜는 `formatDate`** 를 거친다 — `2026-09-01` ❌ → `9월 1일(화)` ✅.
- **긴 설명은 뜻 단위로 끊는다**(`<br />`). 한 줄로 두면 창 폭에서 아무 데나 접힌다.
- **조사를 박지 않는다.** `${label}은` ❌ → `topicParticle(label)`(`lib/korean.ts`).
- **라벨을 하드코딩하지 않는다.** `constants/`의 `*_LABEL` 맵에서 꺼낸다.

---

## 7. 알림 — 토스트냐 모달이냐

**셋 중 하나로만 알린다.** 고르는 기준은 "사용자가 멈춰야 하는가"다.

|             | 쓰는 때                                  | 컴포넌트           |
| ----------- | ---------------------------------------- | ------------------ |
| **토스트**  | 끝났다고 알리기만 하면 될 때             | `toast()` (sonner) |
| **확인 창** | 되돌릴 수 없는 일 — **하기 전에** 멈춘다 | `ConfirmDialog`    |
| **결과 창** | 끝난 뒤 **다음 행동**이 필요할 때        | `ResultDialog`     |

❌ 폼 검증 오류 → **필드 인라인** · ❌ 화면 전체 실패 → **`error.tsx`**

### 토스트

```tsx
toast(`${formatGb(freed)} 삭제됨 — ${target.name}`);
toast("삭제하지 못했습니다");
```

- **한 줄(220px)이다.** 길면 잘린다 — 문장이 아니라 **결과 한 조각**만 적는다.
- **토스트는 사라진다.** 그래서 **보조**다 — 놓쳐도 되는 말만 담는다.
  놓치면 안 되는 건 화면에 남긴다.
- **~합니다체.** `발송했어요` ❌ → `발송했습니다` ✅.

**`redirect`가 걸린 액션은 토스트를 띄울 자리가 없다.** 서버가 바로 다음 주소로 보내
성공을 화면에 못 돌려주기 때문이다 — 주소에 열쇠를 실어 보내고(`?toast=…`) 도착한 화면이
공용 `FlashToast`로 대신 말한다. 띄운 뒤 그 파라미터만 지운다(새로고침·공유에서 다시 뜨지 않게).

### 확인 창 (`ConfirmDialog`)

```tsx
<ConfirmDialog
  isOpen={target !== null}
  onOpenChange={(open) => !open && setTarget(null)}
  title="이 프로젝트의 기록을 삭제할까요?"
  description={
    <>
      {target.name}의 음성 {formatGb(target.voiceGb)}와 자막·요약 {formatGb(target.sttGb)}가
      모두 삭제됩니다.
      <br />
      회의 기록과 액션의 출처 추적이 끊기며 되돌릴 수 없습니다.
    </>
  }
  confirmLabel="삭제"        {/* 한 낱말 */}
  isDestructive              {/* 빨강은 여기서만 */}
  isPending={isPending}
  pendingLabel="삭제 중"
  onConfirm={handleDelete}
/>
```

- **제목은 물음**(`~할까요?`), **설명은 무엇을 잃는지**다. "정말요?"만 묻는 건 확인이 아니다.
- **`cancelLabel`을 안 넘긴다.** 기본값 `취소`를 쓴다 — 창마다 다른 말을 쓰면 같은 자리가
  매번 다르게 읽힌다.
- **설명은 뜻 단위로 `<br />`** 로 끊는다. 한 줄로 두면 창 폭에서 아무 데나 접힌다.
- **날짜는 `formatDate`** 를 거친다.
- 파괴적이면 `isDestructive` — **빨강은 그 버튼에만** 쓰고 창 전체를 물들이지 않는다.

### 결과 창 (`ResultDialog`)

```tsx
<ResultDialog
  isOpen
  onOpenChange={() => {}}
  badge="alert"              {/* check | alert */}
  isDismissible={false}      {/* 닫으면 안 되는 상황이면 false */}
  title="구독이 종료되었습니다"
  description={<>결제가 끝나야 워크스페이스가 열립니다.<br />결제는 대표 또는 Admin만 할 수 있습니다.</>}
  action={<Link href="/login" className={cn(buttonVariants({ variant: "ink" }), "h-11 w-full")}>로그인 화면으로</Link>}
/>
```

⚠️ **창은 포털이라 서버가 그린 HTML에 안 들어간다.** 창으로만 안내하면 JS가 늦거나 실패할 때
빈 화면이 남는다 — **같은 말을 창 뒤 본문에도** 둔다.

---

## 8. 상태 세 장 — 같이 만든다

`loading` · `error` · `empty`는 나중에 붙이는 게 아니다.

```tsx
// error.tsx — 셸 안이면 반드시 isInsideShell
<ScreenError title="저장소 정보를 불러오지 못했습니다" reset={reset} isInsideShell />
```

- 안 켜면 상단바 56px + 100dvh가 되어 아래가 잘리고 스크롤도 안 된다 — 창이 낮으면
  [다시 시도] 버튼이 잘려 **오류에서 빠져나갈 길이 사라진다.**
- 셸 안에서는 `h1`을 쓰지 않는다(`PageHeader`가 이미 갖고 있다).
- **empty는 공용 `EmptyState`를 쓴다** — 아이콘(무엇이 없는지) + 문구 + 다음 걸음.
  화면마다 `<p>…없습니다</p>` 한 줄을 새로 적지 않는다. 여백도 거기서 나온다.
  아이콘은 제 도메인을 가리킨다(회의가 없으면 캘린더, 사람이 없으면 사람).
- **막힌 화면은 401 · 403 · 404가 한 벌이다**(`StatusScreen`) — Z 로고 → 숫자 → 제목 →
  안내 → 나갈 문. 권한이 없는 화면에 404를 띄우지 않는다(주소는 맞고 자격이 없는 것이라
  다음에 할 일이 다르다). 오류 화면(`ScreenError`)도 같은 몸을 쓰되 숫자는 안 붙인다.
- 사이드바는 **화면이 있는지 자동으로 안다**(`routes.ts`). 손으로 `isReady`를 켜지 않는다.

---

## 9. 값 — 화면은 사실만 말한다

**BE 스펙에 없으면 화면에 없다.** 필요하면 BE에 요청하고 그 값을 받아 쓴다.

- 프론트가 **추정·예측을 만들지 않는다**(예: 월말 예상 사용량).
- **정해지지 않은 정책을 단언하지 않는다**(예: "삭제 불가").
- 파괴적 작업은 **무엇을 잃는지 먼저 적고** 창으로 확인받는다.
- **넘겨도 막지 않는다.** 얼마가 더 나가는지 적고 판단은 쓰는 사람이 한다.

---

## 10. 그래프

| 묻는 것                 | 형태                                  |
| ----------------------- | ------------------------------------- |
| 얼마나 찼나 (하나)      | 링 · 막대 둘 다                       |
| **두 조각의 크기 비교** | **가로 막대** — 같은 축에 이어 놓는다 |
| 시간에 따른 변화        | 선                                    |

- 막대는 **한도를 넘겨 그릴 수 있다.** 넘긴 만큼 그리고 **포함량 자리에 선**을 그으면
  "어디까지가 포함량이고 얼마나 넘었는지"가 같이 보인다(링은 한 바퀴에서 잘린다).
- `strokeLinecap="round"`를 쓰지 않는다 — 선 굵기의 절반만큼 삐져나와 눈금이 안 맞는다.
- 조각은 **색이 아니라 명도**로 나눈다.

---

## 11. 올리기 전

- [ ] **다크모드**로 한 번 본다 — `dark:`를 직접 썼으면 토큰을 안 쓴 것이다
- [ ] **좁은 창**으로 줄여 본다 — 표가 가로 스크롤로 넘어가는지
- [ ] `loading` → 본문으로 넘어갈 때 **폭·개수가 안 튀는지**
- [ ] 표의 각 열이 **세로로 한 줄에 서는지**
- [ ] 화면의 숫자가 **BE가 준 값인지**
- [ ] 버튼이 **한 낱말**인지, 날짜가 **우리 표기**인지
- [ ] `npx jest` · `npm run build`

---

## 부록 — 이 규칙이 나온 배경

> 규칙만 보고 "왜 굳이?"가 남을 때 본다. 아래는 **이 두 화면을 만들며 겪은 일**이고,
> 대부분 몰라서가 아니라 **미리 정해 두지 않아서** 난 것들이다.

| 규칙                         | 정해 두지 않았을 때 겪은 일                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 폭을 통일한다                | 1080·1120·1144가 섞여 사이드바로 옮겨 다닐 때 본문 폭이 흔들렸다                                                                        |
| `loading`을 본문과 맞춘다    | 저장소가 로딩 1080 → 본문 1440이라 로딩이 끝나는 순간 폭이 확 넓어졌다                                                                  |
| 카드는 그림자로 띄운다       | 바탕을 중성 회색으로 내리니 **시멘트색**, 크림으로 내리니 **누런 종이**, 본문만 내리니 셸과 **따로 놀았다** — 색으로는 세 번 다 안 됐다 |
| 상자 폭을 고정한다           | `진행중`·`완료` 길이가 달라 상태점이 줄마다 밀렸다. 막대·숫자도 같은 이유로 밀렸다                                                      |
| 열 폭은 % 로                 | px 고정이라 첫 열이 남는 폭을 다 먹어, 넓은 화면에서 이름 왼쪽만 비고 값이 오른쪽에 구겨졌다                                            |
| 아이콘을 첫 줄 상자에 넣는다 | `mt-px` 눈대중이라 14px 아이콘이 12px 글자보다 한 칸 떠 보였다                                                                          |
| 팔레트는 600단계             | 700은 명도 0.08~0.16이라 다섯 줄이 시커멓게 보여 "색이 없다"고 읽혔다                                                                   |
| 아바타 키는 id 하나          | 부르는 쪽마다 키가 달라(`name+id` / `name+department`) 같은 사람이 화면마다 다른 색이었다                                               |
| 링 대신 막대                 | 초과 시 링이 100%에서 잘려 1GB 넘겼는지 12GB 넘겼는지 구분이 안 됐다                                                                    |
| `strokeLinecap` 금지         | 둥근 끝이 양쪽으로 삐져나와 69.8%가 73%처럼 보이고 뒤 조각을 덮었다                                                                     |
| 화면은 사실만                | `주기 종료 시 1,441,500 예상`은 BE에 없는 값이었다 — 4일치로 한 달을 곱한 추정                                                          |
| 정책을 단언 안 함            | `자막·요약 삭제 불가`는 팀이 정한 적 없는데 화면이 말하고 있었다                                                                        |
| `isInsideShell`              | 안 켠 오류 화면이 상단바 56px만큼 잘려 [다시 시도]를 못 눌렀다                                                                          |
| 조사를 계산                  | `${label}은`으로 박아 `프로젝트은`·`캘린더은`이 떴다                                                                                    |
