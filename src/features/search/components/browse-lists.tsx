import { ProfileAvatar } from "@/components/common/profile-avatar";
import { ProjectTag } from "@/components/common/project-tag";
import { AUTHORITY_BADGE_CLASS, AUTHORITY_LABEL } from "@/constants/authority";
import { pickPaletteColor } from "@/lib/palette";

import type { PersonBrowseItem, ProjectBrowseItem } from "../types";
import { RecordViewLink } from "./record-view-link";
import { SearchSection } from "./search-section";

interface BrowseProjectsProps {
  projects: ProjectBrowseItem[];
}

/** 검색어 없이 프로젝트를 훑어보는 목록 — 순수 이동이라 서버에서 그린다 */
export function BrowseProjects({ projects }: BrowseProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <SearchSection title="프로젝트로 찾기" meta={`${projects.length}개`}>
      {/*
        ⚠️ **줄마다 자기 카드다**(시안). 구분선으로 이어 붙인 한 덩이가 아니라, 낱장이 쌓인
           모양이다 — 훑다가 하나를 고르는 화면이라 줄이 각각 눌리는 것처럼 보여야 한다.
        ⚠️ 그래서 `divide-y`가 아니라 `gap`이다. 선으로 이으면 표가 되고, 표는 값을 비교하는
           자리지 고르는 자리가 아니다.
      */}
      <ul className="flex flex-col gap-2">
        {projects.map((project) => (
          <li key={project.id}>
            <RecordViewLink
              kind="PROJECT"
              itemId={project.id}
              href={`/app/projects/${project.id}`}
              className="border-border bg-card hover:border-foreground/25 focus-visible:ring-ring flex items-stretch gap-2.5 rounded-xl border py-3 pr-4 pl-3 text-[13px] transition-colors focus-visible:ring-2 focus-visible:outline-hidden [&>*:not(:first-child)]:self-center"
            >
              {/*
                ⚠️ **최근 본 항목과 같은 색 막대를 세운다.** 거기만 막대가 있고 여기는 없으니
                   같은 화면의 목록 셋이 따로 놀았다 — 같은 종류의 줄은 같은 언어로 읽혀야 한다.
                ⚠️ 칩과 겹치는 게 아니다. 칩은 **어느 프로젝트인지**(글자), 막대는 **훑을 때
                   걸리는 표식**(색)이다 — 눈은 글자를 읽기 전에 색을 먼저 본다.
              */}
              <span
                className="w-1 shrink-0 self-stretch rounded-full"
                style={{ backgroundColor: pickPaletteColor(project.tag).solidColor }}
                aria-hidden
              />
              <ProjectTag tag={project.tag} />
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
              <span className="text-muted-foreground shrink-0 text-[12px] leading-4 tabular-nums">
                회의 {project.meetingCount}건
              </span>
            </RecordViewLink>
          </li>
        ))}
      </ul>
    </SearchSection>
  );
}

interface BrowsePeopleProps {
  people: PersonBrowseItem[];
}

/**
 * 검색어 없이 사람을 훑어보는 목록.
 * ⚠️ **구성원 상세 화면이 없다** — 눌러도 갈 곳이 없어 링크로 만들지 않는다(§명세에 없는 기능은 안 만든다).
 */
export function BrowsePeople({ people }: BrowsePeopleProps) {
  if (people.length === 0) return null;

  return (
    <SearchSection title="사람으로 찾기" meta={`${people.length}명`}>
      <ul className="flex flex-col gap-2">
        {people.map((person) => (
          <li
            key={person.id}
            className="border-border bg-card flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[13px]"
          >
            {/*
              ⚠️ **얼굴 자리를 둔다**(시안). 이름 넉 자만 있는 줄이 넷 쌓이면 어느 줄이
                 어느 사람인지 눈이 못 붙잡는다 — 색이 다른 동그라미가 그 일을 한다.
              ⚠️ 아바타는 **공용 훅**이 만든다(`useProfileAvatar`). 이름 첫 글자를 직접 그리면
                 같은 사람이 화면마다 다른 색으로 나온다.
            */}
            <ProfileAvatar userId={person.id} size={26} />
            <span className="min-w-0 flex-1 truncate">{person.name}</span>
            <span
              className={`${AUTHORITY_BADGE_CLASS[person.authority]} shrink-0 rounded px-1.5 py-0.5 text-[11px] leading-4`}
            >
              {AUTHORITY_LABEL[person.authority]}
            </span>
          </li>
        ))}
      </ul>
    </SearchSection>
  );
}
