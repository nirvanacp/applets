import { one } from "@genesis/sdk/page";
import { TITLE_LIMIT, type SubmitForm } from "../model.ts";
import { clean, type CommandResult } from "./read.ts";

/** HN's submit form. It posts to `/r`; a rejected submission shows the form again there. */
export const FORM = "form[action='/r']";
const FIELDS = ["title", "url", "text"] as const;
type FieldName = typeof FIELDS[number];

const field = (form: Element, name: FieldName) =>
  form.querySelector(`[name='${name}']`) as HTMLInputElement | HTMLTextAreaElement | null;

/**
 * The form's field values and the message HN shows above it after a rejected submission.
 * The message is the text of the page's box outside the form and its script.
 */
function readForm(form: Element): SubmitForm {
  const values = Object.fromEntries(FIELDS.map(name => [name, field(form, name)?.value ?? ""])) as Record<FieldName, string>;
  const box = form.closest("#bigbox, td") ?? form.parentElement;
  let message = "";
  for (const node of box?.childNodes ?? []) {
    if (node === form || (node as Element).tagName === "SCRIPT" || (node as Element).contains?.(form)) continue;
    message += ` ${node.textContent ?? ""}`;
  }
  return { ...values, error: clean(message, 300) || null };
}

const isField = (name: unknown): name is FieldName => FIELDS.includes(name as FieldName);

/** `/submit` and `/r` are ready once HN's layout is parsed: the form, or the login form when signed out. */
export const submitReady = (doc: Document) => doc.readyState !== "loading" && doc.querySelector("#hnmain") !== null;

/**
 * Signed out, HN shows its login form on `/submit` instead, and the page has no top bar either
 * way, so the form itself is the evidence: present says nothing, absent means signed out.
 */
export const submitAccount = (doc: Document) => (doc.querySelector(FORM) ? null : false);

export const form = one({
  root: FORM,
  // The rejection message sits beside the form, in the page's box, outside the reader's root.
  dependsOn: ["#hnmain"],
  fields: true,
  read: readForm,
});

/** Types a value into one of HN's fields, firing its input events. */
export function setField(doc: Document, args: unknown): CommandResult {
  const { name, value } = (args ?? {}) as { name?: unknown; value?: unknown };
  if (!isField(name) || typeof value !== "string") throw new Error("setField needs { name: title | url | text, value }");
  if (name === "title" && value.length > TITLE_LIMIT) throw new Error(`Titles are at most ${TITLE_LIMIT} characters`);
  const selector = `${FORM} [name='${name}']`;
  const input = doc.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!input) throw new Error(`The form has no ${name} field`);
  if (input.value === value) return { satisfied: true };
  return {
    steps: [{ op: "fill", target: { css: selector }, value }],
    until: d => (d.querySelector(selector) as HTMLInputElement | null)?.value === value,
  };
}

/**
 * Submits HN's form as it stands. HN decides: the caller's `expect` names the new story, the
 * list of new stories or an existing discussion as success and the form again as a rejection.
 */
export function submit(doc: Document): CommandResult {
  if (!doc.querySelector(FORM)) throw new Error("Hacker News shows no submit form");
  return { steps: [{ op: "submit", target: { css: FORM } }], navigates: true };
}
