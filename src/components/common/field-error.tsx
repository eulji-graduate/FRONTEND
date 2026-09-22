import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 칸 밑에 붙는 **검증 오류 한 줄**.
 *
 * ⚠️ 폼 검증 오류는 토스트가 아니라 **필드 인라인**이다(DESIGN §7). 토스트는 사라지는데
 *    고쳐야 할 칸은 화면에 남아 있어서, 몇 초 뒤에 온 사람은 무엇이 잘못됐는지 알 수 없다.
 * ⚠️ **동그라미 느낌표를 함께 둔다.** 빨간 글자만으로 알리면 앞뒤 회색 문장에 묻히고,
 *    색을 못 보는 사람에게는 오류라는 사실 자체가 사라진다(§a11y — 색이 유일한 단서가 되면 안 된다).
 * ⚠️ 아이콘 크기·간격은 로그인 폼(`auth-field.tsx`)과 같은 값이다. 화면마다 다르면 같은
 *    오류가 다른 물건처럼 보인다.
 * ⚠️ 한글은 아이콘보다 살짝 떠 보여 **1px 내린다**(§아이콘 옆 한글 정렬).
 * ⚠️ `role="alert"` — 스크린리더가 오류를 그 자리에서 읽는다.
 *
 * `reserveSpace`를 켜면 오류가 없어도 한 줄 높이를 비워 둔다. 타이핑하다 오류가 생길 때
 * 아래 칸이 밀려 내려가는 걸 막는다 — 칸이 여럿 쌓인 폼에서 쓴다.
 */
interface FieldErrorProps {
  message?: string;
  /**
   * 입력칸의 `aria-describedby`가 가리킬 id.
   *
   * ⚠️ **웬만하면 준다.** `role="alert"`은 오류가 뜨는 **그 순간**만 읽어 준다 — 나중에
   *    입력칸으로 돌아온 사람은 무엇이 잘못됐는지 다시 들을 방법이 없다. 칸에
   *    `aria-describedby`로 이 id를 걸어 두면 칸에 초점이 갈 때마다 함께 읽힌다.
   */
  id?: string;
  reserveSpace?: boolean;
  className?: string;
}

export function FieldError({ message, id, reserveSpace = false, className }: FieldErrorProps) {
  if (!message && !reserveSpace) return null;

  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "text-destructive flex items-start gap-1.5 text-[12px] leading-4 break-keep",
        reserveSpace && "min-h-4",
        className,
      )}
    >
      {message && (
        <span className="flex h-4 shrink-0 items-center">
          <CircleAlert className="size-3.5" aria-hidden />
        </span>
      )}
      <span>{message}</span>
    </p>
  );
}
