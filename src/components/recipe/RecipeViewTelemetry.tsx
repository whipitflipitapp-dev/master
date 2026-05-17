"use client";

import { useEffect, useRef } from "react";

import { recordRecipeView } from "@/app/actions/telemetry";

export function RecipeViewTelemetry({ recipeId }: { recipeId: string }) {
  const recordedRef = useRef(false);

  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;

    void recordRecipeView(recipeId);
  }, [recipeId]);

  return null;
}
