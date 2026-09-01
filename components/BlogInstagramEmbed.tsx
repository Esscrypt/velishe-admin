"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

let embedScriptPromise: Promise<void> | null = null;

function loadInstagramEmbedScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.instgrm) return Promise.resolve();
  if (embedScriptPromise) return embedScriptPromise;

  embedScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.instagram.com/embed.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Instagram embed script failed"));
    document.body.appendChild(script);
  });

  return embedScriptPromise;
}

type BlogInstagramEmbedProps = {
  permalink: string;
  title: string;
};

export default function BlogInstagramEmbed({
  permalink,
  title,
}: BlogInstagramEmbedProps) {
  useEffect(() => {
    let cancelled = false;

    void loadInstagramEmbedScript()
      .then(() => {
        if (!cancelled) window.instgrm?.Embeds.process();
      })
      .catch(() => {
        /* blockquote still links out */
      });

    return () => {
      cancelled = true;
    };
  }, [permalink]);

  return (
    <div className="w-full [&_.instagram-media]:!mx-0 [&_.instagram-media]:!max-w-none [&_.instagram-media]:!min-w-0 [&_.instagram-media]:!w-full">
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: 3,
          boxShadow:
            "0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)",
          margin: 0,
          maxWidth: "100%",
          minWidth: 0,
          padding: 0,
          width: "100%",
        }}
      >
        <a href={permalink} target="_blank" rel="noopener noreferrer">
          {title}
        </a>
      </blockquote>
    </div>
  );
}
