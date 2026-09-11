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
import type { ContactPreviewDraft } from "@/lib/cms-preview";

type LocaleBody = ContactPreviewDraft;

const EMPTY: LocaleBody = {
  intro1: "",
  intro2: "",
  companyHeading: "",
  officeAddress: "",
};

const EN_DEFAULTS: LocaleBody = {
  intro1:
    "VÈLISHE Model Management is a new-generation boutique agency based in Sofia, Bulgaria. We represent, develop, and elevate talent - women and men with distinct presence, attitude, and authenticity.",
  intro2:
    "Our vision goes beyond trends. We focus on timeless beauty, individuality, and a sense of narrative within every model we work with. VÈLISHE is a statement - selective, bold, and quietly assured. We exist to shape faces, stories, and moments that leave an imprint.",
  companyHeading: "Velishe Model Management Ltd.",
  officeAddress: "Sofia, Bulgaria",
};

const FIELDS: Array<{
  key: keyof LocaleBody;
  label: string;
  hint: string;
  rows: number;
}> = [
  {
    key: "intro1",
    label: "Opening paragraph",
    hint: "Top of Contact — under the heading",
    rows: 4,
  },
  {
    key: "intro2",
    label: "Second paragraph",
    hint: "Under the opening paragraph, before the company card",
    rows: 4,
  },
  {
    key: "companyHeading",
    label: "Company card title",
    hint: "Grey box heading",
    rows: 1,
  },
  {
    key: "officeAddress",
    label: "Office address",
    hint: "Inside the company card",
    rows: 1,
  },
];

function pickFilled(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function resolveDraft(
  locale: "en" | "bg",
  content: { en: LocaleBody; bg: LocaleBody },
): LocaleBody {
  const en: LocaleBody = {
    intro1: pickFilled(content.en.intro1, EN_DEFAULTS.intro1),
    intro2: pickFilled(content.en.intro2, EN_DEFAULTS.intro2),
    companyHeading: pickFilled(
      content.en.companyHeading,
      EN_DEFAULTS.companyHeading,
    ),
    officeAddress: pickFilled(
      content.en.officeAddress,
      EN_DEFAULTS.officeAddress,
    ),
  };
  if (locale === "en") return en;
  return {
    intro1: pickFilled(content.bg.intro1, en.intro1),
    intro2: pickFilled(content.bg.intro2, en.intro2),
    companyHeading: pickFilled(content.bg.companyHeading, en.companyHeading),
    officeAddress: pickFilled(content.bg.officeAddress, en.officeAddress),
  };
}

export default function ContactContentAdminPage() {
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
    () => resolveDraft(previewLocale, content),
    [previewLocale, content],
  );

  const load = async (hash: string) => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/site-content/contact?passwordHash=${encodeURIComponent(hash)}`,
      );
      if (response.status === 401) {
        clearCachedPasswordHash();
        setIsAuthenticated(false);
        setShowPasswordDialog(true);
        return;
      }
      if (!response.ok) {
        setMessage("Failed to load contact content.");
        return;
      }
      const data = await response.json();
      const enRaw = data.content?.en ?? {};
      const bgRaw = data.content?.bg ?? {};
      setContent({
        en: {
          intro1: typeof enRaw.intro1 === "string" ? enRaw.intro1 : "",
          intro2: typeof enRaw.intro2 === "string" ? enRaw.intro2 : "",
          companyHeading:
            typeof enRaw.companyHeading === "string" ? enRaw.companyHeading : "",
          officeAddress:
            typeof enRaw.officeAddress === "string" ? enRaw.officeAddress : "",
        },
        bg: {
          intro1: typeof bgRaw.intro1 === "string" ? bgRaw.intro1 : "",
          intro2: typeof bgRaw.intro2 === "string" ? bgRaw.intro2 : "",
          companyHeading:
            typeof bgRaw.companyHeading === "string" ? bgRaw.companyHeading : "",
          officeAddress:
            typeof bgRaw.officeAddress === "string" ? bgRaw.officeAddress : "",
        },
      });
      setIsAuthenticated(true);
      setPasswordHash(hash);
    } catch {
      setMessage("Failed to load contact content.");
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
      const payload = {
        en: { ...content.en, intro3: "", intro4: "" },
        bg: { ...content.bg, intro3: "", intro4: "" },
      };
      const response = await fetch("/api/site-content/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash, content: payload }),
      });
      if (!response.ok) {
        setMessage("Save failed.");
        return;
      }
      setMessage("Saved. Public contact pages will refresh shortly.");
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
            <h1 className="text-3xl font-bold">Contact page copy</h1>
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
          Live preview opens the real Contact page. Click text in the iframe to
          edit in place. Email / social / legal stay fixed.
        </p>

        {message ? <p className="text-sm text-gray-800">{message}</p> : null}
        {loading ? <p className="text-sm text-gray-500">Loading…</p> : null}

        {(["en", "bg"] as const).map((locale) => (
          <section
            key={locale}
            className="space-y-5 rounded-lg border bg-white p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold uppercase tracking-wide">
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
            {FIELDS.map((field) => (
              <div key={`${locale}-${field.key}`} className="space-y-1">
                <Label htmlFor={`${locale}-${field.key}`}>{field.label}</Label>
                <p className="text-xs text-gray-500">{field.hint}</p>
                <textarea
                  id={`${locale}-${field.key}`}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={field.rows}
                  value={content[locale][field.key]}
                  onChange={(e) =>
                    updateField(locale, field.key, e.target.value)
                  }
                  disabled={!isAuthenticated}
                />
              </div>
            ))}
          </section>
        ))}
      </div>

      <CmsSitePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        page="contact"
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
        title="Contact page"
        description="Enter admin password to edit contact copy."
        onSuccess={(hash) => {
          void load(hash);
          setShowPasswordDialog(false);
        }}
      />
    </div>
  );
}
