import { useEffect } from "react";
import { ScrollMemory, useRouter } from "@genesis/sdk/react";
import { profileUrl, type AccountData } from "../model";
import { LoadError, SignInPrompt, Skeleton } from "../components/ui";
import { onScreen, usePageStatus, useScreenWatch } from "../screen";

/** The Profile tab's start page, X's account settings: it waits for the handle, then becomes the profile. */
export function AccountScreen() {
  const { navigate } = useRouter();
  const page = usePageStatus();
  const record = useScreenWatch<AccountData | null>("account", "handle").value;
  const handle = page.stale || !onScreen(page, "account") || page.status !== "ready" ? null : record?.handle ?? null;

  useEffect(() => {
    if (handle) navigate({ url: profileUrl(handle), context: "account", mode: "replace" });
  }, [handle, navigate]);

  let body;
  if (page.status === "auth") body = <SignInPrompt reason="Sign in to see your profile and use Saved categories." />;
  else if (page.status === "error") body = <LoadError error={page.error} />;
  else body = <Skeleton label="Loading your profile" rows={3} kind="text" />;

  return <ScrollMemory className="screen">
    <h1 className="screen-title">Profile</h1>
    {body}
  </ScrollMemory>;
}
