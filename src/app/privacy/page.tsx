import Link from "next/link";
import type { Metadata } from "next";

import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";

const LAST_UPDATED = "May 16, 2026";

const SECTIONS = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "Whip It Flip It (“we,” “us,” or “our”) is a recipe and cooking platform that helps you discover meals, save favorites, manage allergy preferences, and use AI-assisted cooking features.",
      "This Privacy Policy explains what personal information we collect, how we use it, who we share it with, and the choices you have. By creating an account or using the service, you agree to this policy.",
    ],
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    paragraphs: [
      "Account information: email address, display name, profile details you provide during onboarding (such as name, language, cooking habits, and food preferences), and authentication identifiers managed through our auth provider.",
      "Recipe and content data: recipes you create or upload (titles, ingredients, instructions, photos, video links), public profile information shown on chef pages, and cookbook or affiliate links you add.",
      "Preferences and safety: saved recipes, allergy and dietary selections, strict vs. warn modes for allergen filtering, and related profile settings used to personalize browsing and “Help me cook” results.",
      "Usage and technical data: pages viewed, features used, device/browser type, approximate location derived from IP (for security and analytics), log data, and cookies or similar technologies described below.",
      "Payment-related data: if you subscribe to a paid plan, Stripe processes payment card and billing details. We receive subscription status, Stripe customer IDs, and limited billing metadata—not full card numbers.",
    ],
  },
  {
    id: "how-we-use",
    title: "How we use your information",
    paragraphs: [
      "Provide and improve the service, including recipe browse/search, saves, dashboards, AI Chef and pantry matching, and allergy-aware filtering.",
      "Authenticate you, secure accounts, prevent abuse, and comply with legal obligations.",
      "Process subscriptions and manage your plan tier through Stripe.",
      "Send service-related communications (for example sign-in links or important account notices).",
      "Understand aggregate usage to fix bugs, improve performance, and develop new features.",
    ],
  },
  {
    id: "supabase-auth",
    title: "Authentication and storage (Supabase)",
    paragraphs: [
      "We use Supabase for authentication, database storage, and file storage (for example recipe photos). Your account credentials and session tokens are handled by Supabase Auth; recipe and profile data are stored in Supabase-hosted databases with access controls.",
      "Row-level security and server-side checks limit access to your data. You should keep your login credentials confidential and sign out on shared devices.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    paragraphs: [
      "We use essential cookies to keep you signed in, remember language preferences, and protect the service.",
      "We may use analytics or performance cookies to understand how the app is used. You can control non-essential cookies through your browser settings; disabling essential cookies may affect sign-in and core features.",
    ],
  },
  {
    id: "third-parties",
    title: "Third-party services",
    paragraphs: [
      "Stripe: processes payments and subscriptions when you upgrade. Stripe’s privacy policy governs payment data they collect directly.",
      "Supabase: hosts authentication, database, and storage infrastructure as described above.",
      "Embedded content: recipe pages may include third-party video players (for example YouTube). Those providers may collect usage data under their own policies when you interact with embedded media.",
      "We do not sell your personal information. We share data with service providers only as needed to operate the product, under contractual safeguards.",
    ],
  },
  {
    id: "retention",
    title: "Data retention",
    paragraphs: [
      "We retain account and recipe data while your account is active. If you delete your account or request deletion, we will remove or anonymize personal data within a reasonable period, except where retention is required for legal, security, or backup purposes.",
    ],
  },
  {
    id: "your-rights",
    title: "Your rights and choices",
    paragraphs: [
      "Depending on where you live, you may have rights to access, correct, delete, or export your personal data, and to object to or restrict certain processing.",
      "You can update profile, allergy, and language settings in the app. To change subscription billing, use the billing portal linked from your profile or upgrade page.",
      "To exercise privacy rights or ask questions, contact us using the details below. We may need to verify your identity before fulfilling a request.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "The service is not directed to children under 13 (or the minimum age in your jurisdiction). We do not knowingly collect personal information from children. Contact us if you believe a child has provided data we should delete.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. We will post the revised version on this page and update the “Last updated” date. Material changes may be communicated through the app or by email where appropriate.",
    ],
  },
  {
    id: "contact",
    title: "Contact us",
    paragraphs: [
      "For privacy questions or requests, email privacy@whipitflipit.com (replace with your operational address when available).",
    ],
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await resolveAppLocale());
  return {
    title: dictText(dict, "privacy_meta_title", { brand: dict.brand }),
    description: dictText(dict, "privacy_meta_desc"),
  };
}

export default async function PrivacyPolicyPage() {
  const dict = await getDictionary(await resolveAppLocale());

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-8 pb-10">
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          {dictText(dict, "privacy_page_title")}
        </h1>
        <p className="mt-2 text-[length:var(--text-meta)] text-[var(--muted)]">
          {dictText(dict, "privacy_last_updated", { date: LAST_UPDATED })}
        </p>
      </header>

      <article className="flex flex-col gap-10 text-sm leading-relaxed text-[var(--text)]">
        {SECTIONS.map((section, i) => (
          <section
            key={section.id}
            id={section.id}
            className={`scroll-mt-6 ${i < SECTIONS.length - 1 ? "border-b border-[var(--border)] pb-10" : ""}`}
          >
            <h2 className="text-lg font-semibold text-[var(--text)]">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="mt-3 text-[var(--muted)]">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6">
        <Link
          href="/recipes"
          className="text-center text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
        >
          {dictText(dict, "cta_browse")}
        </Link>
      </div>
    </main>
  );
}
