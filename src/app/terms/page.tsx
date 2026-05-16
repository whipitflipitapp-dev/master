import Link from "next/link";
import type { Metadata } from "next";

import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";

const LAST_UPDATED = "May 16, 2026";

const SECTIONS = [
  {
    id: "acceptance",
    title: "Acceptance of terms",
    paragraphs: [
      "These Terms of Service (“Terms”) govern your access to and use of Whip It Flip It (“we,” “us,” or “our”), a recipe and cooking platform that helps you discover meals, save favorites, manage allergy preferences, and use AI-assisted cooking features.",
      "By creating an account, subscribing to a plan, or otherwise using the service, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the service.",
    ],
  },
  {
    id: "eligibility",
    title: "Account eligibility",
    paragraphs: [
      "You must be at least 13 years old (or the minimum age required in your jurisdiction) to use the service. If you are under the age of majority where you live, you may use the service only with permission and supervision of a parent or legal guardian.",
      "You are responsible for keeping your login credentials confidential and for all activity under your account. Provide accurate information when you register and keep your profile up to date.",
    ],
  },
  {
    id: "user-content",
    title: "Your recipes and content",
    paragraphs: [
      "You may create, upload, and share recipes, photos, video links, profile information, and other content (“User Content”). You retain ownership of your User Content, but you grant us a worldwide, non-exclusive, royalty-free license to host, display, reproduce, and distribute it as needed to operate and promote the service (for example on recipe browse pages, chef profiles, and search).",
      "You represent that you have the rights to post your User Content and that it does not infringe others’ rights or violate law. We may remove content that violates these Terms or that we reasonably believe is harmful, misleading, or abusive.",
      "Free accounts may be subject to upload limits (for example a monthly cap on new recipes). Paid tiers may include additional creator tools as described on our upgrade page.",
    ],
  },
  {
    id: "subscriptions",
    title: "Subscriptions and plans",
    paragraphs: [
      "We offer a free tier and paid plans such as Pro and AI Chef. Feature availability depends on your active plan and may change over time; current benefits are described on the upgrade page in the app.",
      "Paid subscriptions are processed by Stripe. By subscribing, you authorize recurring charges according to the price and billing interval shown at checkout until you cancel. Taxes may apply where required by law.",
      "You can manage or cancel billing through the Stripe customer portal linked from your profile or upgrade page. Cancellation stops future charges; access to paid features typically continues until the end of the current billing period unless otherwise stated.",
      "We may change plan names, prices, or features with reasonable notice where required. Price changes generally apply to new purchases or renewals after the effective date.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: [
      "You agree not to misuse the service. Prohibited conduct includes: attempting to gain unauthorized access to accounts or systems; scraping or bulk harvesting data without permission; uploading malware or harmful code; harassing other users; impersonating others; posting illegal, defamatory, or sexually exploitative content; or using the service to send spam or unsolicited marketing.",
      "You may not use AI features to generate content that violates law, promotes harm, or infringes intellectual property. We may rate-limit, suspend, or terminate access for abuse or security reasons.",
    ],
  },
  {
    id: "allergen-disclaimer",
    title: "Recipes, allergies, and food safety",
    paragraphs: [
      "Whip It Flip It provides recipe ideas, ingredient matching, allergy filters, and educational material for convenience only. We do not warrant that any recipe, ingredient list, AI suggestion, or label is complete, accurate, or free of allergens.",
      "You are solely responsible for verifying ingredients, brands, cross-contact, and preparation for your own health and safety. Allergy-related features are not medical advice. See our allergy education pages and consult qualified professionals for medical decisions.",
      "To the fullest extent permitted by law, we disclaim liability for allergic reactions, illness, injury, or other harm arising from your use of recipes or content on the service.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    paragraphs: [
      "The service, including our branding, software, design, and documentation (excluding your User Content), is owned by us or our licensors and protected by intellectual property laws. You may not copy, modify, or reverse engineer the service except as allowed by law or with our written permission.",
      "Third-party names, logos, and embedded media (for example YouTube players) belong to their respective owners. Affiliate links you add to cookbook listings must comply with applicable disclosure rules in your jurisdiction.",
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Disclaimer and limitation of liability",
    paragraphs: [
      "THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.",
      "To the fullest extent permitted by law, we and our suppliers will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill, arising from your use of the service.",
      "Our total liability for claims relating to the service in any twelve-month period is limited to the greater of (a) amounts you paid us for the service in that period or (b) one hundred U.S. dollars (USD $100), except where liability cannot be limited under applicable law.",
    ],
  },
  {
    id: "termination",
    title: "Termination",
    paragraphs: [
      "You may stop using the service at any time and may request account deletion subject to our data retention practices described in the Privacy Policy.",
      "We may suspend or terminate your access if you violate these Terms, if required by law, or if we discontinue the service. Upon termination, provisions that by their nature should survive (including intellectual property, disclaimers, and limitations of liability) will remain in effect.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing law",
    paragraphs: [
      "These Terms are governed by the laws of [State/Country — update before launch], without regard to conflict-of-law principles. Courts in [Venue — update before launch] will have exclusive jurisdiction over disputes, except where mandatory consumer protection laws in your country require otherwise.",
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    paragraphs: [
      "We may update these Terms from time to time. We will post the revised version on this page and update the “Last updated” date. Material changes may be communicated through the app or by email where appropriate. Continued use after changes become effective constitutes acceptance of the revised Terms.",
    ],
  },
  {
    id: "contact",
    title: "Contact us",
    paragraphs: [
      "For questions about these Terms, email legal@whipitflipit.com (replace with your operational address when available).",
    ],
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await resolveAppLocale());
  return {
    title: dictText(dict, "terms_meta_title", { brand: dict.brand }),
    description: dictText(dict, "terms_meta_desc"),
  };
}

export default async function TermsOfServicePage() {
  const dict = await getDictionary(await resolveAppLocale());

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-8 pb-10">
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          {dictText(dict, "terms_page_title")}
        </h1>
        <p className="mt-2 text-[length:var(--text-meta)] text-[var(--muted)]">
          {dictText(dict, "terms_last_updated", { date: LAST_UPDATED })}
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
          href="/privacy"
          className="text-center text-sm font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
        >
          {dictText(dict, "privacy_page_title")}
        </Link>
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
