"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import BlogPostPreview from "@/components/BlogPostPreview";
import BlogMarkdownEditor from "@/components/BlogMarkdownEditor";
import BlogImageManager, {
  type BlogImageMeta,
} from "@/components/BlogImageManager";
import PasswordDialog, {
  clearCachedPasswordHash,
  getVerifiedCachedPasswordHash,
} from "@/components/PasswordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isScheduledForFuture,
  postStatusLabel,
} from "@/lib/blog-publish";
import type { BlogCredits } from "@/lib/blog-credits";

type PublishMode = "draft" | "now" | "scheduled";

type BlogPost = {
  id: number;
  slug: string;
  title: string;
  teaser: string | null;
  body: string;
  published: boolean;
  publishedAt: string | null;
  scheduledPublishAt: string | null;
  newsletterSentAt: string | null;
  modelId?: number | null;
  credits?: BlogCredits | null;
  createdAt: string;
  updatedAt: string;
  images?: BlogImageMeta[];
};

type ModelOption = {
  id: number;
  name: string;
  slug: string;
  published?: boolean;
};

type CreditsForm = {
  brandName: string;
  brandUrl: string;
  photographerName: string;
  photographerUrl: string;
  magazineName: string;
  magazineUrl: string;
  extras: { role: string; name: string; url: string }[];
  sourceUrl: string;
};

function emptyCreditsForm(): CreditsForm {
  return {
    brandName: "",
    brandUrl: "",
    photographerName: "",
    photographerUrl: "",
    magazineName: "",
    magazineUrl: "",
    extras: [],
    sourceUrl: "",
  };
}

function formToCreditsPayload(form: CreditsForm) {
  return {
    brand: { name: form.brandName, url: form.brandUrl || null },
    photographer: {
      name: form.photographerName,
      url: form.photographerUrl || null,
    },
    magazine: { name: form.magazineName, url: form.magazineUrl || null },
    extras: form.extras,
    sourceUrl: form.sourceUrl || null,
  };
}

