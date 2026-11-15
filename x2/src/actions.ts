import { GenesisError } from "@genesis/sdk";

/** The message for a failed user action: a tap that came too late asks for another tap. */
export function actionMessage(error: unknown, fallback: string): string {
  if (error instanceof GenesisError && error.code === "USER_ACTION_REQUIRED") return "Tap again to continue.";
  return fallback;
}
