/**
 * One skeleton per destination, shaped like the screen that replaces it (UI kit). Only `.sk`
 * shapes paint the shimmer. A skeleton fades in after a moment, so fast loads never flash, and
 * holds still under reduced motion. `chrome` draws the destination's header too, for the moments
 * before the screen itself, header included, can render.
 */
import type { ReactNode } from "react";

function Busy({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return <div role="status" aria-busy="true" aria-label={label} className={`skeleton ${className}`}>
    <div aria-hidden="true">{children}</div>
  </div>;
}

const repeat = (count: number, row: (index: number) => ReactNode) => Array.from({ length: count }, (_, index) => row(index));
const widths = ["62%", "48%", "70%", "55%", "66%", "44%", "58%"];
const width = (index: number) => widths[index % widths.length];

/** A thread row: avatar, sender and date, subject, snippet. */
function ThreadRowShape({ index }: { index: number }) {
  return <div className="sk-thread">
    <span className="sk sk-avatar" />
    <span className="sk-lines">
      <span className="sk-split"><span className="sk sk-line" style={{ width: "38%" }} /><span className="sk sk-line" style={{ width: 36 }} /></span>
      <span className="sk sk-line" style={{ width: width(index) }} />
      <span className="sk sk-line faint" style={{ width: "84%" }} />
    </span>
  </div>;
}

/** Inbox, categories, labels and search results. */
export function InboxSkeleton({ label, chrome = false, rows = 8 }: { label: string; chrome?: boolean; rows?: number }) {
  return <Busy label={label} className="inbox">
    {chrome && <div className="sk-pill-row"><span className="sk sk-pill" /></div>}
    {repeat(rows, index => <ThreadRowShape key={index} index={index} />)}
  </Busy>;
}

/** An open email: subject, sender, message body. */
export function EmailSkeleton({ label = "Loading email", chrome = false }: { label?: string; chrome?: boolean }) {
  return <Busy label={label} className="email">
    {chrome && <div className="sk-bar-row"><span className="sk sk-icon" /><span className="spacer" /><span className="sk sk-icon" /><span className="sk sk-icon" /><span className="sk sk-icon" /></div>}
    <span className="sk sk-title" style={{ width: "86%" }} />
    <span className="sk sk-title" style={{ width: "52%" }} />
    <span className="sk sk-chip" />
    <div className="sk-thread">
      <span className="sk sk-avatar small" />
      <span className="sk-lines"><span className="sk sk-line" style={{ width: "42%" }} /><span className="sk sk-line faint" style={{ width: "30%" }} /></span>
    </div>
    {repeat(7, index => <span key={index} className="sk sk-line" style={{ width: index % 4 === 3 ? "48%" : "100%" }} />)}
  </Busy>;
}

/** Compose: From, To and Subject fields over the message. */
export function ComposeSkeleton({ label = "Opening compose" }: { label?: string }) {
  return <Busy label={label} className="compose">
    {repeat(3, index => <div key={index} className="sk-field"><span className="sk sk-line" style={{ width: 40 }} /><span className="sk sk-line" style={{ width: width(index + 1) }} /></div>)}
    <div className="sk-body">{repeat(4, index => <span key={index} className="sk sk-line" style={{ width: index === 3 ? "40%" : "92%" }} />)}</div>
  </Busy>;
}

/** The drawer: account card and folder rows. */
export function DrawerSkeleton({ label = "Loading folders", card = false }: { label?: string; card?: boolean }) {
  return <Busy label={label} className="drawer">
    {card && <div className="sk-card"><span className="sk sk-avatar small" /><span className="sk-lines"><span className="sk sk-line" style={{ width: "50%" }} /><span className="sk sk-line faint" style={{ width: "70%" }} /></span></div>}
    {repeat(7, index => <div key={index} className="sk-folder"><span className="sk sk-icon" /><span className="sk sk-line" style={{ width: width(index + 2) }} /></div>)}
  </Busy>;
}

/** To-do item rows; the screen draws its header, sort and week strip itself. */
export function TodoSkeleton({ label = "Loading your to-dos" }: { label?: string }) {
  return <Busy label={label} className="todo">
    {repeat(6, index => <ItemRowShape key={index} index={index} />)}
  </Busy>;
}

function ItemRowShape({ index }: { index: number }) {
  return <div className="sk-item">
    <span className="sk sk-mark" />
    <span className="sk-lines"><span className="sk sk-line" style={{ width: width(index) }} /><span className="sk sk-line faint" style={{ width: "34%" }} /></span>
  </div>;
}

/** One to-do or reminder: its title and detail rows. */
export function ItemSkeleton({ label = "Loading item" }: { label?: string }) {
  return <Busy label={label} className="item">
    <span className="sk sk-title" style={{ width: "70%" }} />
    <span className="sk sk-chip" />
    {repeat(4, index => <div key={index} className="sk-folder"><span className="sk sk-icon" /><span className="sk sk-line" style={{ width: width(index + 3) }} /></div>)}
  </Busy>;
}

/** Snoozed emails and accounts: short rows with an avatar. */
export function SimpleListSkeleton({ label, rows = 4 }: { label: string; rows?: number }) {
  return <Busy label={label} className="simple">
    {repeat(rows, index => <ItemRowShape key={index} index={index + 1} />)}
  </Busy>;
}
