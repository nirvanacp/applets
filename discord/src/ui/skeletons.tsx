/**
 * One skeleton per destination, each shaped like the content it stands for and built from the
 * kit's `.sk` classes, so all of them fade in late and shimmer the same way.
 */
import type { ReactNode } from "react";

function Frame({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={`skeleton${className ? ` ${className}` : ""}`} role="status" aria-busy="true" aria-label={label}>{children}</div>;
}

const line = (width: string, className = "sk sk-line") => <span className={className} style={{ width }} />;

/** Conversation and server rows: an avatar, a name and a second line. */
export function RowsSkeleton({ label, square = false, rows = 8 }: { label: string; square?: boolean; rows?: number }) {
  return <Frame label={label}>
    {Array.from({ length: rows }, (_, index) => <div key={index} className="sk-row" aria-hidden="true">
      <span className={`sk sk-avatar${square ? " square" : ""}`} />
      <div className="sk-lines">{line(index % 3 === 1 ? "44%" : "62%")}{line(index % 2 ? "30%" : "48%")}</div>
    </div>)}
  </Frame>;
}

/** A channel list: category headings over channel names. */
export function ChannelsSkeleton() {
  return <Frame label="Loading channels">
    {[4, 3].map((count, group) => <div key={group} className="sk-group" aria-hidden="true">
      {line(group ? "32%" : "40%", "sk sk-caption")}
      {Array.from({ length: count }, (_, index) => <div key={index} className="sk-channel">
        <span className="sk sk-hash" />{line(index % 2 ? "42%" : "58%")}
      </div>)}
    </div>)}
  </Frame>;
}

/** A conversation: message groups with avatars, names and lines of text, newest at the bottom. */
export function MessagesSkeleton() {
  return <Frame label="Loading messages" className="sk-messages">
    {[3, 1, 2, 2].map((lines, group) => <div key={group} className="sk-message" aria-hidden="true">
      <span className="sk sk-avatar" />
      <div className="sk-lines">
        {line(group % 2 ? "28%" : "36%", "sk sk-name")}
        {Array.from({ length: lines }, (_, index) => <span key={index}>{line(index === lines - 1 ? "54%" : "88%")}</span>)}
      </div>
    </div>)}
  </Frame>;
}
