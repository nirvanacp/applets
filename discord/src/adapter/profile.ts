import { value, type CommandSteps, type Locator, type Step } from "@let/sdk/page";
import type { Me, Presence, ProfileForm, ServerForm } from "../model";
import { clean, HAMBURGER, imageIn, RAIL, textOf } from "./read";

/**
 * The account and server editors. Discord keeps them in dialogs: the profile editor ("Your full
 * profile"), the per-server profile, Server Settings and User Settings. The applet opens one, reads
 * its fields, fills them, presses Discord's own Save and closes it again. Nothing is saved any
 * other way.
 */

/** The user area at the foot of the drawer: avatar, names, status and User Settings. */
export const USER_AREA = 'section[aria-label="User status and settings"]';
/** The labelled button is an empty box at phone width; the wrapper around it takes the tap. */
const MANAGE = `${USER_AREA} :has(> [aria-label="Manage profile and status"])`;
const USER_SETTINGS = `${USER_AREA} button[aria-label="User Settings"]`;

const LAYERS = "[role=dialog], [role=menu]";
/**
 * The newest layer's own close button. Settings ignore a synthetic Escape, which has no key code.
 * Server Settings draws its close buttons as `div[role=button]`.
 */
const CLOSE = ":is(button, [role=button])[aria-label=Close]";
const CLOSE_TOP: Locator = { css: `:is([role=dialog], [role=menu]) ${CLOSE}`, nth: -1 };
/** The profile editor; the pronouns field tells it from the per-server one. */
const EDITOR = '[role=dialog]:has(input[placeholder="Add pronouns"])';
const NAME = `${EDITOR} input[maxlength="32"]:not([placeholder="Add pronouns"])`;
const PRONOUNS = `${EDITOR} input[placeholder="Add pronouns"]`;
/** The labelled button is an empty box; the wrapper around it takes the tap. */
const BIO_BUTTON = `${EDITOR} :has(> [aria-label="Edit bio"])`;
const BIO = `${EDITOR} [role=textbox][data-slate-editor]`;
const AVATAR_BUTTON = `${EDITOR} [aria-label="Edit avatar and decoration"]`;
/** Discord's "Select an Image" dialog, which opens over the editor. */
const IMAGE_INPUT = `[role=dialog]:not(${EDITOR}) input[type=file]`;

const SERVER_EDITOR = '[role=dialog]:has(input[placeholder="Set a per-server nickname"])';
const NICKNAME = `${SERVER_EDITOR} input[placeholder="Set a per-server nickname"]`;
const SERVER_ACTIONS = '[aria-label$=", server actions"]';
const SERVER_SETTINGS = '[role=dialog]:has(input[type=file][aria-label="Change Server Icon"])';
const SERVER_NAME = `${SERVER_SETTINGS} input[type=text]`;
const SERVER_ICON = `${SERVER_SETTINGS} input[type=file][aria-label="Change Server Icon"]`;

/** The bar that holds Reset and Save while an editor has unsaved changes. Empty otherwise. */
const SAVE_BAR = "[class*=pendingChangesToolbar], [class*=noticeRegion]";
const SAVE: Locator = { css: `:is(${SAVE_BAR}) button`, text: "Save" };
const RESET: Locator = { css: `:is(${SAVE_BAR}) button`, text: "Reset", exact: true };

const MAX_NAME = 32;
const MAX_PRONOUNS = 40;
const MAX_BIO = 190;
const MAX_SERVER_NAME = 100;

/** Discord's presence names, by the id in its status menu. */
export const PRESENCE: Record<Presence, string> = {
  online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible",
};

const fieldValue = (doc: Document, css: string) => (doc.querySelector(css) as HTMLInputElement | null)?.value ?? "";

/** True while an editor has changes Discord has not saved. */
export const pending = (doc: Document) => [...doc.querySelectorAll(SAVE_BAR)].some(bar => /save/i.test(bar.textContent ?? ""));

