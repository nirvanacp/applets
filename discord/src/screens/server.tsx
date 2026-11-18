import { useEffect, useState, type FormEvent } from "react";
import { useFilePicker, useGenesis, useRouter, useWatch } from "@let/sdk/react";
import { useDiscordCommand } from "../components/commands";
import { Avatar, Icon } from "../components/ui";
import type { ServerForm } from "../model";
import { useToast } from "../ui/feedback";
import { TopBar } from "../ui/frame";
import { RowsSkeleton } from "../ui/skeletons";
import { Notice } from "../ui/states";
import { atLeastBusy, Field, OverLimit, saveFailure, tooLong, useOpenWhileShown } from "./profile";

const MAX_SERVER_NAME = 100;

/** Edit server: the open server's name and icon, from Discord's Server Settings. */
export function ServerScreen() {
  const genesis = useGenesis();
  const { back } = useRouter();
  const { show } = useToast();
  const opened = useOpenWhileShown("openServerSettings");
  const form = useWatch<ServerForm | null>("server:form", { reader: "serverSettings" }, { context: "primary" });
  const save = useDiscordCommand<{ name?: string; icon?: string }>("saveServer");
  const { files, pick } = useFilePicker();
  const [name, setName] = useState<string | null>(null);
  const [base, setBase] = useState<ServerForm | null>(null);
  const [saving, setSaving] = useState(false);
  const icon = files[0] ?? null;
  const canPick = genesis.limits.userActions === true;

  useEffect(() => {
    if (name !== null || !form.value) return;
    setBase(form.value);
    setName(form.value.name);
  }, [form.value, name]);

  const trimmed = name?.trim() ?? "";
  const changes = base ? { ...(trimmed !== base.name ? { name: trimmed } : {}), ...(icon ? { icon: icon.id } : {}) } : {};
  const changed = Object.keys(changes).length > 0;
  const short = name !== null && [...trimmed].length < 2;
  const over = name !== null && tooLong(name, MAX_SERVER_NAME);

  async function choose() {
    try {
      await pick({ accept: ["image/*"] });
    } catch {
      show({ text: "Couldn't open your pictures." });
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || !changed || short || over) return;
    setSaving(true);
    // Discord crops a new icon with drawing work that a covered page does not do unless awake.
    const release = icon ? genesis.context("primary").hold("awake") : undefined;
    const result = await atLeastBusy(save(changes)).finally(() => release?.());
    setSaving(false);
    if (result.outcome === "observed") {
      show({ text: "Server saved" });
      return back();
    }
    const failed = saveFailure(result, "Save");
    if (failed) show({ text: failed });
  }

  const body = opened.failed && name === null
    ? <Notice title="You can't edit this server" role="alert"><p>Only people with the Manage Server permission can change its name and icon.</p></Notice>
    : name === null || !base ? <RowsSkeleton label="Opening server settings" rows={3} />
    : <form id="server-form" className="form" onSubmit={submit} aria-busy={saving}>
      <div className="form-picture">
        {icon
          ? <span className="avatar square large"><img className="loaded" src={icon.previewUrl} alt="" /></span>
          : <Avatar src={base.icon} name={base.name} square className="large" />}
        {canPick && <button type="button" className="button secondary small" disabled={saving} onClick={() => void choose()}>
          <Icon name="camera" />{icon ? "Choose another" : "Change icon"}
        </button>}
      </div>
      <Field label="Server name" value={name} max={MAX_SERVER_NAME} disabled={saving} onChange={event => setName(event.target.value)} />
      {over && <OverLimit />}
      {short && <p className="form-hint error" role="alert">A server name needs at least 2 characters.</p>}
    </form>;

  return <div className="form-screen">
    <TopBar title="Edit server" back actions={name !== null && <button type="submit" form="server-form" className="button primary small"
      disabled={!changed || short || over || saving} aria-busy={saving}>{saving ? "Saving" : "Save"}</button>} />
    <div className="screen">{body}</div>
  </div>;
}
