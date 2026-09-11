export const CMS_PREVIEW_QUERY = "cmsPreview";

export const CMS_PREVIEW_READY = "velishe-cms-preview-ready";
export const CMS_PREVIEW_PUSH = "velishe-cms-preview-push";
export const CMS_PREVIEW_PATCH = "velishe-cms-preview-patch";
export const CMS_PREVIEW_FLUSH = "velishe-cms-preview-flush";
export const CMS_PREVIEW_SNAPSHOT = "velishe-cms-preview-snapshot";

export type CmsPreviewPage = "home_faq" | "contact";
export type CmsPreviewLocale = "en" | "bg";

export type HomeFaqItemDraft = {
  id: string;
  question: string;
  answer: string;
};

export type HomeFaqPreviewDraft = {
  items: HomeFaqItemDraft[];
};

export type ContactPreviewDraft = {
  intro1: string;
  intro2: string;
  companyHeading: string;
  officeAddress: string;
};

export type CmsPreviewPushMessage = {
  type: typeof CMS_PREVIEW_PUSH;
  page: CmsPreviewPage;
  locale: CmsPreviewLocale;
  draft: HomeFaqPreviewDraft | ContactPreviewDraft;
};

export type CmsPreviewPatchMessage = {
  type: typeof CMS_PREVIEW_PATCH;
  page: CmsPreviewPage;
  locale: CmsPreviewLocale;
  patch?: Record<string, string>;
  items?: HomeFaqItemDraft[];
};

export type CmsPreviewReadyMessage = {
  type: typeof CMS_PREVIEW_READY;
  page: CmsPreviewPage;
};

export type CmsPreviewFlushMessage = {
  type: typeof CMS_PREVIEW_FLUSH;
  page: CmsPreviewPage;
  locale: CmsPreviewLocale;
};

export type CmsPreviewSnapshotMessage = {
  type: typeof CMS_PREVIEW_SNAPSHOT;
  page: CmsPreviewPage;
  locale: CmsPreviewLocale;
  draft: HomeFaqPreviewDraft | ContactPreviewDraft;
};

export function isTrustedCmsPreviewOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname.endsWith(".vercel.app")) return true;
    if (hostname.endsWith("velishemodelmanagement.com")) return true;
    return false;
  } catch {
    return false;
  }
}

export function isCmsPreviewSnapshot(
  data: unknown,
): data is CmsPreviewSnapshotMessage {
  if (!data || typeof data !== "object") return false;
  const message = data as Partial<CmsPreviewSnapshotMessage>;
  return (
    message.type === CMS_PREVIEW_SNAPSHOT &&
    (message.page === "home_faq" || message.page === "contact") &&
    (message.locale === "en" || message.locale === "bg") &&
    !!message.draft &&
    typeof message.draft === "object"
  );
}

export function homeFaqPreviewPath(locale: CmsPreviewLocale): string {
  return locale === "bg" ? "/bg/?cmsPreview=1" : "/?cmsPreview=1";
}

export function contactPreviewPath(locale: CmsPreviewLocale): string {
  return locale === "bg" ? "/bg/contact/?cmsPreview=1" : "/contact/?cmsPreview=1";
}
