"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import PasswordDialog, {
  clearCachedPasswordHash,
  getVerifiedCachedPasswordHash,
} from "@/components/PasswordDialog";
import CmsSitePreview from "@/components/CmsSitePreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

const EN_ANSWER_FIELDS: Array<{
  answerKey: keyof LocaleBody;
  questionKey: keyof LocaleBody;
  hint: string;
}> = [
  {
    answerKey: "intro",
    questionKey: "questionAbout",
    hint: "About accordion body",
  },
  {
    answerKey: "whatWeDo",
    questionKey: "questionWhatWeDo",
    hint: "What we do accordion body",
  },
  {
    answerKey: "vision",
    questionKey: "questionRequirements",
    hint: "Vision paragraph inside Requirements",
  },
  {
    answerKey: "requirements",
    questionKey: "questionRequirements",
    hint: "Requirements paragraph (same accordion)",
  },
  {
    answerKey: "academy",
    questionKey: "questionAcademy",
    hint: "Academy accordion body",
  },
  {
    answerKey: "booking",
    questionKey: "questionBooking",
    hint: "Booking accordion body",
  },
];

const BG_ANSWER_FIELDS: Array<{
  answerKey: keyof LocaleBody;
  questionKey: keyof LocaleBody;
  hint: string;
}> = [
  {
    answerKey: "intro",
    questionKey: "questionAbout",
    hint: "About accordion body",
  },
  {
    answerKey: "whatWeDo",
    questionKey: "questionWhatWeDo",
    hint: "What we do accordion body",
  },
  {
    answerKey: "requirements",
    questionKey: "questionRequirements",
    hint: "Requirements accordion body",
  },
  {
    answerKey: "academy",
    questionKey: "questionAcademy",
    hint: "Academy accordion body",
  },
  {
    answerKey: "journal",
    questionKey: "questionJournal",
    hint: "Journal accordion body",
  },
  {
    answerKey: "booking",
    questionKey: "questionBooking",
    hint: "Booking accordion body",
  },
  {
    answerKey: "vision",
    questionKey: "questionRequirements",
    hint: "Optional vision paragraph",
  },
];

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
  const [previewOpen, setPreviewOpen] = useState(false);
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
    if (!passwordHash) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/site-content/home-faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash, content }),
      });
      if (!response.ok) {
        setMessage("Save failed.");
        return;
      }
      setMessage("Saved. Homepage FAQ will refresh shortly.");
    } catch {
      setMessage("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (
    locale: "en" | "bg",
    key: keyof LocaleBody,
    value: string,
  ) => {
    setContent((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [key]: value },
    }));
  };

  const renderLocaleEditor = (
    locale: "en" | "bg",
    fields: typeof EN_ANSWER_FIELDS,
  ) => {
    const seenQuestions = new Set<string>();
    return (
      <section className="space-y-5 rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {locale === "en" ? "English" : "Bulgarian"}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPreviewLocale(locale);
              setPreviewOpen(true);
            }}
            disabled={!isAuthenticated}
          >
            <Eye className="h-4 w-4" />
            Preview {locale.toUpperCase()}
          </Button>
        </div>
        {fields.map((field) => {
          const showQuestion = !seenQuestions.has(field.questionKey);
          seenQuestions.add(field.questionKey);
          return (
            <div key={`${locale}-${field.answerKey}`} className="space-y-2">
              {showQuestion ? (
                <div className="space-y-1">
                  <Label htmlFor={`${locale}-${field.questionKey}`}>
                    Question title
                  </Label>
                  <input
                    id={`${locale}-${field.questionKey}`}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium"
                    value={content[locale][field.questionKey]}
                    onChange={(e) =>
                      updateField(locale, field.questionKey, e.target.value)
                    }
                    disabled={!isAuthenticated}
                  />
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor={`${locale}-${field.answerKey}`}>Answer</Label>
                <p className="text-xs text-gray-500">{field.hint}</p>
                <textarea
                  id={`${locale}-${field.answerKey}`}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={5}
                  value={content[locale][field.answerKey]}
                  onChange={(e) =>
                    updateField(locale, field.answerKey, e.target.value)
                  }
                  disabled={!isAuthenticated}
                  placeholder={
                    locale === "bg"
                      ? "Empty → English on /bg/ until filled"
                      : undefined
                  }
                />
              </div>
            </div>
          );
        })}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Models
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Homepage About / FAQ</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={!isAuthenticated || loading}
            >
              <Eye className="h-4 w-4" />
              Live preview
            </Button>
            <Button onClick={save} disabled={!isAuthenticated || saving || loading}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Edit question titles and answers for EN and BG. Live preview opens the
          real site in an iframe — click titles/paragraphs there to edit
          in place.
        </p>

        {message ? <p className="text-sm text-gray-800">{message}</p> : null}
        {loading ? <p className="text-sm text-gray-500">Loading…</p> : null}

        {renderLocaleEditor("en", EN_ANSWER_FIELDS)}
        {renderLocaleEditor("bg", BG_ANSWER_FIELDS)}
      </div>

      <CmsSitePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        page="home_faq"
        locale={previewLocale}
        onLocaleChange={setPreviewLocale}
        draft={previewDraft}
        onPatch={(locale, patch) => {
          setContent((prev) => ({
            ...prev,
            [locale]: { ...prev[locale], ...patch },
          }));
        }}
      />

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
