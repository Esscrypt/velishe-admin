CREATE TABLE IF NOT EXISTS "home_faq_items" (
	"id" text PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"sort_order" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "home_faq_items_locale_sort_order_uidx" ON "home_faq_items" ("locale","sort_order");
--> statement-breakpoint
DO $$
DECLARE
  row_count integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'home_faq_content'
  ) THEN
    -- Only seed from legacy table when items are still empty
    SELECT COUNT(*) INTO row_count FROM home_faq_items;
    IF row_count = 0 THEN
    -- EN: About
    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('en-about-' || id), 'en', 0,
      COALESCE(NULLIF(TRIM(question_about_en), ''), 'VÈLISHE Model Management — Sofia, Bulgaria'),
      COALESCE(NULLIF(TRIM(intro_en), ''), ''),
      COALESCE(updated_at, now())
    FROM home_faq_content;

    -- EN: What we do
    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('en-what-' || id), 'en', 1,
      COALESCE(NULLIF(TRIM(question_what_we_do_en), ''), 'What Does Velishe Model Management Do?'),
      COALESCE(NULLIF(TRIM(what_we_do_en), ''), ''),
      COALESCE(updated_at, now())
    FROM home_faq_content;

    -- EN: Vision (only when non-empty)
    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('en-vision-' || id), 'en', 2,
      'Our Vision',
      TRIM(vision_en),
      COALESCE(updated_at, now())
    FROM home_faq_content
    WHERE NULLIF(TRIM(vision_en), '') IS NOT NULL;

    -- EN: Requirements (sort 3 if vision exists, else 2 — re-number below)
    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('en-req-' || id), 'en', 3,
      COALESCE(NULLIF(TRIM(question_requirements_en), ''), 'What Are the Requirements to Become a Velishe Model?'),
      COALESCE(NULLIF(TRIM(requirements_en), ''), ''),
      COALESCE(updated_at, now())
    FROM home_faq_content;

    -- EN: Academy
    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('en-academy-' || id), 'en', 4,
      COALESCE(NULLIF(TRIM(question_academy_en), ''), 'What Is the VÈLISHE Model Academy?'),
      COALESCE(NULLIF(TRIM(academy_en), ''), ''),
      COALESCE(updated_at, now())
    FROM home_faq_content;

    -- EN: Journal when answer non-empty
    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('en-journal-' || id), 'en', 5,
      COALESCE(NULLIF(TRIM(question_journal_en), ''), 'What Is Velishe Journal?'),
      TRIM(journal_en),
      COALESCE(updated_at, now())
    FROM home_faq_content
    WHERE NULLIF(TRIM(journal_en), '') IS NOT NULL;

    -- EN: Booking
    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('en-booking-' || id), 'en', 6,
      COALESCE(NULLIF(TRIM(question_booking_en), ''), 'How Do You Book a Model or Apply to Velishe?'),
      COALESCE(NULLIF(TRIM(booking_en), ''), ''),
      COALESCE(updated_at, now())
    FROM home_faq_content;

    -- BG items (same pattern)
    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('bg-about-' || id), 'bg', 0,
      COALESCE(NULLIF(TRIM(question_about_bg), ''), 'За VÈLISHE'),
      COALESCE(NULLIF(TRIM(intro_bg), ''), ''),
      COALESCE(updated_at, now())
    FROM home_faq_content;

    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('bg-what-' || id), 'bg', 1,
      COALESCE(NULLIF(TRIM(question_what_we_do_bg), ''), 'Какво прави Velishe Model Management?'),
      COALESCE(NULLIF(TRIM(what_we_do_bg), ''), ''),
      COALESCE(updated_at, now())
    FROM home_faq_content;

    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('bg-vision-' || id), 'bg', 2,
      'Нашата визия',
      TRIM(vision_bg),
      COALESCE(updated_at, now())
    FROM home_faq_content
    WHERE NULLIF(TRIM(vision_bg), '') IS NOT NULL;

    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('bg-req-' || id), 'bg', 3,
      COALESCE(NULLIF(TRIM(question_requirements_bg), ''), 'Какви са изискванията да станеш модел в Velishe?'),
      COALESCE(NULLIF(TRIM(requirements_bg), ''), ''),
      COALESCE(updated_at, now())
    FROM home_faq_content;

    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('bg-academy-' || id), 'bg', 4,
      COALESCE(NULLIF(TRIM(question_academy_bg), ''), 'Какво е VÈLISHE Model Academy?'),
      COALESCE(NULLIF(TRIM(academy_bg), ''), ''),
      COALESCE(updated_at, now())
    FROM home_faq_content;

    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('bg-journal-' || id), 'bg', 5,
      COALESCE(NULLIF(TRIM(question_journal_bg), ''), 'Какво е Velishe Journal?'),
      TRIM(journal_bg),
      COALESCE(updated_at, now())
    FROM home_faq_content
    WHERE NULLIF(TRIM(journal_bg), '') IS NOT NULL;

    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at)
    SELECT md5('bg-booking-' || id), 'bg', 6,
      COALESCE(NULLIF(TRIM(question_booking_bg), ''), 'Как да резервирате модел или да кандидатствате в Velishe?'),
      COALESCE(NULLIF(TRIM(booking_bg), ''), ''),
      COALESCE(updated_at, now())
    FROM home_faq_content;

    -- Wipe locales with no non-empty answers (titles-only CMS → use brand defaults / EN fallback)
    DELETE FROM home_faq_items AS i
    WHERE NOT EXISTS (
      SELECT 1 FROM home_faq_items e
      WHERE e.locale = i.locale AND NULLIF(TRIM(e.answer), '') IS NOT NULL
    );

    -- Re-order each locale to contiguous sort_order
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY locale ORDER BY sort_order) - 1 AS new_order
      FROM home_faq_items
    )
    UPDATE home_faq_items AS i
    SET sort_order = ordered.new_order
    FROM ordered
    WHERE i.id = ordered.id;
    END IF;

    DROP TABLE IF EXISTS "home_faq_content";
  END IF;

  SELECT COUNT(*) INTO row_count FROM home_faq_items WHERE locale = 'en';
  IF row_count = 0 THEN
    INSERT INTO home_faq_items (id, locale, sort_order, question, answer, updated_at) VALUES
      ('default-en-about', 'en', 0, 'VÈLISHE Model Management — Sofia, Bulgaria',
       'VÈLISHE Model Management is a boutique modeling agency founded in 2025 and based in Sofia, Bulgaria. We represent and develop professional fashion and commercial models — women and men with a distinct presence, individual attitude, and authentic character that translates across editorial, campaign, and digital work. We are a new-generation agency built on the belief that great representation shapes careers. We work with a selective, carefully curated roster and invest in each model''s long-term development — from first casting to international placement.',
       now()),
      ('default-en-what-we-do', 'en', 1, 'What Does Velishe Model Management Do?',
       'Our talent works across 7 categories: fashion editorial, commercial advertising, catalogue, runway, beauty, lifestyle, and digital content. We connect models with leading Bulgarian and international brands, creative directors, and photographers — placing talent in campaigns that make an impact. Beyond bookings, we guide models through the industry — helping them build a professional portfolio, understand their market positioning, and navigate the demands of a modeling career with confidence and clarity.',
       now()),
      ('default-en-vision', 'en', 2, 'Our Vision',
       'Our vision goes beyond trends. We focus on timeless presence, individuality, and a sense of narrative within every model we work with. VÈLISHE is a statement — selective, bold, and quietly assured. We exist to shape faces, stories, and moments that leave an imprint.',
       now()),
      ('default-en-requirements', 'en', 3, 'What Are the Requirements to Become a Velishe Model?',
       'We represent both women and men. Female models typically begin at a minimum height of 173 cm; male models at 183 cm. We prioritise natural, unedited portfolios and look for real character above all else. Applicants submit natural photos with no filters, editing, or makeup and are reviewed on a rolling basis.',
       now()),
      ('default-en-academy', 'en', 4, 'What Is the VÈLISHE Model Academy?',
       'The VÈLISHE Academy is our structured training programme for aspiring and signed talents who want to understand how the modeling industry truly works. The Academy covers composites and casting preparation, professional conduct on set, industry etiquette, and building a sustainable career. Enrolment is by intake — join the waitlist to be notified when the next programme opens.',
       now()),
      ('default-en-booking', 'en', 5, 'How Do You Book a Model or Apply to Velishe?',
       'We welcome enquiries from clients looking to book talent for campaigns, editorials, and commercial productions. For casting requests, production briefs, or general booking enquiries, reach out directly to our team.',
       now());
  END IF;
END $$;
