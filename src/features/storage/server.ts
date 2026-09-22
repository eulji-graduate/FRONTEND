import "server-only";

import { PROJECT_STATUS, type ProjectStatus } from "@/constants/project";
import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import type { ProjectStorage, StorageOverview } from "./types";

/**
 * 녹음 용량 조회 — **격리막**.
 *
 * ⚠️ 컴포넌트는 반환 타입(`StorageOverview`)만 본다. 연동되면 여기서 `isMock` 분기만
 *    실서버 호출로 바꾸고 매퍼가 shape을 흡수한다 — 화면은 안 바뀐다.
 */

/**
 * 목 — 50GB 중 41.7GB를 쓴 회사(음성 34.9 + 자막·요약 6.8).
 *
 * ⚠️ **총량은 구독·결제 화면과 같은 숫자여야 한다.** 둘 다 같은 회사의 저장 용량인데
 *    다르면 데모에서 화면을 오갈 때 숫자가 어긋난다 — 여기 합계는 `billing/server.ts`의
 *    `voiceStorageGb`(34.9) · `sttStorageGb`(6.8)와 맞춰 둔다. BE가 붙으면 한 소스가 준다.
 *
 * ⚠️ 음성이 자막·요약보다 훨씬 크다. 실제로도 그렇고(오디오 대 텍스트), 그래야
 *    "지울 건 음성"이라는 이 화면의 말이 숫자로도 맞다.
 * ⚠️ 끝난 프로젝트를 **둘** 뒀다 — 지울 수 있는 줄이 하나도 없으면 그 경로를 못 본다.
 */
const MOCK: StorageOverview = {
  voiceGb: 34.9,
  sttGb: 6.8,
  projects: [
    {
      tag: "product-v2",
      name: "제품 v2.0",
      meetingCount: 24,
      voiceGb: 9.1,
      sttGb: 1.4,
      lastRecordedAt: "2026-08-03",
      status: PROJECT_STATUS.IN_PROGRESS,
    },
    {
      tag: "infra-migration",
      name: "인프라 마이그레이션",
      meetingCount: 31,
      voiceGb: 10.9,
      sttGb: 1.7,
      lastRecordedAt: "2026-07-29",
      status: PROJECT_STATUS.IN_PROGRESS,
    },
    {
      tag: "marketing-q3",
      name: "마케팅 캠페인 Q3",
      meetingCount: 18,
      voiceGb: 6.8,
      sttGb: 1.1,
      lastRecordedAt: "2026-08-01",
      status: PROJECT_STATUS.IN_PROGRESS,
    },
    {
      tag: "hr-process",
      name: "HR 프로세스 재정비",
      meetingCount: 12,
      voiceGb: 4.5,
      sttGb: 1.3,
      lastRecordedAt: "2026-03-27",
      status: PROJECT_STATUS.DONE,
    },
    {
      tag: "ops-automation",
      name: "운영 자동화",
      meetingCount: 9,
      voiceGb: 3.6,
      sttGb: 1.3,
      lastRecordedAt: "2025-11-14",
      status: PROJECT_STATUS.DONE,
    },
  ],
};

/**
 * BE shape → UI 계약 (§Mock 격리막).
 *
 * [확인] BE `StorageOverviewResponse`(`metering` 패키지, 2026-08-14 BE PR #494) —
 * BE가 이 화면의 UI 계약(`StorageOverview`)에 필드명을 그대로 맞춰서 냈다(BE 코드 주석에
 * "FE storage/types.ts의 StorageOverview 계약과 필드명을 그대로 맞춘다"라고 명시). 그래도
 * 매퍼를 거친다 — BE 응답 모양이 바뀌어도 고칠 곳이 여기 한 곳이어야 한다.
 *
 * ⚠️ **`sttGb`는 지금 캡션 몫만 반영된다**(BE PR #494 본문 명시) — transcript·요약 리포트는
 *    capture 도메인 연동이 아직 안 붙어서, 실제보다 적게 보일 수 있다. FE가 고칠 수 있는
 *    값이 아니다 — BE가 그 리포트를 붙이면 이 값도 저절로 올라온다.
 * ⚠️ `voiceGb`·`sttGb`는 BE가 이미 소수점 첫째 자리로 반올림해서 준다 — 여기서 다시
 *    반올림하지 않는다.
 */
interface BeProjectStorage {
  tag: string;
  name: string;
  meetingCount: number;
  voiceGb: number;
  sttGb: number;
  /** `2020-01-02` — Jackson이 `LocalDate`를 ISO 문자열로 내린다 */
  lastRecordedAt: string;
  status: ProjectStatus;
}

interface BeStorageOverview {
  voiceGb: number;
  sttGb: number;
  /** ⚠️ 없을 수도 있다고 정직하게 적는다 — `toStorageOverview`의 `?? []` 방어 근거다 */
  projects?: BeProjectStorage[];
}

function toProjectStorage(item: BeProjectStorage): ProjectStorage {
  return {
    tag: item.tag,
    name: item.name,
    meetingCount: item.meetingCount,
    voiceGb: item.voiceGb,
    sttGb: item.sttGb,
    lastRecordedAt: item.lastRecordedAt,
    status: item.status,
  };
}

function toStorageOverview(be: BeStorageOverview): StorageOverview {
  /*
    ⚠️ **빈 회사가 정상이라는 약속을 여기서도 지킨다**(BE PR #494 본문 — "빈 회사는
       0.0GB·빈 배열로 정상 응답"). `projects`가 진짜 `[]`로 온다는 보장은 Jackson
       직렬화 설정에 달려 있어 코드만 보고 100% 확신할 수 없다 — `null`로 와도
       `.map()`이 죽지 않고 똑같이 빈 배열로 접히게 방어한다(§company/mapper.ts의
       `team.roles ?? []`와 같은 이유).
  */
  return {
    voiceGb: be.voiceGb,
    sttGb: be.sttGb,
    projects: (be.projects ?? []).map(toProjectStorage),
  };
}

/**
 * [확인] BE `CompanyStorageController.getStorage` — `GET /api/companies/me/storage`,
 * `@PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")`(`canManageStorage`와 같은 문).
 *
 * ⚠️ 이 엔드포인트 자체가 던지는 도메인 예외는 없다(BE PR #494 본문) — 빈 회사는
 *    0.0GB·빈 배열로 정상 응답한다. 인증 없음·OWNER·ADMIN 아님만 403이고, 그건 화면
 *    가드(`canManageStorage`)가 이미 걸러 이 함수를 부르기 전에 막는다.
 */
export async function getStorageOverview(): Promise<StorageOverview> {
  if (isMock) return MOCK;

  const accessToken = await requireAccessToken();
  const overview = await serverApi<BeStorageOverview>(ep.companyStorage(), { accessToken });
  return toStorageOverview(overview);
}
