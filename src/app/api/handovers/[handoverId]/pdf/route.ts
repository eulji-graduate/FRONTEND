import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";

import { HANDOVER_TYPE } from "@/constants/domain";
import { getAccessToken } from "@/features/auth/session";
import { HandoverPdfDocument } from "@/features/handover/pdf/HandoverPdfDocument";
import type {
  BeHandoverInsightResponse,
  BeHandoverPackageResponse,
} from "@/features/handover/pdf/mapper";
import { toHandoverPdfData } from "@/features/handover/pdf/mapper";
import { buildMockHandoverPdfData } from "@/features/handover/pdf/mock";
import { findMockLeaderHandover } from "@/features/leader-handover/mock/leader-handovers";
import { findMockManagedMember } from "@/features/member/mock/managed";
import { ApiError, serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

/**
 * 인수인계서 PDF 다운로드 — **BFF**. 세 화면(팀장 중간승인·오너 최종승인·팀장 귀속)의
 * "인수인계서 PDF 다운로드" 버튼이 같은 경로를 부른다(§HandoverPdfDocument 주석).
 *
 * ⚠️ **Node 런타임이어야 한다** — `@react-pdf/renderer`가 Node의 폰트·버퍼 API를 쓴다.
 * ⚠️ 파일이 브라우저 새 탭으로 바로 열리므로(`window.open`) **본문에 토큰이 안 실린다** —
 *    같은 오리진 요청이라 httpOnly 쿠키가 자동으로 붙는다(§핵심 4원칙 ②).
 */
export const runtime = "nodejs";

interface BeHandoverBasic {
  writerNameSnap: string;
  teamNameSnap: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handoverId: string }> },
) {
  const { handoverId } = await params;

  /*
    ⚠️ **mock 모드는 로그인 쿠키가 없다** — `getViewer()`가 세션 없이 고정 역할을 돌려주는
       것과 같은 이유(§team-handover/server.ts 등). 토큰을 mock 분기보다 먼저 요구하면
       mock 화면에서도 이 경로가 항상 401이 된다.
  */
  let data;
  if (isMock) {
    data = buildMockPdfData(handoverId);
  } else {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return new Response("인증이 필요합니다.", { status: 401 });
    }
    data = await fetchRealPdfData(handoverId, accessToken);
  }

  if (data === null) {
    return new Response("인수인계서를 찾을 수 없습니다.", { status: 404 });
  }
  if (data === "forbidden") {
    return new Response("이 인수인계서에 접근할 권한이 없습니다.", { status: 403 });
  }

  const buffer = await renderToBuffer(HandoverPdfDocument({ data }));
  const fileName = encodeURIComponent(`${data.writerName}_${data.teamNameSnap}_인수인계서.pdf`);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="handover.pdf"; filename*=UTF-8''${fileName}`,
    },
  });
}

async function fetchRealPdfData(handoverId: string, accessToken: string) {
  const id = Number(handoverId);
  if (!Number.isInteger(id) || id <= 0) return null;

  try {
    const [basic, pkg, insight] = await Promise.all([
      serverApi<BeHandoverBasic>(ep.handover(id), { accessToken }),
      serverApi<BeHandoverPackageResponse>(ep.handoverPackage(id), { accessToken }),
      serverApi<BeHandoverInsightResponse>(ep.handoverInsights(id), { accessToken }),
    ]);
    return toHandoverPdfData(basic.teamNameSnap, pkg, insight);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    if (error instanceof ApiError && error.status === 403) return "forbidden" as const;
    throw error;
  }
}

/**
 * mock 데이터는 화면마다 다른 저장소(팀장 귀속=`leader-handover` mock, 나머지=`member` mock)를
 * 쓴다 — 새 mock을 또 만들지 않고 이미 있는 걸 그대로 읽는다(§Mock 격리막).
 */
function buildMockPdfData(handoverId: string) {
  const leaderHandover = findMockLeaderHandover(handoverId);
  if (leaderHandover) {
    return buildMockHandoverPdfData({
      writerName: leaderHandover.formerLeaderName,
      writerPosition: "팀장",
      teamName: leaderHandover.teamName,
      lastWorkingDay: leaderHandover.offboardingApprovedAt,
      items: leaderHandover.actions.map((action) => ({
        title: action.title,
        status: action.status,
        deadline: action.dueDate,
        projectTag: action.projectTag,
        sourceMeetingTitle: null,
      })),
    });
  }

  const memberId = Number(handoverId);
  if (!Number.isInteger(memberId)) return null;
  const detail = findMockManagedMember(memberId);
  const pendingHandover = detail?.pendingHandover;
  if (!detail || !pendingHandover || pendingHandover.type !== HANDOVER_TYPE.OFFBOARDING)
    return null;

  return buildMockHandoverPdfData({
    writerName: detail.member.name,
    writerPosition: detail.member.position,
    teamName: detail.member.teamName ?? "",
    lastWorkingDay: pendingHandover.midApproval?.approvedAt ?? "",
    /*
      ⚠️ 목 분기라 `actions`는 항상 채워져 온다(`findMockManagedMember`). 그래도 `?? []`로
         받는다 — 실서버에서 이 값은 `null`일 수 있고(못 읽었다는 뜻, §manage-types),
         그때 여기서 터지면 인수인계서 PDF가 통째로 안 나온다.
    */
    items: (detail.actions?.items ?? []).map((action) => ({
      title: action.title,
      status: action.status,
      deadline: action.dueDate,
      projectTag: "",
      sourceMeetingTitle: null,
    })),
  });
}
