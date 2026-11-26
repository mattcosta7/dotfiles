'use client';

export default function RichTextArea() {
  return <div contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" />;
}
