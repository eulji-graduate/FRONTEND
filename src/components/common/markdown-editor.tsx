"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, List, ListOrdered, Quote } from "lucide-react";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** `tiptap-markdown`은 core `Storage` 타입을 확장 선언하지 않아 직접 캐스팅해야 한다. */
function getMarkdown(editor: Editor): string {
  return (editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown();
}

interface ToolbarItem {
  key: string;
  /** 버튼 이름 — `aria-label`과 hover 툴팁에 그대로 쓴다(국룰 워딩, 하드코딩이지만 여기 하나뿐이다) */
  label: string;
  icon: typeof Bold;
  run: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
}

const TOOLBAR_ITEMS: ToolbarItem[] = [
  {
    key: "bold",
    label: "굵게",
    icon: Bold,
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
  },
  {
    key: "italic",
    label: "기울이기",
    icon: Italic,
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
  },
  {
    key: "heading",
    label: "크게",
    icon: Heading2,
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
  },
  {
    key: "bulletList",
    label: "글머리 기호",
    icon: List,
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
  },
  {
    key: "orderedList",
    label: "번호 매기기",
    icon: ListOrdered,
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
  },
  {
    key: "blockquote",
    label: "인용 블록",
    icon: Quote,
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
  },
];

interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

/**
 * 마크다운 작성 폼 — Tiptap을 쓰지만 저장·전송 값은 항상 **마크다운 평문**이다
 * (`tiptap-markdown`이 편집 중 HTML 문서 ↔ 마크다운 문자열을 오간다). 서버는 이 문법이
 * 섞인 평문을 그대로 받는다 — 렌더링(`MarkdownContent`)만 다시 해석한다.
 *
 * ⚠️ **컨텐츠에디터블은 안 접힌다.** 다른 입력들처럼 값만 받아 그리므로 `useState`로
 *    감싼 부모(`use-notice-form.ts`)가 `body`를 그대로 들고 있다가 `FormData`로 함께 낸다.
 * ⚠️ **본문만 안에서 스크롤한다.** 제목 입력·이 툴바는 모달의 고정 영역에 얹히고,
 *    글이 길어지면 `EditorContent`를 감싼 안쪽 상자만 늘어나지 않고 스크롤된다 —
 *    그래야 창을 열 때마다 툴바 자리가 흔들리지 않는다.
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  ariaInvalid,
  ariaDescribedBy,
}: MarkdownEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(getMarkdown(editor));
    },
    editorProps: {
      attributes: {
        id: id ?? "",
        role: "textbox",
        "aria-multiline": "true",
        "aria-invalid": String(Boolean(ariaInvalid)),
        ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
        class:
          "min-h-[280px] w-full text-[13px] leading-[22px] outline-none [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:text-[14px] [&_h2]:font-semibold [&_blockquote]:border-border [&_blockquote]:border-l-2 [&_blockquote]:pl-3",
      },
    },
  });

  return (
    <div
      className={cn(
        "border-input focus-within:border-ring focus-within:ring-ring/50 flex flex-col rounded-lg border bg-transparent transition-colors focus-within:ring-3",
        ariaInvalid && "border-destructive",
      )}
    >
      {/*
        ⚠️ **오른쪽 정렬이다.** 서식 버튼은 여섯 개뿐이라 왼쪽에 붙이면 오른쪽이 텅 비어
           칸이 안 찬 것처럼 보인다 — 끝에 모아 두면 내용 쪽(왼쪽)이 먼저 읽힌다.
      */}
      <div className="border-border flex shrink-0 items-center justify-end gap-1 border-b px-2 py-1.5">
        {TOOLBAR_ITEMS.map(({ key, label, icon: Icon, run, isActive }) => {
          const active = editor ? isActive(editor) : false;
          return (
            <Tooltip key={key}>
              <TooltipTrigger
                type="button"
                delay={100}
                closeDelay={200}
                title={label}
                aria-label={label}
                aria-pressed={active}
                onClick={() => editor && run(editor)}
                className={cn(
                  // hover — 기존에 눌린 상태에만 있던 정도의 옅은 하이라이트를 그대로 가져온다
                  "text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1.5 transition-colors disabled:opacity-50",
                  // 선택된 상태 — hover보다 한 단계 더 진하게, 색이 아니라 명도로 구분한다
                  active &&
                    "bg-foreground text-background hover:bg-foreground hover:text-background",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="max-h-[320px] overflow-y-auto px-2.5 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
