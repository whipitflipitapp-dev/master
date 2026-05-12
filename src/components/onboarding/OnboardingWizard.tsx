"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";

import {
  completeOnboarding,
  FOOD_CATEGORY_VALUES,
  REFERRAL_SOURCE_VALUES,
} from "@/app/actions/onboarding";
import { ProfileAllergiesForm } from "@/components/profile/ProfileAllergiesForm";
import type { AllergyMode } from "@/lib/profile";

const TOTAL_STEPS = 7;

type InitialValues = {
  firstName: string;
  lastName: string;
  birthdate: string;
  foodsLoved: string[];
  foodsLovedOther: string;
  cooksPerWeek: number | null;
  allergyOther: string;
  referralSource: string;
};

type Props = {
  allergens: { id: string; name: string }[];
  selectedIds: string[];
  defaultAllergyMode: AllergyMode;
  initial: InitialValues;
};

const inputClass =
  "min-h-[48px] w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[color-mix(in_srgb,var(--primary)_45%,transparent)] transition-[border-color,box-shadow] focus:border-[color-mix(in_srgb,var(--primary)_55%,var(--border))] focus:ring-2";

const labelClass =
  "flex flex-col gap-1.5 text-sm font-medium text-[var(--text)]";

const primaryBtnClass =
  "min-h-[48px] rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] hover:bg-[var(--primary-hover)] disabled:opacity-60";

const secondaryBtnClass =
  "min-h-[48px] rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-60";

const ghostLinkBtnClass =
  "text-sm font-medium text-[var(--muted)] underline-offset-4 hover:underline";

