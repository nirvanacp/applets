import { mount } from "@genesis/sdk/react";
import { App } from "./app";
import { OVERLAY_SCREENS, ROUTES } from "./routes";
import "./theme.css";

void mount(<App />, { router: { routes: ROUTES, screens: OVERLAY_SCREENS } });
