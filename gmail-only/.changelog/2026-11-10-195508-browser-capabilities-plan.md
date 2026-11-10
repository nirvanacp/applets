# Plan for Genesis's browser capabilities

- Goal: Bring Gmail Only up to date with Genesis's new website capabilities (downloads, popups, prompts, links to other apps, dark mode and font size on website pages, shared links, a separate sign-in for each applet), replacing the workaround built for the old limits.
- Changes: The current spec gains a two-step plan. Step 1 gives attachments the WebView cannot show a "Download in Gmail" card that reveals the email on Gmail's page. Step 2 is the phone verification. The interaction table gains the attachment card row. No code changed.
- Decisions: decision-0014. Downloads start from Gmail's revealed page, never from a navigation while the applet screen shows, because Genesis ignores downloads from a hidden page.
- Verification: None yet; the plan is recorded and not implemented. The phone checks are listed in the current spec.
