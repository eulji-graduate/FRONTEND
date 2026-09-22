import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getProgressPercent, splitDepartments } from "@/features/project/lib";
import type { ProjectListItem as ProjectListItemModel } from "@/features/project/types";
import { formatMonthDayWeekday } from "@/lib/date";
import { paletteColorByName } from "@/lib/palette";

/**
 * 프로젝트 목록 — **표다**(2026-08-10 전환).
 *
 * ⚠️ 전에는 목록(`ul`/`li`)이었는데, 줄마다 같은 종류의 값(진척·마감·참여 팀)이 반복되고
 *    사람이 그것들을 **세로로 비교하며** 읽는다 — 그러면 표다(`storage/project-storage-table`과
 *    같은 판단). 목록일 때는 열 머리글이 없어서 `0%`·`9월 5일(토)까지`가 무슨 값인지
 *    화면에 적혀 있지 않았다.
 * ⚠️ 열 폭은 **비율(%)**이다. px로 고정하면 남는 폭을 첫 열이 통째로 먹어 넓은 화면에서
 *    이름 오른쪽만 비고 나머지가 구겨진다. `table-fixed`가 있어야 이 값이 실제로 먹는다.
 * ⚠️ 좁아지면 가로로 스크롤한다(§레이아웃: 표는 `overflow-x-auto`로 감싼다).
 */
interface ProjectListTableProps {
  projects: readonly ProjectListItemModel[];
}

