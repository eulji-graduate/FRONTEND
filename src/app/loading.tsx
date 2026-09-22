import { ZAssembleLoader } from "@/components/common/z-assemble-loader";

/** 전역 로딩 — 화면이 준비되는 동안 Z 조각이 맞춰진다. */
export default function Loading() {
  return (
    /*
      ⚠️ 배경을 `--background`로 두면 어두운 랜딩으로 들어갈 때 흰 화면이 한 번 번쩍인다.
         랜딩 밝기는 이 시점에 알 수 없으므로 **아무 색도 칠하지 않고** 앞 화면을 그대로 둔다.
    */
    <div className="min-h-screen-z flex items-center justify-center">
      <ZAssembleLoader />
    </div>
  );
}
