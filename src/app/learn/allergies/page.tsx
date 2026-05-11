import Link from "next/link";
import type { Metadata } from "next";

import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";

const TOPIC_IDS = [
  "what-is-food-allergy",
  "common-allergens",
  "cross-contamination",
  "reading-labels",
  "cooking-safely-at-home",
] as const;

const TOPIC_KEYS = [
  "learn_topic_what_is",
  "learn_topic_common",
  "learn_topic_cross",
  "learn_topic_labels",
  "learn_topic_cooking",
] as const;

const SECTION_BODY_KEYS = [
  "learn_section_what_is_body",
  "learn_section_common_body",
  "learn_section_cross_body",
  "learn_section_labels_body",
  "learn_section_cooking_body",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await resolveAppLocale());
  return {
    title: dictText(dict, "learn_allergies_meta_title", { brand: dict.brand }),
    description: dictText(dict, "learn_allergies_meta_desc"),
  };
}

function AllergyDisclaimer({
  dict,
}: {
  dict: Record<string, string>;
}) {
  return (
    <aside
      className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--primary)_24%,var(--border))] bg-[color-mix(in_srgb,var(--primary-muted)_45%,var(--card))] p-4 shadow-[var(--shadow-card)]"
      aria-labelledby="allergy-disclaimer-heading"
    >
      <h2
        id="allergy-disclaimer-heading"
        className="text-sm font-semibold text-[var(--text)]"
      >
        {dictText(dict, "learn_allergies_disclaimer_title")}
      </h2>
      <p className="mt-2 text-[length:var(--text-meta)] leading-relaxed text-[var(--muted)]">
        {dictText(dict, "learn_allergies_disclaimer_body")}
      </p>
    </aside>
  );
}

export default async function AllergyEducationPage() {
  const dict = await getDictionary(await resolveAppLocale());

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-8 pb-10">
      <AllergyDisclaimer dict={dict} />

      <header className="border-b border-[var(--border)] pb-5">
        <p className="text-[length:var(--text-meta)] font-medium text-[var(--primary)]">
          {dictText(dict, "learn_kicker")}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">
          {dictText(dict, "learn_allergies_page_title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {dictText(dict, "learn_allergies_intro")}
        </p>
      </header>

      <nav
        aria-label="Topics on this page"
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]"
      >
        <p className="text-sm font-semibold text-[var(--text)]">
          {dictText(dict, "learn_on_this_page")}
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {TOPIC_IDS.map((id, i) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="font-medium text-[var(--primary)] underline-offset-4 hover:underline"
              >
                {dictText(dict, TOPIC_KEYS[i])}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="flex flex-col gap-10 text-sm leading-relaxed text-[var(--text)]">
        {TOPIC_IDS.map((id, i) => (
          <section
            key={id}
            id={id}
            className={`scroll-mt-6 ${i < TOPIC_IDS.length - 1 ? "border-b border-[var(--border)] pb-10" : ""}`}
          >
            <h2 className="text-lg font-semibold text-[var(--text)]">
              {dictText(dict, TOPIC_KEYS[i])}
            </h2>
            <p className="mt-3 text-[var(--muted)]">
              {dictText(dict, SECTION_BODY_KEYS[i])}
            </p>
          </section>
        ))}
      </article>

      <AllergyDisclaimer dict={dict} />

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6">
        <Link
          href="/profile"
          className="text-center text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
        >
          {dictText(dict, "learn_back_profile")}
        </Link>
        <Link
          href="/recipes"
          className="text-center text-sm font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
        >
          {dictText(dict, "learn_browse_recipes")}
        </Link>
      </div>
    </main>
  );
}
