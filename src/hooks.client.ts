import type { HandleClientError } from "@sveltejs/kit";

export const handleError: HandleClientError = ({ error, event, status, message }) => {
  const err = error as Error;
  console.error("[ocv:hooks] Unhandled client error:", {
    message: err?.message,
    stack: err?.stack,
    status,
    route: event?.route?.id,
    url: event?.url?.pathname,
  });

  return {
    message: err?.message ?? message ?? "Unknown error",
  };
};
