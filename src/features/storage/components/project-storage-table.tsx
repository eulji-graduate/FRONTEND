"use client";

import { HardDrive } from "lucide-react";
import { Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { StatusDot } from "@/components/common/status-dot";
import { PROJECT_STATUS_LABEL } from "@/constants/project";
import { formatGb } from "@/features/billing/pricing";
import { formatDateWithYear, formatElapsed, isReadableDate } from "@/lib/date";
import { pickPaletteColor } from "@/lib/palette";

import { canDeleteRecordings } from "../storage";
import type { ProjectStorage } from "../types";

interface ProjectStorageTableProps {
  projects: readonly ProjectStorage[];
  /** 전체 음성(GB) — 각 줄의 비중 막대를 그리는 기준 */
  totalVoiceGb: number;
  /** 지울 수 있는 사람인지 — 대표이거나 Admin을 겸한 사람 */
  canManage: boolean;
  /**
   * `4개월 전` 같은 표기를 계산하는 기준 날짜 `YYYY-MM-DD` — **서버가 정한다.**
   * ⚠️ 여기서 `new Date()`를 부르면 날짜가 바뀌는 순간 서버 렌더와 갈린다(하이드레이션).
   */
  today: string;
  onDelete: (project: ProjectStorage) => void;
}

/**
 * 프로젝트별 녹음 용량.
 *
 * ⚠️ **표다.** 같은 종류의 값이 줄마다 반복되고 열끼리 비교하며 읽으므로 카드가 아니라 표가 맞다.
 *    좁아지면 가로로 스크롤한다(§레이아웃: 표는 `overflow-x-auto`로 감싼다).
 * ⚠️ 음성과 자막·요약을 **열로 나눈다.** 지울 수 있는 건 음성뿐이라, 합쳐 두면 지우면 얼마가
 *    비는지 알 수 없다.
 * ⚠️ **끝난 프로젝트만** 지울 수 있다. 진행 중인 회의 녹음은 아직 다시 들을 일이 남아 있다 —
 *    판정은 `canDeleteRecordings` 한 곳이 하고, 서버 액션이 같은 함수로 다시 본다.
 * ⚠️ 지금은 **전량을 한 번에** 그린다. BE가 페이지 단위로 주기 시작하면 스크롤로 이어 붙인다
 *    (§목록·페이지네이션) — 그때 이 컴포넌트가 목록을 받는 방식만 바뀐다.
 */
export function ProjectStorageTable({
  projects,
  totalVoiceGb,
  canManage,
  today,
  onDelete,
}: ProjectStorageTableProps) {
  /*
    ⚠️ `overflow-hidden`이 있어야 **줄 왼쪽 세로 띠가 둥근 모서리 안에서 잘린다.**
       없으면 마지막 줄의 띠가 카드 밖으로 삐져나와 각진 꼬리가 남는다.
  */
  return (
    <section className="border-border bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-baseline justify-between gap-3 px-7 pt-6 pb-3">
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">프로젝트별 사용량</h2>
        {/*
          ⚠️ 전체 건수를 적는다 — 끝이 안 보이는 목록은 얼마나 남았는지 알 수 없다.
          ⚠️ 색은 `--muted-foreground`보다 **한 단 진하다**(`foreground/75`). 표 머리글과 같은
             흐림이면 카드 머리에서 이 숫자가 먼저 안 잡힌다 — 라이트에서 약 7:1이라
             12px에도 넉넉하다(§a11y). ⚠️ `muted-foreground/70`은 2.73:1로 미달이라 안 쓴다.
          ⚠️ **아래 지우기 아이콘과 세로축(가운데)을 맞춘다.** 맞출 대상은 아이콘 상자의
             가운데이고, 그건 `삭제` 머리글의 가운데와 같은 선이다.
          ⚠️ 전에 여기를 **오른쪽으로 8px 밀어 뒀는데 방향이 반대였다** — 그래서 9px 어긋나
             눈에 확 보였다. 실측하면 이 글자는 밀지 않은 자리에서 이미 1px 차이까지 맞는다.
             남는 1px만 왼쪽으로 당긴다.
          ⚠️ **움직이는 건 이 글자다.** 표 쪽 `pr-*`를 건드리면 다섯 줄의 아이콘이 다 같이
             움직여 열 안에서 한쪽으로 쏠린다.
        */}
        <p className="text-foreground/75 shrink-0 -translate-x-px text-[12px] leading-4 tabular-nums">
          전체 {projects.length}개
        </p>
      </div>

      {/*
        ⚠️ **무엇이 사라지는지 지우는 자리에서 말한다.** 따로 떨어진 안내 상자로 두면 표를 볼 때는
           이미 화면 밖이라, 정작 버튼을 누르는 순간에는 안 읽힌다.
        ⚠️ 자막·요약까지 지우는 게 **되돌릴 수 없고 추적이 끊기는 일**이라, 다 남는 줄 알고
           눌렀다가 나중에 회의 기록을 못 찾는 일이 없어야 한다(§정직성).
        ⚠️ **제목과 이 문구 사이에 선을 긋지 않는다.** 둘은 한 덩어리(무엇을 보는 표인지 +
           지우면 어떻게 되는지)라, 선을 그으면 층이 하나 더 생겨 카드가 늘어나 보인다 —
           카드 안에서 선은 **표가 시작하는 자리** 한 곳만 긋는다.
      */}
      <p className="text-muted-foreground px-7 pb-5 text-[12px] leading-[18px] break-keep">
        삭제 시 <span className="text-foreground font-medium">음성과 자막·요약이 함께</span>{" "}
        제거되고 목록에서 빠집니다. 그 회의의 기록과 액션의 출처 추적이 끊기며 되돌릴 수 없습니다.
      </p>

      {projects.length === 0 ? (
        /* ⚠️ 빈 상태 — 무엇이 없는지 적는다(§3상태) */
        <EmptyState
          bordered
          icon={HardDrive}
          title="저장소를 쓰는 프로젝트가 없습니다."
          description="회의를 녹음하면 그 프로젝트가 이 목록에 쌓입니다."
        />
      ) : (
        <div className="border-border overflow-x-auto border-t">
          <table className="w-full min-w-[760px] table-fixed text-[13px]">
            {/*
              ⚠️ 열 폭을 **비율(%)로** 준다. px로 고정하면 남는 폭을 첫 열(프로젝트)이 통째로
                 먹어서, 넓은 화면에서는 이름 왼쪽만 텅 비고 나머지 값이 오른쪽에 구겨진다 —
                 비율이면 화면이 넓어질 때 모든 열이 같이 늘어난다.
              ⚠️ `table-fixed`가 있어야 이 값이 실제로 먹는다. 없으면 브라우저가 내용을 보고
                 다시 계산한다. 좁아지면 `min-w`까지 줄었다가 가로로 스크롤한다.
            */}
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
              <col className="w-[19%]" />
              <col className="w-[11%]" />
              <col className="w-[15%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              {/*
                ⚠️ **이름만 왼쪽이고 나머지는 가운데**다. 열 폭이 고정이라 머리와 칸에 같은
                   정렬을 주면 두 글자의 **가운데가 한 세로선**에 놓인다 — 한쪽만 끝에 붙이면
                   글자 길이가 달라 축이 어긋나 보인다.
                ⚠️ 이름은 예외다. 길이가 제각각이라 가운데로 모으면 왼쪽 끝이 들쭉날쭉해져
                   세로로 훑을 수가 없다 — 목록에서 사람이 가장 먼저 찾는 열이다.
              */}
              {/*
                ⚠️ 머리에 **섹션 띠**(`--secondary`)를 깐다. 보더 한 줄만으로는 머리와 본문이
                   같은 면으로 읽혀서, 표가 카드 안에서 어디부터 시작하는지 흐리다 —
                   색을 늘리는 게 아니라 §디자인 토큰이 정해 둔 표면을 쓰는 것이다.
              */}
              <tr className="text-muted-foreground bg-secondary/50 border-border border-b text-[12px] leading-4">
                <th className="px-7 py-3 text-left font-normal">프로젝트</th>
                {/*
                  ⚠️ 상태는 **자기 열**이다. 이름 옆에 붙여 두면 이름 길이에 따라 좌우로 밀려서
                     세로로 훑을 수가 없다 — 지울 수 있는 줄을 고르는 게 이 표의 일이라
                     상태가 한 줄로 서 있어야 한다.
                */}
                <th className="px-4 py-3 text-center font-normal">상태</th>
                {/*
                  ⚠️ **`회의`가 아니라 `녹음 회의`** 다. 지우고 나면 이 값이 0이 되는데,
                     `회의`라고만 적으면 회의 자체가 사라진 것으로 읽힌다 — 사라진 건 녹음뿐이다.
                */}
                <th className="px-4 py-3 text-center font-normal">녹음 회의</th>
                {/*
                  ⚠️ 음성 열에만 **비중 막대**를 붙인다. 어느 프로젝트가 자리를 많이 먹는지가
                     이 표를 보는 이유인데, 숫자만 늘어놓으면 다섯 줄을 다 읽고 비교해야 한다.
                     자막·요약은 지울 수 없어 비교할 이유가 없으므로 숫자만 둔다.
                */}
                <th className="px-4 py-3 text-center font-normal">음성</th>
                <th className="px-4 py-3 text-center font-normal">자막·요약</th>
                {/*
                  ⚠️ **`가장 오래된 녹음`이 아니라 `마지막 녹음`이다.** 지우기는 그 프로젝트의
                     녹음을 전부 없애므로, 언제부터 쌓였는지는 판단에 쓸 데가 없다 —
                     알아야 하는 건 **얼마나 식었는지**다. `완료` + 마지막 녹음이 오래됨 =
                     가장 안심하고 지울 줄이다.
                  ⚠️ 값은 **상대 표기**다(`4개월 전`). 날짜를 읽고 오늘과 빼서 얼마나 됐는지
                     세는 건 사람이 할 일이 아니다 — 이 열이 답해야 하는 건 "식었나"이지
                     "며칠이었나"가 아니다. 정확한 날짜는 `title`·`dateTime`에 남는다.
                  ⚠️ 이 표의 열 구성은 팀 명세에 없다(`docs/WORKFLOW.md`는 `용량 관리` 화면이
                     있다는 것까지만 적혀 있다). 확정되면 그쪽을 정본으로 맞춘다.
                */}
                <th className="px-4 py-3 text-center font-normal">마지막 녹음</th>
                {/*
                  ⚠️ **이 열에도 이름을 준다.** 다른 여섯 열은 다 머리글이 있는데 여기만 비어
                     있으면 표가 한 칸 덜 끝난 것처럼 보이고, 아이콘이 무엇을 하는 것인지도
                     머리에서 안 읽힌다. 전에는 `sr-only`라 스크린 리더에만 있었다.
                */}
                <th className="py-3 pr-5 pl-0 text-center font-normal">삭제</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <Row
                  key={project.tag}
                  project={project}
                  totalVoiceGb={totalVoiceGb}
                  canManage={canManage}
                  today={today}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Row({
  project,
  totalVoiceGb,
  canManage,
  today,
  onDelete,
}: {
  project: ProjectStorage;
  totalVoiceGb: number;
  canManage: boolean;
  today: string;
  onDelete: (project: ProjectStorage) => void;
}) {
  const isDeletable = canDeleteRecordings(project);
  /*
    ⚠️ **사유를 `진행 중`으로 박지 않는다.** 못 지우는 경로가 둘이다 —
       ① 끝나지 않은 프로젝트(`할 일`·`진행중`) ② 이미 비어 남은 게 없는 줄.
       하나로 적으면 상태 칸에 `할 일`·`완료`를 찍어 놓고 툴팁은 `진행 중`이라 말한다.
    ⚠️ 라벨은 `PROJECT_STATUS_LABEL`에서 꺼낸다(§도메인 상수 — 라벨 하드코딩 금지).
  */
  const blockedReason =
    project.voiceGb + project.sttGb === 0
      ? "삭제할 기록이 없습니다"
      : `${PROJECT_STATUS_LABEL[project.status]} 상태에서는 삭제할 수 없습니다`;
  // 툴팁에 넣을 정확한 날짜. 기준 연도는 서버가 준 `today`에서 뽑는다(여기서 `new Date()` 금지)
  const recordedOn = formatDateWithYear(project.lastRecordedAt, Number(today.slice(0, 4)));
  /*
    ⚠️ **읽을 수 없는 날짜는 화면에 안 내보낸다.** 날짜 함수들은 못 읽으면 원문을 그대로
       돌려주는데(지어내지 않으려고), 그 원문이 `2026-02-30` 같은 ISO 문자열이라 그대로 두면
       개발자용 표기가 표에 뜬다(§디자인 토큰 — 화면에 안 내보내는 것).
       기록은 있는데 날짜만 못 읽는 경우라, 지우기 버튼은 그대로 살아 있어야 한다.
  */
  const hasRecordedOn = isReadableDate(project.lastRecordedAt);
  const hasRecords = project.voiceGb + project.sttGb > 0;
  const tagColor = pickPaletteColor(project.tag);
  // ⚠️ 0으로 나누면 `NaN%`가 되어 막대가 아예 안 그려진다
  const share = totalVoiceGb > 0 ? (project.voiceGb / totalVoiceGb) * 100 : 0;

  /*
    ⚠️ 줄 강조는 `--secondary`가 아니라 **먹색 옅게**(`foreground/[0.04]`)다. 라이트에서
       `--secondary`(#fafaf9)는 흰 카드와 2%밖에 차이가 없어서 손이 어느 줄에 있는지
       전혀 안 보인다 — 사이드바 항목이 같은 방식을 쓴다.
  */
  return (
    <tr className="group border-border hover:bg-foreground/[0.04] transition-colors not-first:border-t">
      {/*
        ⚠️ **줄 왼쪽 세로 띠가 그 프로젝트의 색**이다(`lib/palette`). 표에서 프로젝트를
           구분하는 건 태그 글자인데, 다섯 줄을 훑을 때 글자를 읽기 전에 색이 먼저 잡힌다 —
           대시보드 회의 목록이 같은 방식을 쓴다.
        ⚠️ `relative`로 띠를 칸 안에 절대배치한다. `border-left`로 그리면 hover 배경이
           띠까지 덮고, 줄 사이 가로 구분선(`border-t`)과 모서리에서 겹친다.
        ⚠️ 띠는 `aria-hidden`이다 — 색이 말하는 건 태그 글자가 이미 말한다(§a11y).
      */}
      <td className="relative px-7 py-3.5">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: tagColor.solidColor }}
        />
        {/*
          ⚠️ **이름은 링크가 아니다**(2026-08-19 변경 — 이전엔 프로젝트 상세로 가는 링크였다).
             이 표는 지울 프로젝트를 고르는 자리이지 프로젝트로 이동하는 자리가 아니다 —
             이동을 없애 클릭이 삭제 버튼 하나로만 향하게 한다.
          ⚠️ **영문 태그 칩(`#product-v2`)을 붙이지 않는다.** 한글 이름 옆에 영문 슬러그가
             나란히 서면 같은 것을 두 번 말하는 데다, 표에서 눈이 먼저 닿는 열이 영어로 시작한다.
             태그는 **줄 왼쪽 색 띠**가 대신 말한다.
        */}
        <span className="flex min-w-0 items-center gap-2">
          <span title={project.name} className="min-w-0 truncate">
            {project.name}
          </span>
        </span>
      </td>
      <td className="px-7 py-3.5">
        {/*
          ⚠️ 라벨을 손으로 적지 않는다 — `PROJECT_STATUS_LABEL`이 정본이다(§도메인 상수).
             `진행중`이라고 박아 두면 라벨이 바뀔 때 이 화면만 옛말을 한다.
          ⚠️ 점 색은 공용 `StatusDot`이 정한다. 화면마다 색을 고르면 같은 색이 두 뜻을 갖는다.
        */}
        {/*
          ⚠️ **묶음을 가운데 두지 않는다**(`justify-center` 금지). `진행중`(3자)과 `완료`(2자)는
             폭이 달라서, 묶음 전체를 가운데 놓으면 **점이 줄마다 좌우로 어긋난다.**
             **점은 점끼리, 글자는 글자끼리 각각 한 세로선에 선다.**
             라벨을 고정폭 상자에 넣고(`w-[42px]`) 그 안에서 **가운데 정렬**한다 —
             그러면 `완료`(2자)와 `진행중`(3자)의 **가운데가 같은 세로선**에 놓이고,
             상자 폭이 일정하니 앞에 붙는 점도 저절로 한 줄로 선다.
             `text-left`로 두면 글자 시작점은 맞아도 짧은 `완료`의 가운데가 왼쪽으로 밀린다.
        */}
        <StatusDot
          tone={project.status}
          label={PROJECT_STATUS_LABEL[project.status]}
          labelClassName="w-[42px] text-center"
          className="mx-auto w-fit text-[12px] leading-4"
        />
      </td>
      <td className="text-muted-foreground px-4 py-3.5 text-center tabular-nums">
        {project.meetingCount}개
      </td>
      <td className="px-7 py-3.5">
        {/*
          ⚠️ 막대는 **전체 음성 대비 비중**이다. 포함량(50GB) 기준으로 그리면 한 프로젝트가
             차지하는 조각이 너무 작아 다섯 줄이 전부 비슷해 보인다.
          ⚠️ **막대는 막대끼리, 숫자는 숫자끼리 선다.** 묶음만 가운데 두면 `10.9GB`(4자리)가
             `9.1GB`(3자리)보다 넓어서 그 줄만 막대가 왼쪽으로 밀린다 — 상태 칸의 점과 같은
             문제다. 숫자 상자의 **폭을 고정**해야 덩어리 폭이 일정해지고 둘 다 한 줄로 선다.
          ⚠️ 숫자는 상자 안에서 **오른쪽 정렬**이다. 자릿수가 다른 값은 오른쪽 끝을 맞춰야
             크기를 견줄 수 있다(`tabular-nums`와 같은 이유).
        */}
        <span className="flex items-center justify-center gap-2.5">
          {/*
            ⚠️ 트랙에 **`--secondary`를 쓰지 않는다.** 라이트에서 그 값(#fafaf9)은 흰
               카드(#ffffff)와 0.5%밖에 차이가 없어서 **빈 부분이 아예 안 보인다** —
               채운 만큼만 떠 있고 전체가 얼마인지 읽히지 않는다. 줄 강조가 쓰는
               **먹색 옅게**(`foreground/10`)로 깔아 양쪽 테마에서 다 보이게 한다.
          */}
          <span
            className="bg-foreground/10 h-1.5 w-[68px] shrink-0 overflow-hidden rounded-full"
            aria-hidden
          >
            {/*
              ⚠️ 막대 색이 **그 프로젝트의 색**이다(`lib/palette`). 표에서 가장 큰 색 덩어리라
                 여기에 두면 어느 줄이 어느 프로젝트인지 훑어서 잡힌다 — 태그 칩에 두면
                 글자 뒤에 깔려 잘 안 보인다.
              ⚠️ 원색(`--tag-*-solid`)을 쓴다. 칩 글자색은 4.5:1을 맞추려 진해서 막대에 쓰면
                 다섯 줄이 전부 시커멓다.
            */}
            <span
              className="block h-full rounded-full"
              style={{ width: `${share}%`, backgroundColor: tagColor.solidColor }}
            />
          </span>
          <span className="w-[58px] shrink-0 text-right tabular-nums">
            {formatGb(project.voiceGb)}
          </span>
        </span>
      </td>
      <td className="text-muted-foreground px-4 py-3.5 text-center tabular-nums">
        {formatGb(project.sttGb)}
      </td>
      {/*
        ⚠️ **남은 게 하나도 없을 때만** `—`다. 조건이 `voiceGb > 0`이던 때가 있었는데,
           삭제 대상이 음성+자막·요약으로 넓어진 뒤로는 **자막·요약만 남은 줄**이
           `—`(= 남은 게 없다)로 읽혔다 — 같은 줄에서 삭제 버튼은 살아 있고 확인 창은
           `자막·요약 1.3GB가 삭제됩니다`라고 말하는데 말이 어긋난다.
        ⚠️ **`canDeleteRecordings`와 같은 판정이 아니다.** 그쪽은 `완료` 상태까지 보지만
           여기는 **남은 게 있는지만** 본다 — 진행 중인 프로젝트도 기록이 있으면 마지막
           회의가 언제였는지 보여야 한다. 지울 수 있느냐와 언제 기록됐느냐는 다른 질문이다.
      */}
      <td className="text-muted-foreground px-4 py-3.5 text-center">
        {/*
          ⚠️ `<time>`이라야 기계도 이 값이 날짜인 줄 안다. 화면에 뜨는 건 `4개월 전`이지만
             `dateTime`에는 원본 ISO가 남아 표기 방식과 무관하게 값이 보존된다.
          ⚠️ **정확한 날짜를 버리지 않는다.** 상대 표기는 감을 주는 것이고, 며칠인지
             정확히 봐야 하는 사람도 있다 — `title`로 그대로 남긴다(§정직성).
          ⚠️ 미래 날짜면 `formatElapsed`가 `null`을 준다(시계 어긋남·이상한 BE 값).
             `-3일 전`을 지어내느니 절대 날짜로 물러선다.
          ⚠️ **`—`와 `기록일 미상`을 가른다.** 둘 다 `—`로 두면 기록이 남아 있는 줄이
             `남은 게 없다`로 읽힌다 — 같은 줄에서 지우기 버튼은 살아 있고 확인 창은
             `1.5GB가 삭제됩니다`라고 말하니 셀만 다른 소리를 한다. 이 표에서 `—`는
             **남은 게 없다는 뜻 하나**로 쓴다(위 문단).
          ⚠️ 못 읽는 값도 `<time>` 안에 둔다. 화면에는 안 내보내지만 `dateTime`에 원본이
             남아야 무엇이 잘못 왔는지 볼 수 있다 — 화면에서 감추는 것과 값을 버리는 것은 다르다.
        */}
        {!hasRecords ? (
          "—"
        ) : hasRecordedOn ? (
          <time dateTime={project.lastRecordedAt} title={recordedOn}>
            {formatElapsed(project.lastRecordedAt, today) ?? recordedOn}
          </time>
        ) : (
          <time dateTime={project.lastRecordedAt} title="기록일을 읽을 수 없습니다">
            기록일 미상
          </time>
        )}
      </td>
      {/*
        ⚠️ **줄마다 버튼이 있다 없다 하지 않는다.** 전에는 지울 수 있는 줄에만 그려서, 다섯
           줄 중 둘에만 아이콘이 떠 있어 왜 어떤 줄엔 없는지 알 수 없었다 — 열이 비면
           기능이 없는 건지 이 줄만 안 되는 건지 구분이 안 된다.
           **자리는 늘 두고, 못 지우는 줄은 잠근다.** 이유는 `title`이 말한다(§정직성).
        ⚠️ 오른쪽에 여백(`pr-5`)을 줘 **안쪽으로 당긴다.** 표 맨 끝에 붙이면 카드 모서리에
           닿아 혼자 밀려난 것처럼 보인다.
        ⚠️ 머리의 `전체 N개`가 **이 아이콘에 세로축을 맞춘다** — 움직이는 쪽은 그쪽이다.
        ⚠️ 뜻은 `aria-label`이 말한다 — 휴지통 그림만으로는 **무엇을** 지우는지 알 수 없다.
      */}
      <td className="py-3.5 pr-5 pl-0 text-center">
        {canManage && (
          <button
            type="button"
            disabled={!isDeletable}
            onClick={() => onDelete(project)}
            aria-label={
              isDeletable ? `${project.name} 기록 삭제` : `${project.name} — ${blockedReason}`
            }
            title={isDeletable ? "기록 삭제" : blockedReason}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden disabled:opacity-30"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </td>
    </tr>
  );
}
