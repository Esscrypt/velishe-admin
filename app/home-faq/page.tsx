"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PasswordDialog, {
  clearCachedPasswordHash,
  getVerifiedCachedPasswordHash,
} from "@/components/PasswordDialog";
import CmsSitePreview from "@/components/CmsSitePreview";
import { Button } from "@/components/ui/button";
import type { HomeFaqPreviewDraft } from "@/lib/cms-preview";

type LocaleBody = HomeFaqPreviewDraft;

const EMPTY: LocaleBody = {
  intro: "",
  whatWeDo: "",
  requirements: "",
  academy: "",
  booking: "",
  journal: "",
  vision: "",
  questionAbout: "",
  questionWhatWeDo: "",
  questionRequirements: "",
  questionAcademy: "",
  questionBooking: "",
  questionJournal: "",
};

const EN_DEFAULT_QUESTIONS = {
  questionAbout: "VÈLISHE Model Management — Sofia, Bulgaria",
  questionWhatWeDo: "What Does Velishe Model Management Do?",
  questionRequirements: "What Are the Requirements to Become a Velishe Model?",
  questionAcademy: "What Is the VÈLISHE Model Academy?",
  questionBooking: "How Do You Book a Model or Apply to Velishe?",
  questionJournal: "",
};

const BG_DEFAULT_QUESTIONS = {
  questionAbout: "За VÈLISHE",
  questionWhatWeDo: "Какво прави Velishe Model Management?",
  questionRequirements: "Какви са изискванията да станеш модел в Velishe?",
  questionAcademy: "Какво е VÈLISHE Model Academy?",
  questionBooking: "Как да резервирате модел или да кандидатствате в Velishe?",
  questionJournal: "Какво е Velishe Journal?",
};

function readLocale(raw: Record<string, unknown> | undefined): LocaleBody {
  const str = (key: keyof LocaleBody) =>
    typeof raw?.[key] === "string" ? (raw[key] as string) : "";
  return {
    intro: str("intro"),
    whatWeDo: str("whatWeDo"),
    requirements: str("requirements"),
    academy: str("academy"),
    booking: str("booking"),
    journal: str("journal"),
    vision: str("vision"),
    questionAbout: str("questionAbout"),
    questionWhatWeDo: str("questionWhatWeDo"),
    questionRequirements: str("questionRequirements"),
    questionAcademy: str("questionAcademy"),
    questionBooking: str("questionBooking"),
    questionJournal: str("questionJournal"),
  };
}

function withQuestionDefaults(
  locale: "en" | "bg",
  body: LocaleBody,
): LocaleBody {
  const defaults = locale === "en" ? EN_DEFAULT_QUESTIONS : BG_DEFAULT_QUESTIONS;
  return {
    ...body,
    questionAbout: body.questionAbout.trim() || defaults.questionAbout,
    questionWhatWeDo: body.questionWhatWeDo.trim() || defaults.questionWhatWeDo,
    questionRequirements:
      body.questionRequirements.trim() || defaults.questionRequirements,
    questionAcademy: body.questionAcademy.trim() || defaults.questionAcademy,
    questionBooking: body.questionBooking.trim() || defaults.questionBooking,
    questionJournal: body.questionJournal.trim() || defaults.questionJournal,
  };
}

export default function HomeFaqAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordHash, setPasswordHash] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [content, setContent] = useState<{ en: LocaleBody; bg: LocaleBody }>({
    en: { ...EMPTY },
    bg: { ...EMPTY },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewLocale, setPreviewLocale] = useState<"en" | "bg">("en");

  const previewDraft = useMemo(
    () => withQuestionDefaults(previewLocale, content[previewLocale]),
    [content, previewLocale],
  );

  const load = async (hash: string) => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/site-content/home-faq?passwordHash=${encodeURIComponent(hash)}`,
      );
      if (response.status === 401) {
        clearCachedPasswordHash();
        setIsAuthenticated(false);
        setPasswordHash("");
        setShowPasswordDialog(true);
        return;
      }
      if (!response.ok) {
        setMessage("Failed to load homepage FAQ content.");
        return;
      }
      const data = await response.json();
      setContent({
        en: withQuestionDefaults("en", readLocale(data.content?.en)),
        bg: withQuestionDefaults("bg", readLocale(data.content?.bg)),
      });
      setIsAuthenticated(true);
      setPasswordHash(hash);
    } catch {
      setMessage("Failed to load homepage FAQ content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      const cached = await getVerifiedCachedPasswordHash();
      if (cached) await load(cached);
      else setShowPasswordDialog(true);
    })();
  }, []);

  const save = async () => {
    const hash =
      passwordHash.trim() ||
      (await getVerifiedCachedPasswordHash()) ||
      "";
    if (!hash) {
      setShowPasswordDialog(true);
      setMessage("Enter the admin password to save.");
      return;
    }
    setPasswordHash(hash);
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/site-content/home-faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash: hash, content }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (response.status === 401) {
          clearCachedPasswordHash();
          setIsAuthenticated(false);
          setPasswordHash("");
          setShowPasswordDialog(true);
        }
        setMessage(err?.error ?? "Save failed.");
        return;
      }
      setMessage("Saved. Homepage FAQ will refresh shortly.");
    } catch {
      setMessage("Save failed.");
    } finally {
      setSaving(false);
    }
  };

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
          onLocaleChange={setPreviewLocale}
          draft={previewDraft}
          onSave={() => {
            void save();
          }}
          saving={saving}
          disabled={!isAuthenticated || loading}
          onPatch={(locale, patch) => {
            setContent((prev) => ({
              ...prev,
              [locale]: { ...prev[locale], ...patch },
            }));
          }}
        />
      </div>

      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        title="Homepage FAQ"
        description="Enter admin password to edit homepage FAQ copy."
        onSuccess={(hash) => {
          void load(hash);
          setShowPasswordDialog(false);
        }}
      />
    </div>
  );
}
