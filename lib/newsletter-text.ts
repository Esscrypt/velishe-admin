import { markdownExcerptPlain } from "@/lib/newsletter-excerpt";
import type { NewsletterBuildArgs } from "@/lib/newsletter-html";

export function buildNewsletterText(args: NewsletterBuildArgs): string {
  const excerpt = markdownExcerptPlain(args.body);
  const footer = args.isPreview
    ? "Preview — unsubscribe link disabled"
    : `Unsubscribe: ${args.unsubscribeUrl}`;

  return [
    "VÈLISHE Journal",
    "",
    args.title,
    "",
    args.teaser,
    excerpt ? `\n${excerpt}` : "",
    "",
    `Read on the site: ${args.readUrl}`,
    "",
    "Velishe Model Management",
    footer,
  ]
    .filter((line, index, arr) => line !== "" || arr[index - 1] !== "")
    .join("\n");
}
