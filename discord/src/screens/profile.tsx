import { useEffect, useRef, useState, type FormEvent } from "react";
import { useFilePicker, useGenesis, useRouter, useWatch } from "@let/sdk/react";
import { failureText, useDiscordCommand, type Result } from "../components/commands";
import { Avatar, Icon } from "../components/ui";
import type { ProfileForm } from "../model";
import { MIN_BUSY_MS, useToast } from "../ui/feedback";
import { TopBar } from "../ui/frame";
import { RowsSkeleton } from "../ui/skeletons";
import { LoadError, Notice } from "../ui/states";

const MAX_NAME = 32;
const MAX_PRONOUNS = 40;
const MAX_BIO = 190;

/**
 * Opens a Discord window with `open` when the screen mounts and closes it when the screen goes,
 * so the website shows no editor the person did not ask for. Returns why it did not open.
 */
export function useOpenWhileShown(command: string): { failed: string | null; retry(): void } {
  const open = useDiscordCommand(command);
  const dismiss = useDiscordCommand("dismiss");
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setFailed(null);
    void open().then(result => { if (live) setFailed(failureText(result, "Discord didn't open it.")); });
    return () => { live = false; };
  }, [open, attempt]);
  useEffect(() => () => { void dismiss(); }, [dismiss]);
  return { failed, retry: () => setAttempt(n => n + 1) };
}

/** Waits at least MIN_BUSY_MS so a fast save still shows it was working. */
export async function atLeastBusy<T>(work: Promise<T>): Promise<T> {
  const started = Date.now();
  const result = await work;
  await new Promise(done => setTimeout(done, Math.max(0, MIN_BUSY_MS - (Date.now() - started))));
  return result;
}

/**
 * True when a field holds more than Discord takes. The fields' `maxLength` stops typing, but text
 * an Android keyboard commits while composing can pass it.
 */
export const tooLong = (value: string, max: number) => [...value.trim()].length > max;

/** The hint under a form whose field is over its limit. */
export const OverLimit = () => <p className="form-hint error" role="alert">Shorten the field marked in red to save.</p>;

/** What a save that did not finish tells the person. */
export function saveFailure(result: Result, again: string): string | null {
  if (result.outcome === "observed" || result.outcome === "cancelled") return null;
  if (result.code === "USER_ACTION_REQUIRED") return `Tap ${again} again to add the picture.`;
  if (result.code === "FILE_UNAVAILABLE") return "The picture is no longer available. Choose it again.";
  return failureText(result, "Discord didn't confirm the change. Check it before trying again.");
}

/** Edit profile: Discord's own profile editor, with the picture, display name, pronouns and bio. */
export function ProfileScreen() {
  const genesis = useGenesis();
  const { back } = useRouter();
  const { show } = useToast();
  const opened = useOpenWhileShown("openProfile");
  const form = useWatch<ProfileForm | null>("profile:form", { reader: "profile" }, { context: "primary" });
  const save = useDiscordCommand<{ displayName?: string; pronouns?: string; bio?: string; avatar?: string }>("saveProfile");
  const { files, pick } = useFilePicker();
  const [fields, setFields] = useState<{ displayName: string; pronouns: string; bio: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const seeded = useRef<ProfileForm | null>(null);
  const picture = files[0] ?? null;
  const canPick = genesis.limits.userActions === true;

  // The fields start from Discord's editor once; later reads do not overwrite what the person typed.
  useEffect(() => {
    if (fields || !form.value) return;
    seeded.current = form.value;
    setFields({ displayName: form.value.displayName, pronouns: form.value.pronouns, bio: form.value.bio });
  }, [form.value, fields]);

  const base = seeded.current;
  const changes = fields && base ? {
    ...(fields.displayName !== base.displayName ? { displayName: fields.displayName.trim() } : {}),
    ...(fields.pronouns !== base.pronouns ? { pronouns: fields.pronouns.trim() } : {}),
    ...(fields.bio !== base.bio ? { bio: fields.bio.trim() } : {}),
    ...(picture ? { avatar: picture.id } : {}),
  } : {};
  const changed = Object.keys(changes).length > 0;
  const over = fields !== null && (tooLong(fields.displayName, MAX_NAME) || tooLong(fields.pronouns, MAX_PRONOUNS) || tooLong(fields.bio, MAX_BIO));

  async function choosePicture() {
    try {
      // A single pick replaces the last picture.
      await pick({ accept: ["image/*"] });
    } catch {
      show({ text: "Couldn't open your pictures." });
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || !changed || over) return;
    setSaving(true);
    // Discord crops a new picture with drawing work that a covered page does not do unless awake.
    const release = picture ? genesis.context("primary").hold("awake") : undefined;
    const result = await atLeastBusy(save(changes)).finally(() => release?.());
    setSaving(false);
    if (result.outcome === "observed") {
      show({ text: "Profile saved" });
      return back();
    }
    const failed = saveFailure(result, "Save");
    if (failed) show({ text: failed });
  }

  const set = (key: "displayName" | "pronouns" | "bio") => (event: { target: { value: string } }) =>
    setFields(now => now && { ...now, [key]: event.target.value });

  const body = opened.failed && !fields
    ? <LoadError error={{ code: "FAILED", message: opened.failed } as never} title="Couldn't open your profile" />
    : !fields || !base ? <RowsSkeleton label="Opening your profile" rows={4} />
    : <form id="profile-form" className="form" onSubmit={submit} aria-busy={saving}>
      <div className="form-picture">
        {picture
          ? <span className="avatar large"><img className="loaded" src={picture.previewUrl} alt="" /></span>
          : <Avatar src={base.avatar} name={base.displayName || base.username} className="large" />}
        {canPick
          ? <button type="button" className="button secondary small" disabled={saving} onClick={() => void choosePicture()}>
            <Icon name="camera" />{picture ? "Choose another" : "Change picture"}
          </button>
          : <p className="form-hint">Change your picture on Discord's website.</p>}
      </div>
      <Field label="Display name" value={fields.displayName} max={MAX_NAME} placeholder={base.username} disabled={saving} onChange={set("displayName")} />
      <Field label="Pronouns" value={fields.pronouns} max={MAX_PRONOUNS} placeholder="Add your pronouns" disabled={saving} onChange={set("pronouns")} />
      <Field label="About me" value={fields.bio} max={MAX_BIO} multiline disabled={saving} onChange={set("bio")} />
      {over && <OverLimit />}
      <p className="form-hint">Username: {base.username}</p>
    </form>;

  return <div className="form-screen">
    <TopBar title="Edit profile" back actions={fields && <button type="submit" form="profile-form" className="button primary small"
      disabled={!changed || over || saving} aria-busy={saving}>{saving ? "Saving" : "Save"}</button>} />
    <div className="screen">
      {opened.failed && fields && <Notice title="Discord closed your profile" role="alert"><p>{opened.failed}</p></Notice>}
      {body}
    </div>
  </div>;
}

export function Field({ label, value, max, placeholder, multiline = false, disabled, onChange }: {
  label: string; value: string; max: number; placeholder?: string; multiline?: boolean; disabled?: boolean;
  onChange(event: { target: { value: string } }): void;
}) {
  const left = max - [...value].length;
  return <label className="field">
    <span className="field-label">{label}<span className={`field-count${left < 0 ? " over" : ""}`}>{left}</span></span>
    {multiline
      ? <textarea rows={4} value={value} placeholder={placeholder} maxLength={max} readOnly={disabled} onChange={onChange} />
      : <input value={value} placeholder={placeholder} maxLength={max} readOnly={disabled} onChange={onChange} />}
  </label>;
}
