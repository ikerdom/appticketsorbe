"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Paperclip } from "lucide-react";
import { compressImage } from "@/lib/compress-image";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  /** Recibe la imagen ya comprimida; debe subirla y devolver el src final, o null si falla (el nodo temporal se retira). */
  onImagePaste: (file: File) => Promise<string | null>;
  placeholder?: string;
  minHeight?: string;
  autoFocus?: boolean;
  /** Si se pasa, Enter envía (llama a esto) y Shift+Enter hace salto de línea — para composers tipo chat. */
  onEnterSubmit?: () => void;
}

export function RichTextEditor({ content, onChange, onImagePaste, placeholder, minHeight = "160px", autoFocus, onEnterSubmit }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true, HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      Placeholder.configure({ placeholder }),
      ...(onEnterSubmit
        ? [Extension.create({
            name: "enterSubmit",
            addKeyboardShortcuts() {
              return {
                Enter: () => { onEnterSubmit(); return true; },
                "Shift-Enter": () => this.editor.commands.enter()
              };
            }
          })]
        : [])
    ],
    content,
    immediatelyRender: false,
    autofocus: autoFocus ?? false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "prose prose-sm prose-slate max-w-none focus:outline-none prose-p:my-2 prose-img:my-2" },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((i) => i.type.startsWith("image/"));
        if (!imageItem) return false;

        const file = imageItem.getAsFile();
        if (!file) return false;

        event.preventDefault();
        // Sin coordenadas — ClipboardEvent no tiene clientX/clientY (eso es
        // de DragEvent). Insertar en la selección actual, como el resto del texto.
        insertImage(file);
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (!files.length) return false;

        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        files.forEach((file) => insertImage(file, pos));
        return true;
      }
    }
  });

  function insertImage(file: File, dropPos?: number) {
    if (!editor) return;
    void compressImage(file).then((compressed) => {
      // tempUrl (blob: único por objeto) sirve de clave de correlación —
      // más simple que un atributo custom, que Tiptap/ProseMirror descartaría
      // al no estar declarado en el schema del nodo Image.
      const tempUrl = URL.createObjectURL(compressed);

      if (typeof dropPos === "number") {
        editor.chain().focus().insertContentAt(dropPos, {
          type: "image",
          attrs: { src: tempUrl, alt: "Subiendo…" }
        }).run();
      } else {
        editor.chain().focus().setImage({ src: tempUrl, alt: "Subiendo…" }).run();
      }

      void onImagePaste(compressed).then((finalSrc) => {
        editor.commands.command(({ tr, state }) => {
          state.doc.descendants((node, pos) => {
            if (node.type.name === "image" && node.attrs.src === tempUrl) {
              if (finalSrc) {
                tr.setNodeAttribute(pos, "src", finalSrc);
                tr.setNodeAttribute(pos, "alt", compressed.name);
              } else {
                tr.delete(pos, pos + node.nodeSize);
              }
            }
          });
          return true;
        });
        URL.revokeObjectURL(tempUrl);
      });
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    files.forEach((file) => insertImage(file));
    e.target.value = "";
  }

  // Sincroniza contenido externo (p.ej. al cancelar edición y recargar el original)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return (
    <div className="rounded-xl border bg-white focus-within:ring-2 focus-within:ring-indigo-400 transition" style={{ minHeight }}>
      <EditorContent editor={editor} className="px-3 py-2" />
      <div className="flex items-center gap-2 border-t px-3 py-1.5">
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition"
          title="Adjuntar imagen"
        >
          <Paperclip className="h-3 w-3" />
          Imagen
        </button>
        <span className="text-[11px] text-slate-400">· pega (Ctrl+V) o arrastra — aparece donde escribas</span>
      </div>
    </div>
  );
}
