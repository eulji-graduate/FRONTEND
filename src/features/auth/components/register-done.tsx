import { KeyRound, Mail, Search } from "lucide-react";
import Link from "next/link";

import { ZDoneMark } from "@/components/common/z-done-mark";

import { AuthCard } from "./auth-card";

/**
 * 신청 완료 — 이제 뭐가 일어나는지 알려 주는 화면.
 *
 * ⚠️ "가입 완료"가 아니다. **접수**됐을 뿐이고 승인이 남았다 — 바로 로그인되는 줄 알고
 *    기다리는 사람이 없게 다음 단계를 셋으로 나눠 보여 준다(§정직성).
 * ⚠️ 지금 BE는 신청 즉시 계정 메일을 보낸다. 그래도 "검토 후 승인" 문구를 유지한다 —
 *    시스템 관리자 승인 흐름이 예정돼 있어(팀 결정) 문구를 두 번 갈아엎지 않는다.
 */
const NEXT_STEPS = [
  { icon: Search, title: "검토", text: "적어 주신 회사 정보를 확인합니다" },
  { icon: Mail, title: "발송", text: "승인되면 담당자 메일로 기업 코드를 보내요" },
  { icon: KeyRound, title: "시작", text: "받은 코드로 로그인하면 워크스페이스가 열려요" },
] as const;

export function RegisterDone() {
  return (
    <AuthCard
      mark={<ZDoneMark />}
      title="신청이 접수됐습니다"
      // ⚠️ **처리 기한을 숫자로 약속하지 않는다.** 승인을 사람이 하는데 운영 인력이
      //    정해지지 않았다 — 못 지킬 기한을 적으면 그게 그대로 항의가 된다(§정직성).
      description="검토가 끝나면 담당자 메일로 결과를 보내 드립니다"
    >
      {/*
        ⚠️ 설명을 제목 **아래**가 아니라 오른쪽 끝에 둔다. 아래로 쌓으면 글이 전부 왼쪽에
           몰리고 카드 오른쪽 절반이 텅 빈다 — 한 줄로 펴서 양끝을 잡아 준다.
           온보딩 완료의 요약 카드(`DoneSummary`)와 같은 문법이다(왼쪽 이름 · 오른쪽 값).
        ⚠️ 좁아지면 설명이 아래로 내려앉는다(`flex-wrap`) — 눌러 담아 두 글자씩 끊기지 않게.
      */}
      <ol className="flex flex-col gap-2.5">
        {NEXT_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="border-border bg-secondary flex items-center gap-3.5 rounded-lg border px-4 py-3.5"
          >
            <span className="bg-foreground text-background flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] leading-none tabular-nums">
              {index + 1}
            </span>

            {/*
              ⚠️ 넓으면 제목 왼쪽 · 설명 오른쪽으로 **한 줄**, 좁아지면 설명이 제목 **아래로** 쌓인다.
                 `flex-wrap`으로 흘려보내면 설명만 오른쪽 끝에 홀로 떨어져 앉아 어색하다 —
                 줄이 바뀌는 순간 정렬 기준도 같이 바뀌어야 한다.
            */}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3.5">
              <span className="flex items-center gap-1.5 text-[13px] leading-5 font-medium">
                <step.icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                {/* 한글이 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
                <span>{step.title}</span>
              </span>
              <span className="text-muted-foreground text-[12px] leading-4 break-keep">
                {step.text}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {/*
        ⚠️ 여기서 [로그인]을 주된 버튼으로 두지 않는다 — 아직 코드가 없어 눌러도 막힌다.
           홈으로 돌아가는 길을 앞에 두고, 코드가 이미 있는 사람만 옆으로 빠지게 한다.
      */}
      <div className="flex flex-col gap-3 pt-7">
        <Link
          href="/"
          className="bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring flex h-12 items-center justify-center rounded-md text-[15px] transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          홈으로 돌아가기
        </Link>
        <p className="text-muted-foreground text-center text-[13px] leading-5">
          코드를 이미 받으셨나요?{" "}
          <Link href="/login" className="text-foreground font-medium hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
