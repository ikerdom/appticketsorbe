"use client";

import { useEffect, useState } from "react";
import { X, ImagePlus } from "lucide-react";

interface Adjunto {
  id: string;
  nombre: string;
  tipo: string;
}

export function PublicTicketGallery({ ticketId, adjuntos }: { ticketId: string; adjuntos: Adjunto[] }) {
  const imgs = adjuntos.filter((a) => a.tipo.startsWith("image/"));
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const lightbox = lightboxIdx !== null && imgs[lightboxIdx] ? { ...imgs[lightboxIdx], idx: lightboxIdx } : null;
  const src = (adjuntoId: string) => `/api/public/tickets/${ticketId}/adjuntos/${adjuntoId}`;

  useEffect(() => {
    if (lightboxIdx === null) return;
    const total = imgs.length;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightboxIdx(null); return; }
      if (e.key === "ArrowRight") setLightboxIdx((i) => (i === null ? null : (i + 1) % total));
      if (e.key === "ArrowLeft") setLightboxIdx((i) => (i === null ? null : (i - 1 + total) % total));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [lightboxIdx, imgs.length]);

  if (imgs.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
        Capturas ({imgs.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {imgs.map((adj, idx) => (
          <button
            key={adj.id}
            type="button"
            onClick={() => setLightboxIdx(idx)}
            className="group relative block overflow-hidden rounded-xl border-2 border-transparent bg-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
            title={adj.nombre}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src(adj.id)} alt={adj.nombre} className="h-28 w-auto max-w-[200px] object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition rounded-xl bg-indigo-900/40">
              <ImagePlus className="h-5 w-5 text-white drop-shadow" />
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700">Ampliar</span>
            </div>
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 transition"
            aria-label="Cerrar (Esc)"
          >
            <X className="h-5 w-5" />
          </button>

          {imgs.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightbox.idx - 1 + imgs.length) % imgs.length);
                }}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white text-2xl font-bold hover:bg-white/30 transition select-none"
              >‹</button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightbox.idx + 1) % imgs.length);
                }}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white text-2xl font-bold hover:bg-white/30 transition select-none"
              >›</button>
            </>
          )}

          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* bg-white: evita que zonas transparentes del PNG aparezcan negras */}
            <div className="rounded-2xl bg-white shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src(lightbox.id)}
                alt={lightbox.nombre}
                className="block h-auto w-auto max-h-[80vh] max-w-[90vw] rounded-2xl"
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2">
              <span className="max-w-[220px] truncate text-sm text-white/80">{lightbox.nombre}</span>
              {imgs.length > 1 && (
                <span className="shrink-0 text-xs text-white/40">{lightbox.idx + 1} / {imgs.length}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