/**
 * The presence from the dot on the avatar: Discord draws it green, yellow, red or grey. The text
 * under the name says the same, unless a custom status replaces it.
 */
function presenceOf(area: Element): Presence | null {
  const said = textOf(area.querySelector("[class*=animatedText]"), 40).toLowerCase();
  for (const [id, name] of Object.entries(PRESENCE) as [Presence, string][]) if (said === name.toLowerCase()) return id;
  const dot = [...area.querySelectorAll("rect[mask][fill]")].map(rect => rect.getAttribute("fill") ?? "").find(fill => /^#[0-9a-f]{6}$/i.test(fill));
  if (!dot) return null;
  const [r, g, b] = [1, 3, 5].map(at => parseInt(dot.slice(at, at + 2), 16)) as [number, number, number];
  if (Math.max(r, g, b) - Math.min(r, g, b) < 24) return "invisible";
  if (g > r && g > b) return "online";
  if (r > b && g > b * 1.4) return "idle";
  return r > g ? "dnd" : null;
}

/** The signed-in account, from the user area. It is drawn only while the drawer is open. */
export const me = value((doc): Me | null => {
  const area = doc.querySelector(USER_AREA);
  if (!area) return null;
  const name = textOf(area.querySelector("[class*=panelTitleContainer]"), 80);
  if (!name) return null;
  const custom = textOf(area.querySelector("[class*=hoverRoll] [class*=default]"), 140);
  const presence = presenceOf(area);
  return {
    name,
    username: textOf(area.querySelector("[class*=hoverRoll] [class*=hovered]"), 80) || null,
    avatar: imageIn(area.querySelector("[class*=avatar]")),
    presence,
    custom: custom && (presence === null || custom !== PRESENCE[presence]) ? custom : null,
  };
});

/** The open profile editor's fields, or null while it is closed. */
export const profile = value((doc): ProfileForm | null => {
  const editor = doc.querySelector(EDITOR);
  if (!editor) return null;
  const bio = doc.querySelector(BIO) ?? doc.querySelector(BIO_BUTTON);
  // An empty bio's preview shows a placeholder line, which is not the bio.
  const shown = bio?.matches(BIO) ? bio : [...bio?.children ?? []].filter(child => !/placeholder/.test(String(child.className)));
  return {
    displayName: fieldValue(doc, NAME),
    username: (doc.querySelector(NAME) as HTMLInputElement | null)?.placeholder ?? "",
    pronouns: fieldValue(doc, PRONOUNS),
    bio: clean(Array.isArray(shown) ? shown.map(child => (child as HTMLElement).innerText).join("\n") : (shown as HTMLElement | undefined)?.innerText, MAX_BIO * 2),
    avatar: imageIn(doc.querySelector(AVATAR_BUTTON)?.closest("[class*=avatar]") ?? doc.querySelector(AVATAR_BUTTON)),
    pending: pending(doc),
  };
});

/** The open per-server profile's fields, or null while it is closed. */
export const serverProfile = value((doc): { nickname: string; pending: boolean } | null =>
  doc.querySelector(SERVER_EDITOR) ? { nickname: fieldValue(doc, NICKNAME), pending: pending(doc) } : null);

/** The open Server Settings' name and icon, or null while it is closed. */
export const serverSettings = value((doc): ServerForm | null => {
  const dialog = doc.querySelector(SERVER_SETTINGS);
  if (!dialog) return null;
  const icon = [...dialog.querySelectorAll("img")].find(img => /\/icons\//.test(img.getAttribute("src") ?? ""));
  return { name: fieldValue(doc, SERVER_NAME), icon: imageIn(icon), pending: pending(doc) };
});

/**
 * Closes whatever Discord has open over the app: menus, popouts and dialogs, dropping unsaved
 * changes first, since Discord will not close an editor that has them.
 */
function dismissSteps(doc: Document): Step[] {
  const steps: Step[] = [];
  if (pending(doc)) steps.push({ op: "click", target: RESET, force: true, timeoutMs: 3000 }, { op: "wait", for: { read: { reader: "profile.saved" } }, timeoutMs: 5000 });
  const layers = [...doc.querySelectorAll(LAYERS)];
  let open = layers.length;
  if (layers.at(-1)?.querySelector(CLOSE)) {
    steps.push({ op: "click", target: CLOSE_TOP, force: true, timeoutMs: 3000 });
    open--;
  }
  for (let index = 0; index < Math.min(open, 4); index++) steps.push({ op: "press", key: "Escape" });
  return steps;
}

/** Closes Discord's menus and dialogs. */
export function dismiss(doc: Document): CommandSteps | { satisfied: true } {
  if (!doc.querySelector(LAYERS) && !pending(doc)) return { satisfied: true };
  return { steps: dismissSteps(doc), until: d => !d.querySelector(LAYERS), deadlineMs: 8000 };
}

/** The user area exists only in the open drawer. */
function userAreaSteps(doc: Document): Step[] {
  if (doc.querySelector(USER_AREA)) return [];
  if (!doc.querySelector(RAIL) && !doc.querySelector(HAMBURGER)) throw new Error("Discord shows no menu here. Go back to your messages and try again.");
  return [
    ...(doc.querySelector(RAIL) ? [] : [{ op: "click", target: { css: HAMBURGER }, timeoutMs: 5000 } as Step]),
    { op: "wait", for: { target: { css: USER_AREA }, state: "attached" }, timeoutMs: 5000 },
  ];
}

/** Opens Discord's profile popout and taps one of its rows, such as "Edit Profile". */
function popoutRow(text: string): Step[] {
  return [
    { op: "click", target: { css: MANAGE }, timeoutMs: 5000 },
    { op: "click", target: { css: "[role=dialog] [role=button]", text }, timeoutMs: 5000 },
  ];
}

/** Opens the profile editor. */
export function openProfile(doc: Document): CommandSteps | { satisfied: true } {
  if (doc.querySelector(EDITOR) && !doc.querySelector(`:is(${LAYERS}):not(${EDITOR})`)) return { satisfied: true };
  return {
    steps: [...dismissSteps(doc), ...userAreaSteps(doc), ...popoutRow("Edit Profile")],
    until: d => d.querySelector(EDITOR) !== null && d.querySelector(NAME) !== null,
    deadlineMs: 15000,
  };
}

const text = (input: unknown, field: string, max: number): string | undefined => {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== "string") throw new Error(`${field} must be text`);
  const trimmed = input.trim();
  if ([...trimmed].length > max) throw new Error(`Discord takes up to ${max} characters for ${field}`);
  return trimmed;
};

const fileId = (input: unknown): string | undefined => {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== "string" || !/^[0-9a-f]{32}$/.test(input)) throw new Error("avatar is a picked file id");
  return input;
};

