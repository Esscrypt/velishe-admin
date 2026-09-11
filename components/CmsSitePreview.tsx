"use client";

import { useEffect, useRef, useState } from "react";
import {
  CMS_PREVIEW_PUSH,
  CMS_PREVIEW_READY,
  contactPreviewPath,
  homeFaqPreviewPath,
  isTrustedCmsPreviewOrigin,
  type CmsPreviewLocale,
  type CmsPreviewPage,
  type ContactPreviewDraft,
  type HomeFaqPreviewDraft,
} from "@/lib/cms-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FE_URL = (
  process.env.NEXT_PUBLIC_USER_FE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

type CmsSitePreviewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: CmsPreviewPage;
  locale: CmsPreviewLocale;
  onLocaleChange: (locale: CmsPreviewLocale) => void;
  draft: HomeFaqPreviewDraft | ContactPreviewDraft;
  onPatch: (locale: CmsPreviewLocale, patch: Record<string, string>) => void;
};

export default function CmsSitePreview({
  open,
  onOpenChange,
  page,
  locale,
  onLocaleChange,
  draft,
  onPatch,
}: CmsSitePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const path =
    page === "contact" ? contactPreviewPath(locale) : homeFaqPreviewPath(locale);
  const src = `${FE_URL}${path}`;

  useEffect(() => {
    if (!open) {
      setIframeReady(false);
      return;
    }

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
      if (
        (data as { type?: string }).type === "velishe-cms-preview-patch" &&
        (data as { page?: string }).page === page &&
        ((data as { locale?: string }).locale === "en" ||
          (data as { locale?: string }).locale === "bg")
      ) {
        const patch = (data as { patch?: Record<string, string> }).patch;
        const patchLocale = (data as { locale: CmsPreviewLocale }).locale;
        if (patch) onPatch(patchLocale, patch);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, onPatch, page]);

  useEffect(() => {
    if (!open || !iframeReady) return;
    const frame = iframeRef.current?.contentWindow;
    if (!frame) return;
    frame.postMessage(
      {
        type: CMS_PREVIEW_PUSH,
        page,
        locale,
        draft,
      },
      FE_URL,
    );
  }, [open, iframeReady, page, locale, draft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-6xl flex-col gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle>Live site preview</DialogTitle>
          <DialogDescription>
            Real {FE_URL} page in an iframe. Click question titles or body text
            to edit in place. Changes sync into the form; Save to persist.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={locale === "en" ? "default" : "outline"}
            onClick={() => {
              setIframeReady(false);
              onLocaleChange("en");
            }}
          >
            English
          </Button>
          <Button
            size="sm"
            variant={locale === "bg" ? "default" : "outline"}
            onClick={() => {
              setIframeReady(false);
              onLocaleChange("bg");
            }}
          >
            Bulgarian
          </Button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-xs text-gray-500 underline"
          >
            Open in new tab
          </a>
        </div>
        <iframe
          key={src}
          ref={iframeRef}
          title="CMS site preview"
          src={src}
          className="min-h-0 w-full flex-1 rounded-md border border-gray-200 bg-white"
        />
      </DialogContent>
    </Dialog>
  );
}
