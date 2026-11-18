import { mount } from "@let/sdk/react";
import { App } from "./app";
import { OVERLAY_SCREENS, ROUTES, signInUrl } from "./routes";
import "./theme.css";

// X's video host refuses requests that carry the applet's address as the referrer.
const referrer = document.createElement("meta");
referrer.name = "referrer";
referrer.content = "no-referrer";
document.head.prepend(referrer);

void mount(<App />, {
  router: { routes: ROUTES, screens: OVERLAY_SCREENS, account: { signedIn: { reader: "account" }, signInUrl } },
});
