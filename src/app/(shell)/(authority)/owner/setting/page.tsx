import type { Metadata } from "next";

import { AccessDenied } from "@/components/common/access-denied";
import { CompanyPositionCard } from "@/features/company/components/company-position-card";
import { CompanyProfileCard } from "@/features/company/components/company-profile-card";
import { CompanyTeamCard } from "@/features/company/components/company-team-card";
import { getCompanySetting } from "@/features/company/server";
import { roleHome } from "@/features/shell/home";
import { getViewer } from "@/features/shell/viewer";
import { canManageCompany } from "@/lib/permission";

/*
  ⚠️ **정적으로 굳히지 않는다.** 저장하면 값이 바뀌는 화면이라 빌드 시각 값이 박히면
     방금 고친 게 안 보인다. 세션이 붙으면 `getViewer()`가 쿠키를 읽어 저절로 동적이 되지만,
     목인 지금은 동적 신호가 없어 `○`(Static)으로 빌드된다 — 그때 지워도 되는 줄이다.
*/
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "기업 설정",
};

/**
 * 기업 설정 — 사업자 정보와 **조직 체계**를 고친다.
 *
 * ⚠️ **OWNER 전용**이다(§라우트 그룹). Admin 겸직으로는 안 연다 —
 *    직급의 권한이 여기서 나와서, 열어주면 자기 위를 스스로 만들 수 있다.
 *    화면 가드는 UX일 뿐이고 **각 저장 액션이 `canManageCompany`로 서버에서 다시 본다**(§권한).
 * ⚠️ 탭으로 나누지 않는다. 세 덩이뿐이라 한 화면에 쌓아도 읽히고,
 *    탭은 **무엇이 있는지 감추기만** 한다.
 * ⚠️ 폭은 **1440**이다 — 저장소 관리·구독과 같은 전폭 카드다(DESIGN §4 목록·표).
 *    720(폼 한 장)으로 두면 사이드바로 오갈 때 이 화면만 본문이 좁아져 튄다.
 *    대신 기본 정보 카드는 안에서 반으로 나눠 왼쪽에 지도, 오른쪽에 입력칸을 둔다 —
 *    표는 넓을수록 좋지만 입력칸은 아니라, 입력칸에는 따로 상한을 건다.
 * ⚠️ 편집 조각은 온보딩 것을 그대로 쓴다 — 두 벌이면 한쪽만 고쳐지고 조작이 갈린다.
 */
export default async function OwnerSettingPage() {
  const viewer = await getViewer();

  /*
    ⚠️ **403이다**(2026-08-11 뒤집음). 전에는 "있다는 사실 자체를 안 알린다"며 `notFound()`로
       뒀는데, 기업 설정 화면이 있다는 것은 랜딩의 역할 안내(`/roles`)에도 적혀 있어 숨겨서
       지킬 것이 없었다 — 정작 잃는 건 **잘못 온 사람이 다음에 무엇을 할지**다(§정직성).
    ⚠️ 값 자체는 여전히 안 나간다. 판정이 조회보다 **앞**이라 권한 없는 요청은 BE까지 가지 않는다.
       ⚠️ 그래서 `Promise.all`로 묶지 않는다 — 나란히 부르면 판정 전에 조회가 한 번 나가고,
          그 조회가 403을 던지면 이 화면 대신 에러 화면이 뜬다.
  */
  if (!canManageCompany(viewer)) return <AccessDenied homeHref={roleHome(viewer.role)} />;

  const setting = await getCompanySetting();

  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        <CompanyProfileCard profile={setting.profile} />

        {/*
          ⚠️ 조직 카드 둘은 **나란히** 둔다. 트리도 직급도 보여 줄 게 `이름`과 `구분` 둘뿐이라,
             1440 한 줄을 통째로 주면 이름은 왼쪽 끝, 뱃지는 오른쪽 끝에 붙고 가운데가 텅 빈다
             (저장소 표는 열이 여섯이라 채워지는 것이고, 열 둘짜리 목록은 그렇지 않다).
          ⚠️ 성격도 같다 — 둘 다 온보딩에서 만든 조직 체계를 나중에 고치는 자리다.
        */}
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
          <CompanyTeamCard
            initial={setting.departments}
            memberCounts={setting.teamMemberCounts}
            roleMemberCounts={setting.roleMemberCounts}
          />
          <CompanyPositionCard initial={setting.positions} />
        </div>
      </div>
    </div>
  );
}