/**
 * Focuses a field, fills it and leaves it. The profile editor shows its fields as text and takes
 * a change only while the field is being edited, which starts with focus.
 */
const fillSteps = (css: string, value: string): Step[] => [
  { op: "focus", target: { css }, timeoutMs: 5000 },
  { op: "fill", target: { css }, value },
  { op: "blur", target: { css } },
];

/**
 * True once Discord's crop dialog has drawn the picked image. Its Apply button is enabled before
 * that, and an Apply pressed while the crop canvas is still empty changes nothing. The avatar
 * dialog draws on a canvas; the server icon dialog shows the image as an `img`, and an Apply pressed
 * there while the dialog still plays its opening animation saves an empty image.
 */
export const cropReady = (doc: Document) => [...doc.querySelectorAll("[role=dialog]")]
  .some(dialog => [...dialog.querySelectorAll("button")].some(button => button.textContent === "Apply")
    && drawn(dialog) && settled(dialog));

/** True when no box around or inside the dialog is still fading or scaling in. */
const settled = (dialog: Element) => {
  const boxes: HTMLElement[] = [...dialog.querySelectorAll<HTMLElement>("[style]")];
  for (let box: HTMLElement | null = dialog as HTMLElement; box; box = box.parentElement) boxes.push(box);
  return boxes.every(box => {
    const { opacity, transform } = box.style;
    return (opacity === "" || Number(opacity) >= 1) && (!transform.includes("scale(") || transform === "scale(1)");
  });
};

