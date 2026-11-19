import { useRouter } from "@nirvanacp/sdk/react";
import { ORIGIN } from "../model";
import { Segments } from "../ui/frame";

/** Bookmarks and Likes are X pages in the primary context; Categories is the applet's own screen. */
export function SavedSegments({ active }: { active: "bookmarks" | "likes" | "categories" }) {
  const { navigate } = useRouter();
  const mode = active === "categories" ? "push" : "replace";
  return <Segments label="Saved" active={active} options={[
    { id: "bookmarks", label: "Bookmarks", go: () => navigate({ url: `${ORIGIN}/i/history`, context: "primary", mode }) },
    { id: "likes", label: "Likes", go: () => navigate({ url: `${ORIGIN}/i/history/likes`, context: "primary", mode }) },
    { id: "categories", label: "Categories", go: () => navigate({ screen: "categories", mode: "root" }) },
  ]} />;
}
