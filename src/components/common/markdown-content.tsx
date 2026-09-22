import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * 마크다운 평문 렌더링 — `rehype-sanitize`로 거른다(§AI 기능: 마크다운=XSS 방어 필수,
 * 사용자가 쓰는 공지 본문도 같은 위험이라 같은 방어를 쓴다).
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "max-w-[720px] text-[13px] leading-[22px] break-words",
        "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-[17px] [&_h1]:font-semibold",
        "[&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-[15px] [&_h2]:font-semibold",
        "[&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-[14px] [&_h3]:font-semibold",
        "[&_a]:text-primary [&_strong]:text-foreground [&_a]:underline [&_em]:italic [&_strong]:font-semibold",
        "[&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3",
        "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px]",
        "[&_hr]:border-border [&_hr]:my-4",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