const drawn = (dialog: Element) => {
  const canvases = [...dialog.querySelectorAll("canvas")];
  if (canvases.length > 0) return canvases.some(canvas => canvas.width > 0);
  return [...dialog.querySelectorAll("img")].some(image => image.complete && image.naturalWidth > 0);
};

/** Hands a picked image to Discord's crop dialog and applies it once the dialog is ready. */
const imageSteps = (input: string, id: string): Step[] => [
  { op: "attachFiles", target: { css: input }, files: [id], via: "input", timeoutMs: 5000 },
  { op: "wait", for: { read: { reader: "profile.cropReady" } }, timeoutMs: 15000 },
  { op: "click", target: { css: "[role=dialog] button", text: "Apply", exact: true }, timeoutMs: 15000 },
  { op: "wait", for: { target: { css: "[role=dialog] button", text: "Apply", exact: true }, state: "detached" }, timeoutMs: 10000 },
];

/** Presses Discord's Save, whose bar may sit past the edge of a phone-width page. */
const saveSteps: Step[] = [
  { op: "wait", for: { read: { reader: "profile.pending" } }, timeoutMs: 8000 },
  { op: "click", target: SAVE, force: true, timeoutMs: 5000 },
];

/**
 * Saves the profile editor's fields. Only the fields given, and different from what Discord shows,
 * change. An avatar is a picked file: Discord's crop dialog opens with it and the applet applies
 * it as it is. The avatar step runs first, while the Save tap that called the command still
 * counts as the user's.
 */
export function saveProfile(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const input = (args ?? {}) as Record<string, unknown>;
  const displayName = text(input.displayName, "a display name", MAX_NAME);
  const pronouns = text(input.pronouns, "pronouns", MAX_PRONOUNS);
  const bio = text(input.bio, "a bio", MAX_BIO);
  const avatar = fileId(input.avatar);
  if (!doc.querySelector(EDITOR)) throw new Error("Discord's profile editor is closed. Open Edit profile again.");
  if (doc.querySelector(`:is(${LAYERS}):not(${EDITOR})`)) throw new Error("Discord has another window open over your profile. Open Edit profile again.");

  const before = profile.read(doc)!;
  const steps: Step[] = [];
  if (avatar) {
    steps.push(
      { op: "click", target: { css: AVATAR_BUTTON }, timeoutMs: 5000 },
      { op: "click", target: { css: "#avatar-edit-context-change-avatar" }, timeoutMs: 5000 },
      ...imageSteps(IMAGE_INPUT, avatar),
    );
  }
  if (displayName !== undefined && displayName !== before.displayName) steps.push(...fillSteps(NAME, displayName));
  if (pronouns !== undefined && pronouns !== before.pronouns) steps.push(...fillSteps(PRONOUNS, pronouns));
  if (bio !== undefined && bio !== before.bio) {
    // The bio is a rich text editor that opens from its preview. Trusted typing breaks it at phone
    // width: Android's keyboard path takes its placeholder in as text. Editing commands work.
    if (!doc.querySelector(BIO)) steps.push({ op: "click", target: { css: BIO_BUTTON }, timeoutMs: 5000 });
    steps.push({ op: "click", target: { css: BIO }, input: "trusted", timeoutMs: 5000 });
    // Trusted input refuses Control with a letter, so the old bio is selected with the navigation keys.
    if (before.bio) {
      steps.push(
        { op: "press", key: "End", modifiers: ["Control"], target: { css: BIO }, input: "trusted" },
        { op: "press", key: "Home", modifiers: ["Control", "Shift"], target: { css: BIO }, input: "trusted" },
        { op: "press", key: "Backspace", target: { css: BIO }, input: "trusted" },
      );
    }
    bio.split("\n").forEach((line, index) => {
      if (index > 0) steps.push({ op: "press", key: "Enter", modifiers: ["Shift"], target: { css: BIO }, input: "trusted" });
      if (line) steps.push({ op: "type", target: { css: BIO }, text: line, timeoutMs: 5000 });
    });
    // The editor takes the text into its own model a moment later, then draws it as a string leaf.
    const last = bio.split("\n").filter(Boolean).at(-1);
    if (last) steps.push({ op: "wait", for: { target: { css: `${BIO} [data-slate-string]`, text: last.trim() }, state: "attached" }, timeoutMs: 5000 });
    // Discord keeps the bio only when focus moves to another field; a plain blur drops it.
    steps.push({ op: "focus", target: { css: PRONOUNS } }, { op: "blur", target: { css: PRONOUNS } });
  }
  if (steps.length === 0) return { satisfied: true };
  steps.push(...saveSteps);

  const oldAvatar = before.avatar;
  return {
    steps,
    until: d => {
      if (pending(d) || !d.querySelector(EDITOR)) return false;
      const now = profile.read(d)!;
      if (displayName !== undefined && now.displayName !== displayName) return false;
      if (pronouns !== undefined && now.pronouns !== pronouns) return false;
      if (bio !== undefined && now.bio !== clean(bio, MAX_BIO * 2)) return false;
      return !avatar || now.avatar !== oldAvatar;
    },
    deadlineMs: avatar ? 60000 : 30000,
  };
}

