export type PublishIntent =
  | { mode: "draft" }
  | { mode: "now" }
  | { mode: "scheduled"; at: Date };

export type PublishFields = {
  published: boolean;
  publishedAt: Date | null;
  scheduledPublishAt: Date | null;
};

export function parseScheduledPublishAt(
  value: unknown,
): Date | null | "invalid" {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") return "invalid";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "invalid";
  return parsed;
}

export function resolvePublishIntent(
  input: {
    published?: boolean;
    scheduledPublishAt?: unknown;
  },
  current: {
    published: boolean;
    publishedAt: Date | null;
    scheduledPublishAt: Date | null;
  },
  now = new Date(),
): PublishIntent | { error: string } {
  const scheduled = parseScheduledPublishAt(input.scheduledPublishAt);
  if (scheduled === "invalid") {
    return { error: "scheduledPublishAt must be a valid ISO datetime" };
  }

  if (scheduled && scheduled.getTime() > now.getTime()) {
    return { mode: "scheduled", at: scheduled };
  }

  if (input.published === true) {
    return { mode: "now" };
  }

  if (scheduled && scheduled.getTime() <= now.getTime()) {
    return { mode: "now" };
  }

  return { mode: "draft" };
}

export function applyPublishIntent(
  intent: PublishIntent,
  current: {
    published: boolean;
    publishedAt: Date | null;
    scheduledPublishAt: Date | null;
  },
  now = new Date(),
): PublishFields {
  switch (intent.mode) {
    case "scheduled":
      return {
        published: false,
        publishedAt: current.publishedAt,
        scheduledPublishAt: intent.at,
      };
    case "now":
      return {
        published: true,
        publishedAt: current.publishedAt ?? now,
        scheduledPublishAt: null,
      };
    case "draft":
      return {
        published: false,
        publishedAt: current.publishedAt,
        scheduledPublishAt: null,
      };
  }
}

export function isScheduledForFuture(
  scheduledPublishAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!scheduledPublishAt) return false;
  const date =
    scheduledPublishAt instanceof Date
      ? scheduledPublishAt
      : new Date(scheduledPublishAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > now.getTime();
}

export function postStatusLabel(post: {
  published: boolean;
  scheduledPublishAt: Date | string | null;
}): string {
  if (post.published) return "Published";
  if (isScheduledForFuture(post.scheduledPublishAt)) {
    const date = new Date(post.scheduledPublishAt as string);
    return `Scheduled ${date.toLocaleString()}`;
  }
  return "Draft";
}
