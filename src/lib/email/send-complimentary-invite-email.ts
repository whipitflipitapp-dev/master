import "server-only";

import { resolveSiteUrl } from "@/lib/stripe";
import type { PlanType } from "@/lib/plan";
import { logServerError } from "@/lib/server-error";

const BRAND = "Whip It Flip It";
const PRIMARY = "#ea580c";

function planLabel(planType: PlanType): string {
  if (planType === "ai_chef") {
    return `${BRAND} AI Chef`;
  }
  if (planType === "pro") {
    return `${BRAND} Pro`;
  }
  return BRAND;
}

function buildInviteHtml(input: {
  planType: PlanType;
  signupUrl: string;
  loginUrl: string;
  forExistingAccount: boolean;
}): string {
  const tier = planLabel(input.planType);
  const ctaUrl = input.forExistingAccount ? input.loginUrl : input.signupUrl;
  const ctaLabel = input.forExistingAccount ? "Sign in to Whip It Flip It" : "Create your free account";
  const lead = input.forExistingAccount
    ? `Good news — your email is on our complimentary access list and <strong>${tier}</strong> is now active on your account.`
    : `Your email has been added to the <strong>free for life ${tier}</strong> access list.`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
        <tr><td style="background:${PRIMARY};padding:20px 24px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${BRAND}</p>
        </td></tr>
        <tr><td style="padding:24px;">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1c1917;">You're invited — complimentary Pro access</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#57534e;">${lead}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#57534e;">
            ${
              input.forExistingAccount
                ? "Sign in anytime to browse recipes, save favorites, and use your Pro tools."
                : "Create your account with this email (magic link or Google). Your complimentary plan applies automatically — no payment required."
            }
          </p>
          <p style="margin:0 0 24px;text-align:center;">
            <a href="${ctaUrl}" style="display:inline-block;background:${PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 22px;border-radius:12px;">${ctaLabel}</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#78716c;">If the button doesn't work, copy this link:<br><a href="${ctaUrl}" style="color:${PRIMARY};word-break:break-all;">${ctaUrl}</a></p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#a8a29e;">© ${new Date().getFullYear()} ${BRAND}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export type SendComplimentaryInviteResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "send_failed"; detail?: string };

/** Notify a chef/partner that their email is on the complimentary access list. */
export async function sendComplimentaryInviteEmail(input: {
  email: string;
  planType: PlanType;
  forExistingAccount: boolean;
}): Promise<SendComplimentaryInviteResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }

  const siteUrl = resolveSiteUrl();
  const signupUrl = `${siteUrl}/signup`;
  const loginUrl = `${siteUrl}/login`;
  const tier = planLabel(input.planType);
  const subject = input.forExistingAccount
    ? `Your complimentary ${tier} access is active`
    : `You're on the free for life ${tier} access list`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        subject,
        html: buildInviteHtml({
          planType: input.planType,
          signupUrl,
          loginUrl,
          forExistingAccount: input.forExistingAccount,
        }),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logServerError("email.complimentary_invite", {
        status: res.status,
        detail: detail.slice(0, 500),
      });
      return { sent: false, reason: "send_failed", detail };
    }

    return { sent: true };
  } catch (err) {
    logServerError("email.complimentary_invite", err);
    return { sent: false, reason: "send_failed" };
  }
}
