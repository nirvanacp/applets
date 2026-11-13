import { mount } from "@genesis/sdk/react";
import { App } from "./app";
import { ROUTES, signInUrl } from "./routes";
import "./theme.css";

void mount(<App />, {
  router: { routes: ROUTES, account: { signedIn: { reader: "account" }, signInUrl } },
});
