"use client";

import type { ComponentPropsWithoutRef } from "react";

import { logAffiliateClick } from "@/app/actions/telemetry";
import type { AffiliateLinkType } from "@/lib/telemetry";

type Props = Omit<ComponentPropsWithoutRef<"a">, "href" | "target" | "rel"> & {
  href: string;
  recipeId: string | null;
  linkType: AffiliateLinkType;
};

export function AffiliateOutboundLink({
  href,
  recipeId,
  linkType,
  children,
  onClick,
  ...rest
}: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      {...rest}
      onClick={(event) => {
        void logAffiliateClick(recipeId, linkType);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
