import posthog from "posthog-js";

const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST;

if (!key || !host) {
  if (import.meta.env.DEV) {
    const variable = !key ? "VITE_POSTHOG_KEY" : "VITE_POSTHOG_HOST";
    console.error(new Error(`${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`));
  }
} else {
  posthog.init(key, {
    api_host: host,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    logs: {
      serviceName: "instagram-applet",
      environment: import.meta.env.DEV ? "development" : "production",
      serviceVersion: "0.1.2",
    },
  });
}

const posthogLog = {
  appMounted: () => posthog.logger.info("applet mounted", { event: "applet_mounted" }),
  appResumed: () => posthog.logger.info("applet resumed", { event: "applet_resumed" }),
  navigationFailed: () => posthog.logger.warn("applet navigation failed", { event: "applet_navigation_failed" }),
};

export { posthog, posthogLog };
