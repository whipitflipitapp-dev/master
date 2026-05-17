export const GENERIC_SERVER_ERROR =
  "Something went wrong. Please try again.";

export const GENERIC_LOAD_ERROR =
  "We could not load this information right now.";

export function logServerError(scope: string, error: unknown) {
  console.error(`[${scope}]`, error);
}
