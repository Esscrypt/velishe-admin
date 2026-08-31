// @ts-expect-error bun:test
import { describe, expect, test } from "bun:test";
import {
  applyPublishIntent,
  isScheduledForFuture,
  resolvePublishIntent,
} from "./blog-publish";

describe("resolvePublishIntent", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");
  const current = {
    published: false,
    publishedAt: null,
    scheduledPublishAt: null,
  };

  test("schedules a future post", () => {
    const intent = resolvePublishIntent(
      { scheduledPublishAt: "2026-09-01T09:00:00.000Z" },
      current,
      now,
    );
    expect(intent).toEqual({
      mode: "scheduled",
      at: new Date("2026-09-01T09:00:00.000Z"),
    });
  });

  test("publishes immediately when published is true", () => {
    expect(resolvePublishIntent({ published: true }, current, now)).toEqual({
      mode: "now",
    });
  });

  test("publishes immediately when schedule is in the past", () => {
    expect(
      resolvePublishIntent(
        { scheduledPublishAt: "2026-08-30T09:00:00.000Z" },
        current,
        now,
      ),
    ).toEqual({ mode: "now" });
  });
});

describe("applyPublishIntent", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");

  test("keeps publishedAt when scheduling", () => {
    const fields = applyPublishIntent(
      { mode: "scheduled", at: new Date("2026-09-01T09:00:00.000Z") },
      {
        published: true,
        publishedAt: new Date("2026-08-01T09:00:00.000Z"),
        scheduledPublishAt: null,
      },
      now,
    );
    expect(fields.published).toBe(false);
    expect(fields.scheduledPublishAt?.toISOString()).toBe(
      "2026-09-01T09:00:00.000Z",
    );
    expect(fields.publishedAt?.toISOString()).toBe("2026-08-01T09:00:00.000Z");
  });

  test("sets publishedAt on first publish", () => {
    const fields = applyPublishIntent(
      { mode: "now" },
      {
        published: false,
        publishedAt: null,
        scheduledPublishAt: null,
      },
      now,
    );
    expect(fields.published).toBe(true);
    expect(fields.publishedAt?.toISOString()).toBe(now.toISOString());
    expect(fields.scheduledPublishAt).toBeNull();
  });
});

describe("isScheduledForFuture", () => {
  test("detects future schedule", () => {
    expect(
      isScheduledForFuture(
        "2099-01-01T09:00:00.000Z",
        new Date("2026-08-31T12:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
