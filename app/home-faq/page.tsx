"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PasswordDialog, {
  clearCachedPasswordHash,
  getCachedPasswordHash,
  getVerifiedCachedPasswordHash,
} from "@/components/PasswordDialog";
import CmsSitePreview from "@/components/CmsSitePreview";
import { Button } from "@/components/ui/button";
import type {
  ContactPreviewDraft,
  HomeFaqItemDraft,
  HomeFaqPreviewDraft,
} from "@/lib/cms-preview";

type LocaleItems = HomeFaqItemDraft[];
type PreviewDraft = ContactPreviewDraft | HomeFaqPreviewDraft;

const EN_DEFAULT_ITEMS: LocaleItems = [
  {
    id: "default-en-about",
    question: "VÈLISHE Model Management — Sofia, Bulgaria",
    answer:
      "VÈLISHE Model Management is a boutique modeling agency founded in 2025 and based in Sofia, Bulgaria. We represent and develop professional fashion and commercial models — women and men with a distinct presence, individual attitude, and authentic character that translates across editorial, campaign, and digital work. We are a new-generation agency built on the belief that great representation shapes careers. We work with a selective, carefully curated roster and invest in each model's long-term development — from first casting to international placement.",
  },
  {
    id: "default-en-what-we-do",
    question: "What Does Velishe Model Management Do?",
    answer:
      "Our talent works across 7 categories: fashion editorial, commercial advertising, catalogue, runway, beauty, lifestyle, and digital content. We connect models with leading Bulgarian and international brands, creative directors, and photographers — placing talent in campaigns that make an impact. Beyond bookings, we guide models through the industry — helping them build a professional portfolio, understand their market positioning, and navigate the demands of a modeling career with confidence and clarity.",
  },
  {
    id: "default-en-vision",
    question: "Our Vision",
    answer:
      "Our vision goes beyond trends. We focus on timeless presence, individuality, and a sense of narrative within every model we work with. VÈLISHE is a statement — selective, bold, and quietly assured. We exist to shape faces, stories, and moments that leave an imprint.",
  },
  {
    id: "default-en-requirements",
    question: "What Are the Requirements to Become a Velishe Model?",
    answer:
      "We represent both women and men. Female models typically begin at a minimum height of 173 cm; male models at 183 cm. We prioritise natural, unedited portfolios and look for real character above all else. Applicants submit natural photos with no filters, editing, or makeup and are reviewed on a rolling basis.",
  },
  {
    id: "default-en-academy",
    question: "What Is the VÈLISHE Model Academy?",
    answer:
      "The VÈLISHE Academy is our structured training programme for aspiring and signed talents who want to understand how the modeling industry truly works. The Academy covers composites and casting preparation, professional conduct on set, industry etiquette, and building a sustainable career. Enrolment is by intake — join the waitlist to be notified when the next programme opens.",
  },
  {
    id: "default-en-booking",
    question: "How Do You Book a Model or Apply to Velishe?",
    answer:
      "We welcome enquiries from clients looking to book talent for campaigns, editorials, and commercial productions. For casting requests, production briefs, or general booking enquiries, reach out directly to our team.",
  },
];

function hasUsableAnswers(items: LocaleItems): boolean {
  return items.some((item) => item.answer.trim().length > 0);
}

function readItems(raw: unknown): LocaleItems {
  if (!Array.isArray(raw)) return [];
  const out: LocaleItems = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    if (!id) continue;
    out.push({
      id,
      question: typeof o.question === "string" ? o.question : "",
      answer: typeof o.answer === "string" ? o.answer : "",
    });
  }
  return out;
}

function resolveLocaleItems(
  locale: "en" | "bg",
  content: { en: LocaleItems; bg: LocaleItems },
): LocaleItems {
  if (locale === "en") {
    return hasUsableAnswers(content.en) ? content.en : EN_DEFAULT_ITEMS;
  }
  if (hasUsableAnswers(content.bg)) return content.bg;
  return hasUsableAnswers(content.en) ? content.en : EN_DEFAULT_ITEMS;
}

function isHomeFaqDraft(draft: PreviewDraft): draft is HomeFaqPreviewDraft {
  return "items" in draft && Array.isArray(draft.items);
}

function newItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `faq-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function HomeFaqAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordDialogAutoUnlock, setPasswordDialogAutoUnlock] = useState(true);
  const [content, setContent] = useState<{ en: LocaleItems; bg: LocaleItems }>({
    en: [],
    bg: [],
  });
  const contentRef = useRef(content);
  contentRef.current = content;
  const passwordHashRef = useRef("");
  const pendingDraftRef = useRef<PreviewDraft | null | undefined>(undefined);
  const saveInFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewLocale, setPreviewLocale] = useState<"en" | "bg">("en");
  const [contentVersion, setContentVersion] = useState(0);
  const [contentReady, setContentReady] = useState(false);

  const previewDraft = useMemo<HomeFaqPreviewDraft>(
    () => ({ items: resolveLocaleItems(previewLocale, content) }),
    [content, previewLocale],
  );

  const clearAuth = useCallback(() => {
    clearCachedPasswordHash();
    passwordHashRef.current = "";
    setIsAuthenticated(false);
    setContentReady(false);
  }, []);

  const load = useCallback(
    async (hash: string) => {
      passwordHashRef.current = hash;
      setLoading(true);
      setContentReady(false);
      setMessage("");
      try {
        const response = await fetch(
          `/api/site-content/home-faq?passwordHash=${encodeURIComponent(hash)}`,
        );
        if (response.status === 401) {
          clearAuth();
          setPasswordDialogAutoUnlock(true);
          setShowPasswordDialog(true);
          return false;
        }
        if (!response.ok) {
          setMessage("Failed to load homepage FAQ content.");
          return false;
        }
        const data = await response.json();
        const next = {
          en: readItems(data.content?.en),
          bg: readItems(data.content?.bg),
        };
        setContent(next);
        contentRef.current = next;
        setIsAuthenticated(true);
        setContentReady(true);
        setContentVersion((version) => version + 1);
        return true;
      } catch {
        setMessage("Failed to load homepage FAQ content.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [clearAuth],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = await getVerifiedCachedPasswordHash();
      if (cancelled) return;
      if (cached) {
        passwordHashRef.current = cached;
        await load(cached);
      } else {
        setPasswordDialogAutoUnlock(true);
        setShowPasswordDialog(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const performSave = useCallback(
    async (
      iframeDraft: PreviewDraft | null,
      options?: { suppressAuthDialog?: boolean },
    ) => {
      if (saveInFlightRef.current) return false;
      saveInFlightRef.current = true;

      try {
        const hash =
          passwordHashRef.current.trim() || getCachedPasswordHash() || "";
        if (!hash) {
          if (!options?.suppressAuthDialog) {
            pendingDraftRef.current = iframeDraft;
            setPasswordDialogAutoUnlock(false);
            setShowPasswordDialog(true);
            setMessage("Enter the admin password to save.");
          }
          return false;
        }
        passwordHashRef.current = hash;

        let nextContent = contentRef.current;
        if (iframeDraft && isHomeFaqDraft(iframeDraft)) {
          nextContent = {
            ...nextContent,
            [previewLocale]: iframeDraft.items,
          };
          setContent(nextContent);
          contentRef.current = nextContent;
        }

        setSaving(true);
        setMessage("");

        const response = await fetch("/api/site-content/home-faq", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Password-Hash": hash,
          },
          body: JSON.stringify({ passwordHash: hash, content: nextContent }),
        });

        if (!response.ok) {
          const err = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          const errorMessage = err?.error ?? "Save failed.";
          if (response.status === 401 && !options?.suppressAuthDialog) {
            pendingDraftRef.current = iframeDraft;
            if (errorMessage === "Invalid password") {
              clearAuth();
            }
            setPasswordDialogAutoUnlock(false);
            setShowPasswordDialog(true);
          }
          setMessage(errorMessage);
          return false;
        }

        pendingDraftRef.current = undefined;
        setMessage("Saved. Public site cache will refresh in a few seconds.");
        return true;
      } catch {
        setMessage("Save failed.");
        return false;
      } finally {
        setSaving(false);
        saveInFlightRef.current = false;
      }
    },
    [clearAuth, previewLocale],
  );

  const handlePasswordSuccess = useCallback(
    async (hash: string) => {
      passwordHashRef.current = hash;
      const ok = await load(hash);
      if (!ok) return false;
      setShowPasswordDialog(false);
      setPasswordDialogAutoUnlock(true);
      const pending = pendingDraftRef.current;
      pendingDraftRef.current = undefined;
      if (pending !== undefined) {
        const saved = await performSave(pending, { suppressAuthDialog: true });
        if (!saved) {
          setMessage("Signed in, but save failed. Click Save once more.");
        }
      }
      return true;
    },
    [load, performSave],
  );

  const handlePasswordClose = useCallback(() => {
    setShowPasswordDialog(false);
  }, []);

  const handlePatch = useCallback((_locale: "en" | "bg", _patch: Record<string, string>) => {
    // Contact-style string patches are unused for FAQ items.
  }, []);

  const handleItemsPatch = useCallback(
    (locale: "en" | "bg", items: HomeFaqItemDraft[]) => {
      setContent((prev) => {
        const next = { ...prev, [locale]: items };
        contentRef.current = next;
        return next;
      });
    },
    [],
  );

  const handleAddItem = useCallback(() => {
    setContent((prev) => {
      const current = resolveLocaleItems(previewLocale, prev);
      const nextItems = [
        ...current,
        {
          id: newItemId(),
          question: "New question",
          answer: "",
        },
      ];
      const next = { ...prev, [previewLocale]: nextItems };
      contentRef.current = next;
      return next;
    });
    setContentVersion((version) => version + 1);
  }, [previewLocale]);

  const handleLocaleChange = useCallback((locale: "en" | "bg") => {
    setPreviewLocale(locale);
    setContentVersion((version) => version + 1);
  }, []);

  const saveDisabled =
    !isAuthenticated || loading || showPasswordDialog || saving;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Models
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Homepage About / FAQ</h1>
        </div>

        {message ? <p className="text-sm text-gray-800">{message}</p> : null}
        {loading ? <p className="text-sm text-gray-500">Loading…</p> : null}

        <CmsSitePreview
          page="home_faq"
          locale={previewLocale}
          onLocaleChange={handleLocaleChange}
          draft={previewDraft}
          contentReady={contentReady && isAuthenticated && !loading}
          contentVersion={contentVersion}
          onSave={(iframeDraft) => performSave(iframeDraft)}
          saving={saving}
          disabled={saveDisabled}
          onPatch={handlePatch}
          onItemsPatch={handleItemsPatch}
          onAddItem={handleAddItem}
        />
      </div>

      <PasswordDialog
        open={showPasswordDialog}
        onClose={handlePasswordClose}
        title="Homepage FAQ"
        description="Enter admin password to edit homepage FAQ copy."
        onSuccess={handlePasswordSuccess}
        autoUnlock={passwordDialogAutoUnlock}
      />
    </div>
  );
}
