import { useEffect } from "react";
import { useRouter, type CurrentScreen } from "@let/sdk/react";
import { profileUrl, type AccountData } from "../model";
import { SignInNotice } from "../components/states";
import { TopBar } from "../ui/frame";
import { ProfileSkeleton } from "../ui/skeletons";
import { LoadError } from "../ui/states";
import { delivered, onScreen, useScreenWatch } from "../screen";

/**
 * The Profile tab's start page, X's account settings. It reads the signed-in handle and replaces
 * itself with that profile, so the tab opens on the person's own profile.
 */
export function AccountScreen(_: { screen: CurrentScreen }) {
  const { navigate, status } = useRouter();
  const page = status();
  const watch = useScreenWatch<AccountData | null>("account", "handle");
  const current = !page.stale && onScreen(page, "account") && page.status === "ready";
  const handle = current ? watch.value?.handle ?? null : null;
  // Ready, read, and still no handle: the settings page did not show the account.
  const unread = current && delivered(watch) && !handle;

  useEffect(() => {
    if (handle) navigate({ url: profileUrl(handle), context: "account", mode: "replace" });
  }, [handle, navigate]);

  if (page.status === "auth") return <>
    <TopBar title="Profile" />
    <SignInNotice reason="Sign in to see your profile and keep Saved categories." />
  </>;
  if (page.status === "error" || unread) return <>
    <TopBar title="Profile" />
    <LoadError error={page.error} site="X" />
  </>;
  return <ProfileSkeleton label="Loading your profile" />;
}