export function OnboardingWizard({
  allergens,
  selectedIds,
  defaultAllergyMode,
  initial,
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [finishErr, setFinishErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [birthdate, setBirthdate] = useState(initial.birthdate);
  const [foodsLoved, setFoodsLoved] = useState<string[]>(initial.foodsLoved);
  const [foodsLovedOther, setFoodsLovedOther] = useState(
    initial.foodsLovedOther,
  );
  const [cooksPerWeek, setCooksPerWeek] = useState<string>(
    initial.cooksPerWeek === null ? "" : String(initial.cooksPerWeek),
  );
  const [allergyOtherChecked, setAllergyOtherChecked] = useState<boolean>(
    Boolean(initial.allergyOther),
  );
  const [allergyOther, setAllergyOther] = useState(initial.allergyOther);
  const [referralChoice, setReferralChoice] = useState<string>(() => {
    const v = initial.referralSource;
    if (!v) return "";
    return (REFERRAL_SOURCE_VALUES as readonly string[]).includes(v)
      ? v
      : "other";
  });
  const [referralOther, setReferralOther] = useState<string>(() => {
    const v = initial.referralSource;
    if (!v) return "";
    return (REFERRAL_SOURCE_VALUES as readonly string[]).includes(v) ? "" : v;
  });

  const todayIso = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  function toggleFood(value: string) {
    setFoodsLoved((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function finishSetup(skip: boolean) {
    setFinishErr(null);
    startTransition(async () => {
      const referralValue =
        referralChoice === "other"
          ? referralOther.trim()
          : referralChoice.trim();
      const cooksParsed =
        cooksPerWeek === "" ? null : Number.parseInt(cooksPerWeek, 10);
      const cooksClean =
        cooksParsed === null
          ? null
          : Number.isFinite(cooksParsed)
            ? cooksParsed
            : null;

      const r = skip
        ? await completeOnboarding()
        : await completeOnboarding({
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            birthdate: birthdate.trim() || undefined,
            foodsLoved,
            foodsLovedOther: foodsLovedOther.trim() || undefined,
            cooksPerWeek: cooksClean,
            allergyOther:
              allergyOtherChecked && allergyOther.trim()
                ? allergyOther.trim()
                : undefined,
            referralSource: referralValue || undefined,
          });
      if (r.error) {
        setFinishErr(r.error);
        return;
      }
      router.push("/help-me-cook");
      router.refresh();
    });
  }

  const foodLabels: Record<string, string> = {
    italian: t("onboarding_food_italian"),
    mexican: t("onboarding_food_mexican"),
    asian: t("onboarding_food_asian"),
    mediterranean: t("onboarding_food_mediterranean"),
    indian: t("onboarding_food_indian"),
    american_comfort: t("onboarding_food_american_comfort"),
    bbq: t("onboarding_food_bbq"),
    seafood: t("onboarding_food_seafood"),
    vegetarian: t("onboarding_food_vegetarian"),
    vegan: t("onboarding_food_vegan"),
    desserts: t("onboarding_food_desserts"),
    salads: t("onboarding_food_salads"),
  };

  const referralLabels: Record<string, string> = {
    friend: t("onboarding_referral_friend"),
    search: t("onboarding_referral_search"),
    social: t("onboarding_referral_social"),
    app_store: t("onboarding_referral_app_store"),
    ad: t("onboarding_referral_ad"),
    blog: t("onboarding_referral_blog"),
    other: t("onboarding_referral_other"),
  };

  function goNext() {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }
  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-8">
      <div className="mb-6 flex gap-1" aria-label={t("onboarding_progress_aria")}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              s <= step ? "bg-[var(--primary)]" : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>

      {step === 1 ? (
        <section className="flex flex-1 flex-col gap-4">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_welcome_title")}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {t("onboarding_welcome_body")}
          </p>
          {finishErr ? (
            <p
              className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--danger)]"
              role="alert"
            >
              {finishErr}
            </p>
          ) : null}
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button
              type="button"
              onClick={goNext}
              className={primaryBtnClass}
            >
              {t("onboarding_welcome_next")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => finishSetup(true)}
              className={secondaryBtnClass}
            >
              {t("onboarding_skip_all")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="flex flex-1 flex-col gap-4">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_name_title")}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {t("onboarding_name_body")}
          </p>
          <label className={labelClass} htmlFor="onboarding-first-name">
            <span>{t("onboarding_first_name_label")}</span>
            <input
              id="onboarding-first-name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              maxLength={80}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass} htmlFor="onboarding-last-name">
            <span>{t("onboarding_last_name_label")}</span>
            <input
              id="onboarding-last-name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              maxLength={80}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button type="button" onClick={goNext} className={primaryBtnClass}>
              {t("onboarding_continue")}
            </button>
            <button type="button" onClick={goBack} className={ghostLinkBtnClass}>
              {t("onboarding_back")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="flex flex-1 flex-col gap-4">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_basics_title")}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {t("onboarding_basics_body")}
          </p>
          <label className={labelClass} htmlFor="onboarding-birthdate">
            <span>{t("onboarding_birthdate_label")}</span>
            <input
              id="onboarding-birthdate"
              name="birthdate"
              type="date"
              autoComplete="bday"
              max={todayIso}
              min="1900-01-01"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass} htmlFor="onboarding-cooks-per-week">
            <span>{t("onboarding_cooks_per_week_label")}</span>
            <select
              id="onboarding-cooks-per-week"
              name="cooks_per_week"
              value={cooksPerWeek}
              onChange={(e) => setCooksPerWeek(e.target.value)}
              className={inputClass}
            >
              <option value="">{t("onboarding_cooks_per_week_placeholder")}</option>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button type="button" onClick={goNext} className={primaryBtnClass}>
              {t("onboarding_continue")}
            </button>
            <button type="button" onClick={goBack} className={ghostLinkBtnClass}>
              {t("onboarding_back")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="flex flex-1 flex-col gap-4">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_foods_title")}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {t("onboarding_foods_body")}
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
            {FOOD_CATEGORY_VALUES.map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm text-[var(--text)]"
              >
                <input
                  type="checkbox"
                  name="foods_loved"
                  value={key}
                  checked={foodsLoved.includes(key)}
                  onChange={() => toggleFood(key)}
                />
                <span>{foodLabels[key]}</span>
              </label>
            ))}
          </div>
          <label className={labelClass} htmlFor="onboarding-foods-other">
            <span>{t("onboarding_foods_other_label")}</span>
            <textarea
              id="onboarding-foods-other"
              name="foods_loved_other"
              rows={2}
              maxLength={500}
              value={foodsLovedOther}
              onChange={(e) => setFoodsLovedOther(e.target.value)}
              placeholder={t("onboarding_foods_other_placeholder")}
              className="min-h-[64px] w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-[border-color] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]"
            />
          </label>
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button type="button" onClick={goNext} className={primaryBtnClass}>
              {t("onboarding_continue")}
            </button>
            <button type="button" onClick={goBack} className={ghostLinkBtnClass}>
              {t("onboarding_back")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="flex flex-1 flex-col gap-3">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_allergies_title")}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {t("onboarding_allergies_body")}
          </p>
          <ProfileAllergiesForm
            allergens={allergens}
            selectedIds={selectedIds}
            defaultAllergyMode={defaultAllergyMode}
            submitLabel={t("onboarding_allergies_save")}
            submitPendingLabel={t("onboarding_allergies_saving")}
            onSaved={goNext}
          />
          <fieldset className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
            <legend className="px-1 text-sm font-medium text-[var(--text)]">
              {t("onboarding_allergy_other_legend")}
            </legend>
            <label className="mt-1 flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={allergyOtherChecked}
                onChange={(e) => setAllergyOtherChecked(e.target.checked)}
              />
              <span>{t("onboarding_allergy_other_checkbox")}</span>
            </label>
            {allergyOtherChecked ? (
              <textarea
                rows={2}
                maxLength={500}
                value={allergyOther}
                onChange={(e) => setAllergyOther(e.target.value)}
                placeholder={t("onboarding_allergy_other_placeholder")}
                className="mt-2 min-h-[64px] w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-[border-color] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]"
              />
            ) : null}
          </fieldset>
          <div className="flex flex-col gap-3 pt-2">
            <button type="button" onClick={goNext} className={secondaryBtnClass}>
              {t("onboarding_skip_step")}
            </button>
            <button type="button" onClick={goBack} className={ghostLinkBtnClass}>
              {t("onboarding_back")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 6 ? (
        <section className="flex flex-1 flex-col gap-4">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_referral_title")}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {t("onboarding_referral_body")}
          </p>
          <label className={labelClass} htmlFor="onboarding-referral">
            <span>{t("onboarding_referral_select_label")}</span>
            <select
              id="onboarding-referral"
              name="referral_source"
              value={referralChoice}
              onChange={(e) => setReferralChoice(e.target.value)}
              className={inputClass}
            >
              <option value="">
                {t("onboarding_referral_placeholder")}
              </option>
              {REFERRAL_SOURCE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {referralLabels[v]}
                </option>
              ))}
            </select>
          </label>
          {referralChoice === "other" ? (
            <label className={labelClass} htmlFor="onboarding-referral-other">
              <span>{t("onboarding_referral_other_label")}</span>
              <input
                id="onboarding-referral-other"
                type="text"
                maxLength={200}
                value={referralOther}
                onChange={(e) => setReferralOther(e.target.value)}
                placeholder={t("onboarding_referral_other_placeholder")}
                className={inputClass}
              />
            </label>
          ) : null}
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button type="button" onClick={goNext} className={primaryBtnClass}>
              {t("onboarding_continue")}
            </button>
            <button type="button" onClick={goBack} className={ghostLinkBtnClass}>
              {t("onboarding_back")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 7 ? (
        <section className="flex flex-1 flex-col gap-4">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_thanks_title", {
              firstName: firstName.trim() || t("onboarding_thanks_default_name"),
            })}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {t("onboarding_thanks_body")}
          </p>
          <ul className="space-y-1.5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--text)] shadow-[var(--shadow-card)]">
            {firstName.trim() || lastName.trim() ? (
              <li>
                <span className="text-[var(--muted)]">
                  {t("onboarding_summary_name")}:
                </span>{" "}
                {[firstName.trim(), lastName.trim()].filter(Boolean).join(" ")}
              </li>
            ) : null}
            {birthdate ? (
              <li>
                <span className="text-[var(--muted)]">
                  {t("onboarding_summary_birthdate")}:
                </span>{" "}
                {birthdate}
              </li>
            ) : null}
            {cooksPerWeek !== "" ? (
              <li>
                <span className="text-[var(--muted)]">
                  {t("onboarding_summary_cooks")}:
                </span>{" "}
                {cooksPerWeek}
              </li>
            ) : null}
            {foodsLoved.length > 0 ? (
              <li>
                <span className="text-[var(--muted)]">
                  {t("onboarding_summary_foods")}:
                </span>{" "}
                {foodsLoved.map((f) => foodLabels[f] ?? f).join(", ")}
              </li>
            ) : null}
            {foodsLovedOther.trim() ? (
              <li>
                <span className="text-[var(--muted)]">
                  {t("onboarding_summary_foods_other")}:
                </span>{" "}
                {foodsLovedOther.trim()}
              </li>
            ) : null}
            {allergyOtherChecked && allergyOther.trim() ? (
              <li>
                <span className="text-[var(--muted)]">
                  {t("onboarding_summary_allergy_other")}:
                </span>{" "}
                {allergyOther.trim()}
              </li>
            ) : null}
            {referralChoice ? (
              <li>
                <span className="text-[var(--muted)]">
                  {t("onboarding_summary_referral")}:
                </span>{" "}
                {referralChoice === "other"
                  ? referralOther.trim() || referralLabels.other
                  : referralLabels[referralChoice]}
              </li>
            ) : null}
          </ul>
          {finishErr ? (
            <p
              className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--danger)]"
              role="alert"
            >
              {finishErr}
            </p>
          ) : null}
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button
              type="button"
              disabled={pending}
              onClick={() => finishSetup(false)}
              className={primaryBtnClass}
            >
              {pending ? "…" : t("onboarding_thanks_cta")}
            </button>
            <button type="button" onClick={goBack} className={ghostLinkBtnClass}>
              {t("onboarding_back")}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
