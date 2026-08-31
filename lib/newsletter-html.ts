import { markdownExcerptHtml } from "@/lib/newsletter-excerpt";

export type NewsletterBuildArgs = {
  title: string;
  teaser: string;
  body: string;
  coverImageSrc: string | null;
  readUrl: string;
  unsubscribeUrl: string;
  isPreview?: boolean;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildNewsletterHtml(args: NewsletterBuildArgs): string {
  const cover = args.coverImageSrc
    ? `<img src="${escapeHtml(args.coverImageSrc)}" alt="" style="width:100%;max-width:560px;height:auto;display:block;margin:0 0 24px;border-radius:2px" />`
    : "";

  const excerptHtml = markdownExcerptHtml(args.body);
  const excerptBlock = excerptHtml
    ? `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#333;margin:0 0 24px">${excerptHtml}</div>`
    : "";

  const footerLink = args.isPreview
    ? `<span style="color:#888">Preview — unsubscribe link disabled</span>`
    : `<a href="${escapeHtml(args.unsubscribeUrl)}" style="color:#888">Unsubscribe</a>`;

  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#111;padding:8px 0 32px">
      <p style="font-family:system-ui,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#888;margin:0 0 20px">
        VÈLISHE Journal
      </p>
      ${cover}
      <h1 style="font-size:28px;line-height:1.2;margin:0 0 12px;font-weight:700">${escapeHtml(args.title)}</h1>
      <p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#555;margin:0 0 20px">
        ${escapeHtml(args.teaser)}
      </p>
      ${excerptBlock}
      <p style="margin:0 0 32px">
        <a href="${escapeHtml(args.readUrl)}"
           style="display:inline-block;background:#111;color:#fff;padding:12px 20px;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;letter-spacing:0.02em">
          Read on the site
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px" />
      <p style="font-family:system-ui,sans-serif;font-size:12px;color:#888;margin:0;line-height:1.5">
        Velishe Model Management<br />
        ${footerLink}
      </p>
    </div>
  `.trim();
}