/** Sets the presence from Discord's status menu, then closes the popout. */
export function setStatus(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const status = (args as { status?: unknown } | null)?.status;
  if (typeof status !== "string" || !(status in PRESENCE)) throw new Error("status is online, idle, dnd or invisible");
  const area = doc.querySelector(USER_AREA);
  if (area && presenceOf(area) === status && !doc.querySelector(LAYERS)) return { satisfied: true };
  return {
    steps: [
      ...dismissSteps(doc), ...userAreaSteps(doc), ...popoutRow("Your Status"),
      { op: "click", target: { css: `#set-status-submenu-mobile-web-${status}` }, timeoutMs: 5000 },
      { op: "press", key: "Escape" },
      { op: "wait", for: { target: { css: "[role=menu]" }, state: "detached" }, timeoutMs: 3000 },
      { op: "press", key: "Escape" },
    ],
    until: d => {
      const now = d.querySelector(USER_AREA);
      return now !== null && presenceOf(now) === status && !d.querySelector(LAYERS);
    },
    deadlineMs: 15000,
  };
}

/** Opens User Settings, which the person then uses on the website. */
export function openSettings(doc: Document): CommandSteps {
  return {
    steps: [...dismissSteps(doc), ...userAreaSteps(doc), { op: "click", target: { css: USER_SETTINGS }, timeoutMs: 5000 }],
    until: d => d.querySelector('[role=dialog] nav[aria-label="Settings pages"]') !== null
      || [...d.querySelectorAll("[role=dialog]")].some(dialog => /Settings sidebar/.test(dialog.textContent ?? "")),
    deadlineMs: 15000,
  };
}

/** The server menu's items this applet uses, by the id Discord gives them. */
const SERVER_ITEMS = ["settings", "invite-people", "create-channel", "notifications", "privacy", "change-nickname"] as const;
type ServerItem = typeof SERVER_ITEMS[number];

