import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useWatch } from "@let/sdk/react";
import { useDiscordCommand } from "../components/commands";
import { useToast } from "../ui/feedback";
import { TopBar } from "../ui/frame";
import { RowsSkeleton } from "../ui/skeletons";
import { LoadError } from "../ui/states";
import { atLeastBusy, Field, OverLimit, saveFailure, tooLong, useOpenWhileShown } from "./profile";

const MAX_NAME = 32;

/** Server profile: the nickname the open server shows for you. */
export function NicknameScreen() {
  const { back } = useRouter();
  const { show } = useToast();
  const opened = useOpenWhileShown("openServerProfile");
  const form = useWatch<{ nickname: string; pending: boolean } | null>("nickname:form", { reader: "serverProfile" }, { context: "primary" });
  const place = useWatch<{ guild: string | null } | null>("nickname:place", { reader: "place" }, { context: "primary" });
  const save = useDiscordCommand<{ nickname: string }>("saveNickname");
  const [nickname, setNickname] = useState<string | null>(null);
  const [base, setBase] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (nickname !== null || !form.value) return;
    setBase(form.value.nickname);
    setNickname(form.value.nickname);
  }, [form.value, nickname]);

  const changed = nickname !== null && nickname.trim() !== base;
  const over = nickname !== null && tooLong(nickname, MAX_NAME);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || !changed || over) return;
    setSaving(true);
    const result = await atLeastBusy(save({ nickname: nickname!.trim() }));
    setSaving(false);
    if (result.outcome === "observed") {
      show({ text: nickname!.trim() ? "Nickname saved" : "Nickname removed" });
      return back();
    }
    const failed = saveFailure(result, "Save");
    if (failed) show({ text: failed });
  }

  const body = opened.failed && nickname === null
    ? <LoadError error={{ code: "FAILED", message: opened.failed } as never} title="Couldn't open your server profile" />
    : nickname === null ? <RowsSkeleton label="Opening your server profile" rows={2} />
    : <form id="nickname-form" className="form" onSubmit={submit} aria-busy={saving}>
      <Field label="Nickname" value={nickname} max={MAX_NAME} placeholder="Your display name" disabled={saving} onChange={event => setNickname(event.target.value)} />
      {over && <OverLimit />}
      <p className="form-hint">Only {place.value?.guild ?? "this server"} shows this name. Leave it empty to use your display name.</p>
    </form>;

  return <div className="form-screen">
    <TopBar title="Server profile" back actions={nickname !== null && <button type="submit" form="nickname-form" className="button primary small"
      disabled={!changed || over || saving} aria-busy={saving}>{saving ? "Saving" : "Save"}</button>} />
    <div className="screen">{body}</div>
  </div>;
}
