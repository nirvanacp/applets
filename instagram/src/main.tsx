import { mount } from "@genesis/sdk/react";
import { App } from "./app";
import { ORIGIN } from "./model";
import { ROUTES, signInUrl } from "./routes";
import "./theme.css";

/** Instagram's story and reels viewers add a history entry for each item, so Back from them may never leave. */
const VIEWER = /^\/(stories|reels)\//;
const inViewer = (url: string) => url !== "" && VIEWER.test(new URL(url).pathname);
/** How long Done's own step back gets before the applet checks where it landed. */
const SETTLE_MS = 1500;

void mount(<App />, {
  router: { routes: ROUTES, account: { signedIn: { reader: "account" }, signInUrl } },
}).then(({ router }) => {
  // Done on a story or reels page steps the website back. When that step lands in the viewer
  // again (the entry before a reel is /reels/, which opens a reel), go Home instead. Navigating
  // at once would race the step back, so the check waits for it.
  router?.onDone(id => {
    if (id !== "primary" || !inViewer(router.status(id).url)) return;
    setTimeout(() => {
      if (inViewer(router.status(id).url)) router.navigate({ url: `${ORIGIN}/`, context: id, mode: "replace" });
    }, SETTLE_MS);
  });
});
