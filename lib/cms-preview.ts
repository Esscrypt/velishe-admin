export const CMS_PREVIEW_QUERY = "cmsPreview";

export const CMS_PREVIEW_READY = "velishe-cms-preview-ready";
export const CMS_PREVIEW_PUSH = "velishe-cms-preview-push";
export const CMS_PREVIEW_PATCH = "velishe-cms-preview-patch";

export type CmsPreviewPage = "home_faq" | "contact";
export type CmsPreviewLocale = "en" | "bg";

export type HomeFaqPreviewDraft = {
  intro: string;
  whatWeDo: string;
  requirements: string;
  academy: string;
  booking: string;
  journal: string;
  vision: string;
  questionAbout: string;
  questionWhatWeDo: string;
  questionRequirements: string;
  questionAcademy: string;
  questionBooking: string;
  questionJournal: string;
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
  patch: Record<string, string>;
};

export type CmsPreviewReadyMessage = {
  type: typeof CMS_PREVIEW_READY;
  page: CmsPreviewPage;
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

export function homeFaqPreviewPath(locale: CmsPreviewLocale): string {
  return locale === "bg" ? "/bg/?cmsPreview=1" : "/?cmsPreview=1";
}

export function contactPreviewPath(locale: CmsPreviewLocale): string {
  return locale === "bg" ? "/bg/contact/?cmsPreview=1" : "/contact/?cmsPreview=1";
}