/** The server menu is in the drawer's channel list header. */
function serverMenuSteps(doc: Document, item: ServerItem): Step[] {
  if (!/^\/channels\/\d+/.test(doc.location.pathname)) throw new Error("Open a server first");
  return [
    ...dismissSteps(doc),
    ...(doc.querySelector(RAIL) ? [] : [{ op: "click", target: { css: HAMBURGER }, timeoutMs: 5000 } as Step]),
    { op: "click", target: { css: SERVER_ACTIONS }, timeoutMs: 5000 },
    { op: "click", target: { css: `#guild-header-popout-${item}` }, timeoutMs: 3000 },
  ];
}

/**
 * Opens an item of the server menu, such as Invite People, for the person to use on the website.
 * Fails with a message when Discord does not offer it, such as Server Settings without the
 * permission.
 */
export function openServerItem(doc: Document, args: unknown): CommandSteps {
  const item = (args as { item?: unknown } | null)?.item;
  if (typeof item !== "string" || !(SERVER_ITEMS as readonly string[]).includes(item)) throw new Error(`item is one of ${SERVER_ITEMS.join(", ")}`);
  const steps = serverMenuSteps(doc, item as ServerItem);
  return { steps, until: d => d.querySelector("[role=dialog]") !== null && !d.querySelector("[role=menu]"), deadlineMs: 15000 };
}

/** Opens the per-server profile of the open server. */
export function openServerProfile(doc: Document): CommandSteps | { satisfied: true } {
  if (doc.querySelector(SERVER_EDITOR)) return { satisfied: true };
  return { steps: serverMenuSteps(doc, "change-nickname"), until: d => d.querySelector(NICKNAME) !== null, deadlineMs: 15000 };
}

/** Saves a server nickname in the open per-server profile; an empty one shows the display name again. */
export function saveNickname(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const nickname = text((args as { nickname?: unknown } | null)?.nickname ?? "", "a nickname", MAX_NAME) ?? "";
  if (!doc.querySelector(SERVER_EDITOR)) throw new Error("Discord's server profile is closed. Open it again.");
  if (fieldValue(doc, NICKNAME) === nickname && !pending(doc)) return { satisfied: true };
  return {
    steps: [...fillSteps(NICKNAME, nickname), ...saveSteps],
    until: d => !pending(d) && fieldValue(d, NICKNAME) === nickname,
    deadlineMs: 30000,
  };
}

/** Opens Server Settings on its Server Profile page, where the name and icon are. */
export function openServerSettings(doc: Document): CommandSteps | { satisfied: true } {
  if (doc.querySelector(SERVER_SETTINGS)) return { satisfied: true };
  if (/^\/channels\/\d+/.test(doc.location.pathname) && doc.querySelector(SERVER_ACTIONS) === null && doc.querySelector(RAIL)) {
    throw new Error("Discord shows no server menu here");
  }
  return { steps: serverMenuSteps(doc, "settings"), until: d => d.querySelector(SERVER_NAME) !== null, deadlineMs: 15000 };
}

/** Saves the server's name and, from a picked file, its icon in the open Server Settings. */
export function saveServer(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const input = (args ?? {}) as Record<string, unknown>;
  const name = text(input.name, "a server name", MAX_SERVER_NAME);
  const icon = fileId(input.icon);
  if (name !== undefined && name.length < 2) throw new Error("A server name needs at least 2 characters");
  if (!doc.querySelector(SERVER_SETTINGS)) throw new Error("Discord's server settings are closed. Open them again.");
  const before = serverSettings.read(doc)!;
  const steps: Step[] = [];
  if (icon) steps.push(...imageSteps(SERVER_ICON, icon));
  if (name !== undefined && name !== before.name) steps.push(...fillSteps(SERVER_NAME, name));
  if (steps.length === 0) return { satisfied: true };
  steps.push(...saveSteps);
  return {
    steps,
    until: d => {
      if (pending(d) || !d.querySelector(SERVER_SETTINGS)) return false;
      const now = serverSettings.read(d)!;
      return (name === undefined || now.name === name) && (!icon || now.icon !== before.icon);
    },
    deadlineMs: icon ? 60000 : 30000,
  };
}
