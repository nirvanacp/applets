import { mount } from "@genesis/sdk/react";
import { App } from "./app";
import { ORIGIN } from "./model";
import { ROUTES, signInUrl } from "./routes";
import "./theme.css";

/** Instagram's story and reels viewers add a history entry for each item, so Back from them may never leave. */
const VIEWER = /^\/(stories|reels)\//;

void mount(<App />, {
  router: { routes: ROUTES, account: { signedIn: { reader: "account" }, signInUrl } },
}).then(({ router }) => {
  // Done on a story or reels page returns to Home instead of stepping back through the viewer.
  router?.onDone(id => {
    if (id !== "primary") return;
    const url = router.status(id).url;
    if (url && VIEWER.test(new URL(url).pathname)) router.navigate({ url: `${ORIGIN}/`, context: id, mode: "replace" });
  });
});
