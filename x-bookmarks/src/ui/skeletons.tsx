/**
 * One skeleton per destination, each shaped like the content it stands for and built from the
 * kit's `.sk` classes, so all of them fade in late and shimmer the same way.
 */
import type { ReactNode } from "react";

function Frame({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={`skeleton${className ? ` ${className}` : ""}`} role="status" aria-busy="true" aria-label={label}>{children}</div>;
}

const line = (width: string, className = "sk sk-line") => <span className={className} style={{ width }} />;

/** A post row: avatar, name line, text, sometimes media, and the action bar. */
function PostRowSkeleton({ index, media = index % 3 === 1 }: { index: number; media?: boolean }) {
  return <div className="sk-post" aria-hidden="true">
    <span className="sk sk-avatar" />
    <div className="sk-post-body">
      {line(index % 2 ? "46%" : "58%")}
      {line("94%")}
      {line(index % 3 === 2 ? "52%" : "78%")}
      {media && <span className="sk sk-media" />}
      <div className="sk-actions">{[0, 1, 2, 3].map(slot => <span key={slot} className="sk sk-dot" />)}</div>
    </div>
  </div>;
}

/** Home, Bookmarks, Likes, search results and a profile's posts. */
export function FeedSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  return <Frame label={label}>{Array.from({ length: rows }, (_, index) => <PostRowSkeleton key={index} index={index} />)}</Frame>;
}

/** Notifications: an icon column, a row of small avatars and a line or two of text. */
export function NotificationsSkeleton() {
  return <Frame label="Loading notifications">{Array.from({ length: 7 }, (_, index) => <div key={index} className="sk-notice" aria-hidden="true">
    <span className="sk sk-glyph" />
    <div className="sk-post-body">
      <div className="sk-avatars">{Array.from({ length: 1 + (index % 3) }, (_, slot) => <span key={slot} className="sk sk-avatar small" />)}</div>
      {line(index % 2 ? "84%" : "66%")}
      {index % 3 === 0 && line("48%")}
    </div>
  </div>)}</Frame>;
}

/** A post and its conversation: the focused post large, then reply rows. */
export function PostSkeleton() {
  return <Frame label="Loading post">
    <div className="sk-focus" aria-hidden="true">
      <div className="sk-focus-head"><span className="sk sk-avatar" /><div className="sk-post-body">{line("42%")}{line("28%")}</div></div>
      {line("96%", "sk sk-title")}{line("88%", "sk sk-title")}{line("40%", "sk sk-title")}
      <span className="sk sk-media" />
      {line("36%")}
      <div className="sk-actions wide">{[0, 1, 2, 3, 4].map(slot => <span key={slot} className="sk sk-dot" />)}</div>
    </div>
    {[0, 1].map(index => <PostRowSkeleton key={index} index={index * 2} media={false} />)}
  </Frame>;
}

/** A profile: banner, avatar over its edge, name, bio, the section tabs and the first posts. */
export function ProfileSkeleton({ label = "Loading profile" }: { label?: string }) {
  return <Frame label={label}>
    <div aria-hidden="true">
      <span className="sk sk-banner" />
      <div className="sk-profile">
        <span className="sk sk-avatar large" />
        {line("44%", "sk sk-title")}{line("26%")}{line("90%")}{line("70%")}
        <div className="sk-row">{line("24%")}{line("24%")}</div>
      </div>
      <div className="sk-segments">{[0, 1, 2].map(slot => <span key={slot} className="sk sk-line" />)}</div>
    </div>
    {[0, 1].map(index => <PostRowSkeleton key={index} index={index} />)}
  </Frame>;
}

/** A profile's media tab: a grid of square tiles. */
export function GridSkeleton() {
  return <Frame label="Loading media" className="sk-grid">{Array.from({ length: 12 }, (_, index) => <span key={index} className="sk sk-tile" aria-hidden="true" />)}</Frame>;
}

/** Explore's trends: no avatars, a context line, the trend and its count. */
export function TrendsSkeleton() {
  return <Frame label="Loading trends">
    <span className="sk sk-section" aria-hidden="true" />
    {Array.from({ length: 8 }, (_, index) => <div key={index} className="sk-trend" aria-hidden="true">
      {line("34%")}{line(index % 2 ? "52%" : "40%", "sk sk-title")}{line("22%")}
    </div>)}
  </Frame>;
}

/** Search's People tab: avatar, name, handle and a bio line. */
export function PeopleSkeleton() {
  return <Frame label="Loading people">{Array.from({ length: 7 }, (_, index) => <div key={index} className="sk-person" aria-hidden="true">
    <span className="sk sk-avatar" />
    <div className="sk-post-body">{line("40%")}{line("28%")}{line(index % 2 ? "80%" : "64%")}</div>
    <span className="sk sk-pill" />
  </div>)}</Frame>;
}

/** The Categories library: a chip row, the search field and saved posts. */
export function LibrarySkeleton() {
  return <Frame label="Loading categories">
    <div className="sk-chips" aria-hidden="true">{[56, 88, 72, 64].map(width => <span key={width} className="sk sk-chip" style={{ width }} />)}</div>
    <span className="sk sk-field" aria-hidden="true" />
    {Array.from({ length: 4 }, (_, index) => <div key={index} className="sk-saved" aria-hidden="true">
      {line("38%")}{line("92%")}{line("64%")}
      <div className="sk-row">{line("18%", "sk sk-chip")}{line("22%", "sk sk-chip")}</div>
    </div>)}
  </Frame>;
}

/** A sheet's list of categories: a checkbox and a name per row. */
export function ChoiceSkeleton({ label = "Loading categories" }: { label?: string }) {
  return <Frame label={label}>{Array.from({ length: 4 }, (_, index) => <div key={index} className="sk-choice" aria-hidden="true">
    <span className="sk sk-box" />{line(index % 2 ? "48%" : "62%")}
  </div>)}</Frame>;
}

/** The photo viewer: a dark frame where the photo will be. */
export function PhotoSkeleton() {
  return <Frame label="Loading photo" className="sk-photo"><span className="sk sk-photo-frame" aria-hidden="true" /></Frame>;
}
