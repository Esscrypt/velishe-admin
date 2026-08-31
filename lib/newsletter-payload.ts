import { buildNewsletterHtml, type NewsletterBuildArgs } from "@/lib/newsletter-html";
import { buildNewsletterText } from "@/lib/newsletter-text";

export type { NewsletterBuildArgs };

export function buildNewsletterPayload(
  args: NewsletterBuildArgs & { subjectPrefix?: string },
): { subject: string; html: string; text: string } {
  const prefix = args.subjectPrefix ?? "";
  return {
    subject: `${prefix}${args.title}`,
    html: buildNewsletterHtml(args),
    text: buildNewsletterText(args),
  };
}