export function ProjectListTable({ projects }: ProjectListTableProps) {
  return (
    <div className="border-border overflow-x-auto border-t">
      <table className="w-full min-w-[760px] table-fixed text-[13px]">
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[20%]" />
          <col className="w-[16%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead>
          {/*
            ⚠️ 머리에 **띠**를 깐다(DESIGN §3) — 보더 한 줄만으로는 머리와 본문이 같은 면으로
               읽혀 표가 어디서 시작하는지 흐리다.
            ⚠️ **이름만 왼쪽**이고 나머지는 가운데다. 이름은 길이가 제각각이라 가운데로 모으면
               왼쪽 끝이 들쭉날쭉해져 세로로 훑을 수가 없다.
          */}
          <tr className="text-muted-foreground bg-secondary/50 border-border border-b text-[12px] leading-4">
            <th className="px-7 py-3 text-left font-normal">프로젝트</th>
            {/*
              ⚠️ 머리글은 **막대+숫자 묶음의 가운데**에 선다. 칸 가운데에 두면 막대 위에
                 얹히고, 숫자에 맞추면 오른쪽 끝에 붙어 묶음과 따로 논다 — 이 열이 가리키는
                 값은 둘을 합친 하나다.
              ⚠️ 폭 138은 **묶음 폭 그대로**다(막대 96 + 간격 8 + 숫자 34). 묶음이 오른쪽 끝에
                 서므로 같은 폭을 오른쪽에 붙이고 그 안에서 가운데로 둔다 — 묶음 규격이 바뀌면
                 이 값도 같이 바뀐다.
            */}
            <th className="px-4 py-3 font-normal">
              <span className="ml-auto block w-[138px] text-center">진척</span>
            </th>
            <th className="px-4 py-3 text-center font-normal">마감</th>
            {/*
              ⚠️ 참여 팀만 **왼쪽**이다. 배지 개수가 줄마다 달라(둘·셋 또는 `+N`) 가운데로 두면
                 묶음 전체가 좌우로 밀려, 같은 `개발팀`이 줄마다 다른 자리에 선다 —
                 왼쪽으로 붙이면 첫 배지가 늘 같은 세로선에서 시작한다.
              ⚠️ 머리글은 **9px 오른쪽에서 시작한다**(`pl-[25px]`, 칸 여백 16 + 배지 안쪽 9).
                 상자(배지) 왼쪽 끝에 머리글을 맞추면 배지 **글자**는 안쪽 여백만큼 밀려 있어
                 `참여 팀`과 `개발팀`이 9px 어긋나 보인다(실측) — 맞춰야 하는 건 상자가 아니라
                 글자다(DESIGN §3: 상자를 한쪽 끝에 맞추면 글자끼리 어긋난다).
              ⚠️ 이 값은 **배지 규격에서 나온다**(`px-2` + 보더 1px). 배지 여백이 바뀌면 같이 잰다.
            */}
            <th className="py-3 pr-6 pl-[25px] text-left font-normal">참여 팀</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <Row key={project.id} project={project} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 한 줄.
 *
 * ⚠️ "Owner" 라벨은 두지 않는다 — 프로젝트는 전부 Owner 개설이라 이 목록에선 모든 줄이 같아
 *    노이즈다. 최상위 구분 라벨은 프로젝트·회의·액션이 섞이는 화면에서만 의미가 있다.
 * ⚠️ 참여 팀은 **링크 밖**이라 눌러도 이동하지 않는다 — 팀 상세가 없다. 2개까지 + `+N`,
 *    hover 시 전체 목록.
 */
function Row({ project }: { project: ProjectListItemModel }) {
  const percent = getProgressPercent(project.actionDone, project.actionTotal);
  const { visible, overflow } = splitDepartments(project.departments);
  const due = formatMonthDayWeekday(project.dueDate);
  /* ⚠️ 사용자가 저장한 색을 그대로 쓴다 — 태그 이름 해시가 아니다(§palette). */
  const tagColor = paletteColorByName(project.tagColor);

  const visibleTeamBadges = visible.map((team) => (
    <Badge key={team} variant="outline" className="shrink-0">
      {team}
    </Badge>
  ));

  return (
    <tr className="group border-border hover:bg-foreground/[0.04] transition-colors not-first:border-t">
      {/*
        ⚠️ 줄 왼쪽 세로 띠가 그 프로젝트의 색이다(`lib/palette`). `relative`로 칸 안에 절대배치한다 —
           `border-left`로 그리면 hover 배경이 띠까지 덮고 줄 사이 구분선과 모서리에서 겹친다.
        ⚠️ 띠는 `aria-hidden`이다 — 색이 말하는 건 태그 글자가 이미 말한다.
      */}
      <td className="relative px-7 py-3.5">
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: tagColor.solidColor }}
          aria-hidden
        />

        {/* 줄 전체가 아니라 **이름 칸**이 상세로 간다 — 참여 팀은 링크 밖이어야 한다 */}
        <Link href={`/app/projects/${project.id}`} className="block min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            {/* 칩 규격은 회의 목록 카드(`meeting-card.tsx`)와 같다 — `font-mono`는 안 쓴다 */}
            <span
              className="shrink-0 rounded px-1.5 py-px text-[11px] leading-4 font-medium"
              style={{ backgroundColor: tagColor.bgColor, color: tagColor.textColor }}
            >
              {project.tag}
            </span>
            <span className="truncate font-medium">{project.name}</span>
          </span>
          {/* 세부 설명은 길 수 있어 첫 줄만 자른다 */}
          <p className="text-muted-foreground line-clamp-1 pt-1 text-[12px] leading-4">
            {project.description}
          </p>
        </Link>
      </td>

      {/*
        진척 — 막대와 숫자를 한 묶음으로 두되 숫자 자리를 고정해 `100%`에서도 안 밀린다.
        ⚠️ 막대 색이 **그 프로젝트의 색**이다(저장소 표와 같은 방식). 먹색 하나로 칠하면
           줄마다 같은 막대가 되어 어느 프로젝트 것인지 왼쪽 태그를 다시 봐야 한다.
        ⚠️ 원색(`--tag-*-solid`)을 쓴다 — 칩 글자색은 4.5:1을 맞추려 진해서 막대에 쓰면 탁하다.
        ⚠️ 트랙은 **먹색 10%** 다. `--muted`는 흰 카드와 1.02:1이라 0%일 때 바가 통째로
           사라져 그려지다 만 것처럼 보였다.
      */}
      <td className="px-4 py-3.5">
        <span className="flex items-center justify-end gap-2">
          <span
            className="bg-foreground/10 h-1.5 w-24 shrink-0 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${project.name} 진척`}
          >
            <span
              className="block h-full rounded-full"
              style={{ width: `${percent}%`, backgroundColor: tagColor.solidColor }}
            />
          </span>
          <span className="text-foreground w-[34px] text-right font-medium tabular-nums">
            {percent}%
          </span>
        </span>
      </td>

      {/* 날짜만 두면 마감으로 안 읽혀 `까지`를 붙인다 */}
      <td className="text-muted-foreground px-4 py-3.5 text-center tabular-nums">
        {due ? `${due}까지` : "-"}
      </td>

      <td className="py-3.5 pr-6 pl-4">
        {/*
          ⚠️ **`+N`은 열의 맨 오른쪽 끝에 붙인다**(`ml-auto`). 팀 배지 뒤에 바로 붙여 두면
             그것 때문에 앞 배지들이 왼쪽으로 밀려, 초과가 있는 줄만 `개발팀`이 다른 자리에
             선다 — 초과 개수는 팀 이름과 다른 종류의 값이라 자기 자리가 따로 있어야 한다.
          ⚠️ 초과가 없는 줄에 **빈 자리를 남기지 않는다.** 배지가 왼쪽 정렬이라 그 자리는
             배지 위치에 아무 영향이 없다 — 뜻 없는 여백만 생긴다.
          ⚠️ 지금 목 데이터에서는 `+N`이 안 뜬다(가장 큰 프로젝트가 팀 셋이고 한도가 셋이다).
             팀이 넷 이상인 프로젝트에서 다시 나온다.
        */}
        <div
          className="flex items-center gap-1"
          aria-label={`참여 팀: ${project.departments.join(", ")}`}
        >
          {overflow > 0 ? (
            <Tooltip>
              {/*
                  ⚠️ **`tabIndex`가 있어야 키보드로 열린다.** trigger 를 `span` 으로
                     그리면 포커스를 못 받아, 마우스를 올릴 수 없는 사람은 가려진 팀
                     이름을 볼 방법이 없다(DnD 보드에 키보드 경로를 둔 것과 같은 이유).
                     스크린리더는 위 `aria-label`이 이미 전체 목록을 읽어 준다.
                */}
              <TooltipTrigger
                tabIndex={0}
                render={<span className="flex flex-1 items-center gap-1" />}
              >
                {visibleTeamBadges}
                <Badge variant="secondary" className="ml-auto shrink-0">
                  +{overflow}
                </Badge>
              </TooltipTrigger>
              {/* 아래쪽·가로 나열 — 세로 목록은 선택형 드롭다운처럼 보인다 */}
              <TooltipContent side="bottom" className="max-w-none">
                <span className="whitespace-nowrap">{project.departments.join(" · ")}</span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="flex flex-1 items-center gap-1">{visibleTeamBadges}</span>
          )}
        </div>
      </td>
    </tr>
  );
}
