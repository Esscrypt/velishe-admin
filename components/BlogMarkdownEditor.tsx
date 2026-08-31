"use client";

import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type BlogMarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function BlogMarkdownEditor({
  value,
  onChange,
}: BlogMarkdownEditorProps) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        height={360}
        preview="live"
        textareaProps={{
          id: "body",
          "aria-label": "Post body",
        }}
      />
    </div>
  );
}
