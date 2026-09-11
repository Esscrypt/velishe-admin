"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CMS_PREVIEW_FLUSH,
  CMS_PREVIEW_PUSH,
  CMS_PREVIEW_READY,
  contactPreviewPath,
  homeFaqPreviewPath,
  isCmsPreviewSnapshot,
  isTrustedCmsPreviewOrigin,
  type CmsPreviewLocale,
  type CmsPreviewPage,
  type ContactPreviewDraft,
  type HomeFaqPreviewDraft,
} from "@/lib/cms-preview";
import { Button } from "@/components/ui/button";
import { getUserFeUrlOrProductionFallback } from "@/lib/user-fe-url";

const FE_URL = getUserFeUrlOrProductionFallback();
const FLUSH_TIMEOUT_MS = 1500;

type PreviewDraft = HomeFaqPreviewDraft | ContactPreviewDraft;

type CmsSitePreviewProps = {
  page: CmsPreviewPage;
  locale: CmsPreviewLocale;
  onLocaleChange: (locale: CmsPreviewLocale) => void;
  draft: PreviewDraft;
  onPatch: (locale: CmsPreviewLocale, patch: Record<string, string>) => void;
  onSave: (iframeDraft: PreviewDraft | null) => void;
  saving?: boolean;
  disabled?: boolean;
};

export default function CmsSitePreview({
  page,
  locale,
  onLocaleChange,
  draft,
  onPatch,
  onSave,
  saving = false,
  disabled = false,
}: CmsSitePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const onPatchRef = useRef(onPatch);
  onPatchRef.current = onPatch;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const saveLockRef = useRef(false);
  const [flushing, setFlushing] = useState(false);
  const flushWaiterRef = useRef<{
    resolve: (draft: PreviewDraft | null) => void;
  } | null>(null);

  const path =
    page === "contact" ? contactPreviewPath(locale) : homeFaqPreviewPath(locale);
  const src = `${FE_URL}${path}`;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTrustedCmsPreviewOrigin(event.origin)) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (
        (data as { type?: string; page?: string }).type === CMS_PREVIEW_READY &&
        (data as { page?: string }).page === page
      ) {
        setIframeReady(true);
        return;
      }
      if (isCmsPreviewSnapshot(data) && data.page === page) {
        if (flushWaiterRef.current) {
          flushWaiterRef.current.resolve(data.draft);
          flushWaiterRef.current = null;
        }
        return;
      }
      if (
        (data as { type?: string }).type === "velishe-cms-preview-patch" &&
        (data as { page?: string }).page === page &&
        ((data as { locale?: string }).locale === "en" ||
          (data as { locale?: string }).locale === "bg")
      ) {
        const patch = (data as { patch?: Record<string, string> }).patch;
        const patchLocale = (data as { locale: CmsPreviewLocale }).locale;
        if (patch) onPatchRef.current(patchLocale, patch);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [page]);

  useEffect(() => {
    if (!iframeReady) return;
    const frame = iframeRef.current?.contentWindow;
    if (!frame) return;
    frame.postMessage(
      {
        type: CMS_PREVIEW_PUSH,
        page,
        locale,
        draft: draftRef.current,
      },
      FE_URL,
    );
  }, [iframeReady, page, locale]);

  const requestFlush = useCallback((): Promise<PreviewDraft | null> => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame || !iframeReady) return Promise.resolve(null);

    return new Promise((resolve) => {
      if (flushWaiterRef.current) {
        flushWaiterRef.current.resolve(null);
      }
      const timeoutId = window.setTimeout(() => {
        if (flushWaiterRef.current) {
          flushWaiterRef.current.resolve(null);
          flushWaiterRef.current = null;
        }
      }, FLUSH_TIMEOUT_MS);

      flushWaiterRef.current = {
        resolve: (nextDraft) => {
          window.clearTimeout(timeoutId);
          resolve(nextDraft);
        },
      };

      frame.postMessage(
        {
          type: CMS_PREVIEW_FLUSH,
          page,
          locale,
        },
        FE_URL,
      );
    });
  }, [iframeReady, locale, page]);

  const handleSave = async () => {
    if (disabled || saving || saveLockRef.current) return;
    saveLockRef.current = true;
    setFlushing(true);
    try {
      const iframeDraft = await requestFlush();
      await Promise.resolve(onSaveRef.current(iframeDraft));
    } finally {
      saveLockRef.current = false;
      setFlushing(false);
    }
  };

  return (
    <section className="flex min-h-[70vh] flex-col gap-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={locale === "en" ? "default" : "outline"}
          onClick={() => {
            setIframeReady(false);
            onLocaleChange("en");
          }}
          disabled={disabled}
        >
          English
        </Button>
        <Button
          type="button"
          size="sm"
          variant={locale === "bg" ? "default" : "outline"}
          onClick={() => {
            setIframeReady(false);
            onLocaleChange("bg");
          }}
          disabled={disabled}
        >
          Bulgarian
        </Button>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-gray-500 underline"
        >
          Open in new tab
        </a>
        <Button
          type="button"
          className="ml-auto"
          onClick={() => {
            void handleSave();
          }}
          disabled={disabled || saving || flushing}
        >
          {saving || flushing ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Live {FE_URL} page. Click titles or body text in the iframe to edit.
        Changes sync here; Save to persist.
      </p>
      <iframe
        key={src}
        ref={iframeRef}
        title="CMS site preview"
        src={src}
        className="min-h-[65vh] w-full flex-1 rounded-md border border-gray-200 bg-white"
      />
    </section>
  );
}
