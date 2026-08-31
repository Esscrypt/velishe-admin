"use client";

import { useMemo } from "react";
import { markdownToSafeHtml } from "@/lib/blog-markdown";
import { PRODUCTION_SITE_URL } from "@/lib/user-fe-url";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BlogImageMeta } from "@/components/BlogImageManager";

const BLOG_PROSE_CLASS =
  "blog-prose text-base leading-7 text-gray-900 space-y-4 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-black [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-700";

type BlogPostPreviewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  teaser: string;
  body: string;
  published: boolean;
  slug?: string;
  images: BlogImageMeta[];
};

export default function BlogPostPreview({
  open,
  onOpenChange,
  title,
  teaser,
  body,
  published,
  slug,
  images,
}: BlogPostPreviewProps) {
  const bodyHtml = useMemo(() => markdownToSafeHtml(body), [body]);

  const sortedImages = useMemo(
    () => [...images].sort((a, b) => a.order - b.order),
    [images],
  );
  const cover = sortedImages.find((image) => image.order === 0);
  const gallery = sortedImages.filter((image) => image.order > 0);
  const liveUrl =
    published && slug ? `${PRODUCTION_SITE_URL}/blog/${slug}/` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Post preview</DialogTitle>
          <DialogDescription>
            {published
              ? "How this post appears on the live journal."
              : "Draft preview — save and publish to show on the live site."}
          </DialogDescription>
        </DialogHeader>

        <article className="px-6 py-8 sm:px-8">
          {!published ? (
            <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Draft — not visible on{" "}
              <span className="font-medium">{PRODUCTION_SITE_URL}</span>
            </p>
          ) : null}

          <p className="text-xs tracking-[0.14em] uppercase text-gray-500 mb-3">
            Journal
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-black leading-tight mb-3">
            {title.trim() || "Untitled post"}
          </h1>
          {teaser.trim() ? (
            <p className="text-lg text-gray-600 mb-3">{teaser.trim()}</p>
          ) : null}
          <p className="text-sm text-gray-500 mb-8">
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          {cover ? (
            <div className="relative w-full aspect-[16/10] mb-8 overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/blog-images/${cover.id}`}
                alt={title.trim() || "Cover image"}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}

          <div
            className={BLOG_PROSE_CLASS}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {gallery.length > 0 ? (
            <div className="mt-10 grid grid-cols-2 gap-2">
              {gallery.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-[3/4] overflow-hidden bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/blog-images/${image.id}`}
                    alt={image.alt || title.trim() || "Gallery image"}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {liveUrl ? (
            <p className="mt-10 text-sm text-gray-600">
              Live URL:{" "}
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 underline hover:text-gray-600"
              >
                {liveUrl}
              </a>
            </p>
          ) : null}
        </article>
      </DialogContent>
    </Dialog>
  );
}