function creditsToForm(credits: BlogCredits | null | undefined): CreditsForm {
  if (!credits) return emptyCreditsForm();
  return {
    brandName: credits.brand?.name ?? "",
    brandUrl: credits.brand?.url ?? "",
    photographerName: credits.photographer?.name ?? "",
    photographerUrl: credits.photographer?.url ?? "",
    magazineName: credits.magazine?.name ?? "",
    magazineUrl: credits.magazine?.url ?? "",
    extras: (credits.extras ?? []).map((row) => ({
      role: row.role,
      name: row.name,
      url: row.url ?? "",
    })),
    sourceUrl: credits.sourceUrl ?? "",
  };
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function derivePublishMode(post: BlogPost): PublishMode {
  if (post.published) return "now";
  if (isScheduledForFuture(post.scheduledPublishAt)) return "scheduled";
  return "draft";
}

function buildPublishPayload(
  publishMode: PublishMode,
  scheduledAtLocal: string,
): { published: boolean; scheduledPublishAt: string | null } {
  if (publishMode === "now") {
    return { published: true, scheduledPublishAt: null };
  }
  if (publishMode === "scheduled") {
    if (!scheduledAtLocal.trim()) {
      throw new Error("Choose a schedule date and time");
    }
    const scheduled = new Date(scheduledAtLocal);
    if (Number.isNaN(scheduled.getTime())) {
      throw new Error("Schedule date is invalid");
    }
    if (scheduled.getTime() <= Date.now()) {
      throw new Error("Schedule date must be in the future");
    }
    return { published: false, scheduledPublishAt: scheduled.toISOString() };
  }
  return { published: false, scheduledPublishAt: null };
}

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordDialogTitle, setPasswordDialogTitle] = useState("Blog");
  const [passwordDialogDescription, setPasswordDialogDescription] = useState(
    "Enter your admin password to manage blog posts.",
  );
  const passwordDialogActionRef = useRef<((hash: string) => void) | null>(null);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [teaser, setTeaser] = useState("");
  const [body, setBody] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("draft");
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewEmail, setPreviewEmail] = useState(
    () => process.env.NEXT_PUBLIC_NEWSLETTER_PREVIEW_EMAIL ?? "",
  );
  const [postPreviewOpen, setPostPreviewOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [images, setImages] = useState<BlogImageMeta[]>([]);
  const [passwordHash, setPasswordHash] = useState("");
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [modelId, setModelId] = useState<number | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [creditsForm, setCreditsForm] = useState<CreditsForm>(emptyCreditsForm());

  const fetchModelOptions = async () => {
    try {
      const response = await fetch("/api/models");
      if (!response.ok) return;
      const data = (await response.json()) as Array<{
        id: string;
        name: string;
        slug: string;
        published?: boolean;
      }>;
      const options = data
        .filter((row) => row.name && row.slug)
        .map((row) => ({
          id: Number.parseInt(row.id, 10),
          name: row.name,
          slug: row.slug,
          published: Boolean(row.published),
        }))
        .filter((row) => !Number.isNaN(row.id))
        .sort((a, b) => a.name.localeCompare(b.name));
      setModelOptions(options);
    } catch {
      /* ignore */
    }
  };

  const fetchPosts = async (hash: string) => {
    setLoading(true);
    try {
      const [postsResponse, listResponse] = await Promise.all([
        fetch(`/api/blog-posts?passwordHash=${encodeURIComponent(hash)}`),
        fetch(`/api/mailing-list?passwordHash=${encodeURIComponent(hash)}`),
      ]);
      if (postsResponse.ok) {
        const data = await postsResponse.json();
        setPosts(Array.isArray(data) ? data : []);
      } else if (postsResponse.status === 401) {
        clearCachedPasswordHash();
        setIsAuthenticated(false);
        passwordDialogActionRef.current = (h: string) => {
          setIsAuthenticated(true);
          setPasswordHash(h);
          fetchPosts(h);
        };
        setShowPasswordDialog(true);
      }
      if (listResponse.ok) {
        const subscribers = (await listResponse.json()) as Array<{
          confirmed: boolean;
          unsubscribedAt: string | null;
        }>;
        setConfirmedCount(
          subscribers.filter((row) => row.confirmed && !row.unsubscribedAt)
            .length,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      void fetchModelOptions();
      const cached = await getVerifiedCachedPasswordHash();
      if (cached) {
        setIsAuthenticated(true);
        setPasswordHash(cached);
        fetchPosts(cached);
      } else {
        passwordDialogActionRef.current = (hash: string) => {
          setIsAuthenticated(true);
          setPasswordHash(hash);
          fetchPosts(hash);
        };
        setShowPasswordDialog(true);
      }
    })();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setCreating(false);
    setTitle("");
    setTeaser("");
    setBody("");
    setPublishMode("draft");
    setScheduledAtLocal("");
    setImages([]);
    setModelId(null);
    setCreditsForm(emptyCreditsForm());
  };

  const openCreate = () => {
    resetForm();
    setCreating(true);
  };

  const openEdit = async (post: BlogPost) => {
    const response = await fetch(
      `/api/blog-posts/${post.id}?passwordHash=${encodeURIComponent(passwordHash)}`,
    );
    if (!response.ok) return;
    const full = (await response.json()) as BlogPost;
    setCreating(false);
    setEditing(full);
    setTitle(full.title);
    setTeaser(full.teaser ?? "");
    setBody(full.body);
    setPublishMode(derivePublishMode(full));
    setScheduledAtLocal(toDatetimeLocalValue(full.scheduledPublishAt));
    setImages(full.images ?? []);
    setModelId(full.modelId ?? null);
    setCreditsForm(creditsToForm(full.credits));
  };

  const reloadImages = async () => {
    if (!editing) return;
    const response = await fetch(
      `/api/blog-posts/${editing.id}?passwordHash=${encodeURIComponent(passwordHash)}`,
    );
    if (!response.ok) return;
    const full = (await response.json()) as BlogPost;
    setEditing(full);
    setImages(full.images ?? []);
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      alert("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      let publishPayload: {
        published: boolean;
        scheduledPublishAt: string | null;
      };
      try {
        publishPayload = buildPublishPayload(publishMode, scheduledAtLocal);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Invalid publish settings");
        return;
      }

      const payload = {
        passwordHash,
        title: title.trim(),
        teaser: teaser.trim() || null,
        body: body.trim(),
        modelId,
        credits: formToCreditsPayload(creditsForm),
        ...publishPayload,
      };
      const response = editing
        ? await fetch(`/api/blog-posts/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/blog-posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        alert(err?.error || "Save failed");
        return;
      }
      const saved = (await response.json()) as BlogPost;
      await fetchPosts(passwordHash);
      if (!editing) {
        setEditing(saved);
        setCreating(false);
      } else {
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Delete “${post.title}”?`)) return;
    const response = await fetch(`/api/blog-posts/${post.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passwordHash }),
    });
    if (response.ok) {
      await fetchPosts(passwordHash);
      if (editing?.id === post.id) resetForm();
    }
  };

  const handlePreview = async () => {
    if (!editing || !previewEmail.trim()) {
      alert("Enter a preview email address");
      return;
    }
    setPreviewing(true);
    try {
      const response = await fetch(`/api/blog-posts/${editing.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordHash,
          email: previewEmail.trim(),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok) {
        alert(data?.error || "Preview send failed");
        return;
      }
      alert("Preview sent");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!editing || !editing.published || editing.newsletterSentAt) return;
    if (
      !confirm(
        `Email ${confirmedCount} confirmed subscribers?`,
      )
    ) {
      return;
    }
    setSending(true);
    try {
      const response = await fetch(`/api/blog-posts/${editing.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordHash,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        sent?: number;
        failed?: number;
        error?: string;
      } | null;
      if (!response.ok) {
        alert(data?.error || "Send failed");
        return;
      }
      alert(`Sent ${data?.sent ?? 0}, failed ${data?.failed ?? 0}`);
      await openEdit(editing);
      await fetchPosts(passwordHash);
    } finally {
      setSending(false);
    }
  };

  const showForm = creating || editing;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Blog</h1>
          </div>
          {isAuthenticated && !showForm && (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" />
              New post
            </Button>
          )}
        </div>

        {showForm && (
          <div className="bg-white border rounded-lg p-6 mb-8 space-y-4">
            <h2 className="text-xl font-semibold">
              {editing ? "Edit post" : "New post"}
            </h2>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="teaser">Teaser</Label>
              <Input
                id="teaser"
                value={teaser}
                onChange={(e) => setTeaser(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="featured-model">Featured model</Label>
              <select
                id="featured-model"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={modelId ?? ""}
                onChange={(e) =>
                  setModelId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">None</option>
                {modelOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                    {option.published === false ? " (unpublished)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="space-y-3 border rounded-md p-4">
              <legend className="text-sm font-medium px-1">Credits</legend>
              {(
                [
                  ["brand", "Brand", "brandName", "brandUrl"],
                  [
                    "photographer",
                    "Photographer",
                    "photographerName",
                    "photographerUrl",
                  ],
                  ["magazine", "Magazine", "magazineName", "magazineUrl"],
                ] as const
              ).map(([key, label, nameKey, urlKey]) => (
                <div key={key} className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`credit-${key}-name`}>{label} name</Label>
                    <Input
                      id={`credit-${key}-name`}
                      value={creditsForm[nameKey]}
                      onChange={(e) =>
                        setCreditsForm((prev) => ({
                          ...prev,
                          [nameKey]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`credit-${key}-url`}>{label} URL</Label>
                    <Input
                      id={`credit-${key}-url`}
                      value={creditsForm[urlKey]}
                      placeholder="https://"
                      onChange={(e) =>
                        setCreditsForm((prev) => ({
                          ...prev,
                          [urlKey]: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Extras</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCreditsForm((prev) => ({
                        ...prev,
                        extras: [
                          ...prev.extras,
                          { role: "", name: "", url: "" },
                        ],
                      }))
                    }
                  >
                    Add row
                  </Button>
                </div>
                {creditsForm.extras.map((row, index) => (
                  <div
                    key={index}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <Input
                      placeholder="Role"
                      value={row.role}
                      onChange={(e) =>
                        setCreditsForm((prev) => {
                          const extras = [...prev.extras];
                          extras[index] = { ...extras[index], role: e.target.value };
                          return { ...prev, extras };
                        })
                      }
                    />
                    <Input
                      placeholder="Name"
                      value={row.name}
                      onChange={(e) =>
                        setCreditsForm((prev) => {
                          const extras = [...prev.extras];
                          extras[index] = { ...extras[index], name: e.target.value };
                          return { ...prev, extras };
                        })
                      }
                    />
                    <Input
                      placeholder="https://"
                      value={row.url}
                      onChange={(e) =>
                        setCreditsForm((prev) => {
                          const extras = [...prev.extras];
                          extras[index] = { ...extras[index], url: e.target.value };
                          return { ...prev, extras };
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCreditsForm((prev) => ({
                          ...prev,
                          extras: prev.extras.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <div>
                <Label htmlFor="credit-source">Source URL</Label>
                <Input
                  id="credit-source"
                  value={creditsForm.sourceUrl}
                  placeholder="https://www.instagram.com/..."
                  onChange={(e) =>
                    setCreditsForm((prev) => ({
                      ...prev,
                      sourceUrl: e.target.value,
                    }))
                  }
                />
              </div>
            </fieldset>
            <div>
              <Label htmlFor="body">Body (Markdown)</Label>
              <div className="mt-1">
                <BlogMarkdownEditor value={body} onChange={setBody} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPostPreviewOpen(true)}
                disabled={!title.trim() || !body.trim()}
              >
                Preview post
              </Button>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Publishing</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="publish-mode"
                  checked={publishMode === "draft"}
                  onChange={() => setPublishMode("draft")}
                />
                Save as draft
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="publish-mode"
                  checked={publishMode === "now"}
                  onChange={() => setPublishMode("now")}
                />
                Publish now
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="publish-mode"
                  checked={publishMode === "scheduled"}
                  onChange={() => setPublishMode("scheduled")}
                />
                Schedule publish
              </label>
              {publishMode === "scheduled" ? (
                <div>
                  <Label htmlFor="scheduled-at">Publish at</Label>
                  <Input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAtLocal}
                    onChange={(event) => setScheduledAtLocal(event.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Uses your local timezone. A cron job publishes within about a minute of this time.
                  </p>
                </div>
              ) : null}
            </fieldset>
            {editing && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">
                  Newsletter:{" "}
                  {editing.newsletterSentAt
                    ? `sent ${new Date(editing.newsletterSentAt).toLocaleString()}`
                    : "not sent"}
                </p>
                {editing.published && !editing.newsletterSentAt ? (
                  <Button
                    variant="outline"
                    disabled={sending}
                    onClick={() => void handleSend()}
                  >
                    {sending
                      ? "Sending…"
                      : `Send to mailing list (${confirmedCount})`}
                  </Button>
                ) : null}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="preview-email">Preview email</Label>
                  <Input
                    id="preview-email"
                    type="email"
                    value={previewEmail}
                    onChange={(e) => setPreviewEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <Button
                    variant="outline"
                    disabled={previewing}
                    onClick={() => void handlePreview()}
                  >
                    {previewing ? "Sending preview…" : "Send email preview"}
                  </Button>
                </div>
                <BlogImageManager
                  postId={editing.id}
                  passwordHash={passwordHash}
                  images={images}
                  onImagesChange={reloadImages}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
            {!editing && (
              <p className="text-xs text-gray-500">
                Save once to enable image upload and reordering.
              </p>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <div className="bg-white border rounded-lg divide-y">
            {posts.length === 0 ? (
              <p className="p-6 text-gray-500">No posts yet.</p>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{post.title}</p>
                    <p className="text-xs text-gray-500">
                      {postStatusLabel(post)} · /{post.slug}/ · Newsletter{" "}
                      {post.newsletterSentAt ? "sent" : "not sent"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void openEdit(post)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDelete(post)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          passwordDialogActionRef.current = null;
        }}
        onSuccess={(hash) => {
          setShowPasswordDialog(false);
          passwordDialogActionRef.current?.(hash);
        }}
        title={passwordDialogTitle}
        description={passwordDialogDescription}
      />

      <BlogPostPreview
        open={postPreviewOpen}
        onOpenChange={setPostPreviewOpen}
        title={title}
        teaser={teaser}
        body={body}
        published={publishMode === "now"}
        slug={editing?.slug}
        images={images}
        modelName={
          modelOptions.find((option) => option.id === modelId)?.name ?? null
        }
        modelSlug={
          modelOptions.find((option) => option.id === modelId)?.slug ?? null
        }
        credits={formToCreditsPayload(creditsForm)}
      />
    </div>
  );
}
