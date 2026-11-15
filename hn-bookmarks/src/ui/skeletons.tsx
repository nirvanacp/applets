/**
 * One skeleton per destination, each shaped like the content it stands for and built from the
 * kit's `.sk` classes, so all of them fade in late and shimmer the same way. Only `.sk` paints;
 * the other classes here set layout and size.
 */
import type { ReactNode } from "react";

function Frame({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={`skeleton${className ? ` ${className}` : ""}`} role="status" aria-busy="true" aria-label={label}>{children}</div>;
}

const line = (width: string, className = "sk sk-line") => <span className={className} style={{ width }} />;
const rows = (count: number, row: (index: number) => ReactNode) => Array.from({ length: count }, (_, index) => <div key={index} aria-hidden="true" className="sk-wrap">{row(index)}</div>);

/** A story row: rank, vote arrow, a title of one or two lines, the metadata line and the Save button. */
function StoryRowSkeleton({ index, rank }: { index: number; rank: boolean }) {
  return <div className="sk-story">
    {rank && <span className="sk-rank"><span className="sk sk-num" /></span>}
    <span className="sk-vote"><span className="sk sk-arrow" /></span>
    <div className="sk-story-body">
      {line(index % 3 === 1 ? "92%" : "84%", "sk sk-title")}
      {index % 2 === 0 && line(index % 4 === 0 ? "48%" : "62%", "sk sk-title")}
      {line(index % 3 === 2 ? "52%" : "64%")}
    </div>
    <span className="sk-save"><span className="sk sk-dot" /></span>
  </div>;
}

/** A comment: the author line, then a few lines of text, indented by its depth. */
function CommentSkeleton({ index, depth = 0, story = false }: { index: number; depth?: number; story?: boolean }) {
  return <div className="sk-comment" style={{ paddingLeft: `${depth * 12}px` }}>
    {line(story ? "58%" : index % 2 ? "34%" : "42%")}
    {line("96%")}
    {line(index % 3 === 0 ? "88%" : "70%")}
    {index % 2 === 0 && line("46%")}
  </div>;
}

/** Home and every HN story list: Top, New, Past, Ask, Show, Jobs, submissions and favorites. */
export function StoryListSkeleton({ label = "Loading stories", rank = true }: { label?: string; rank?: boolean }) {
  return <Frame label={label}>{rows(9, index => <StoryRowSkeleton index={index} rank={rank} />)}</Frame>;
}

/** Lists of comments: New comments and a user's comments. */
export function CommentListSkeleton() {
  return <Frame label="Loading comments">{rows(6, index => <CommentSkeleton index={index} story />)}</Frame>;
}

/** A discussion: the story at the top, the comment action, the heading and an indented thread. */
export function ItemSkeleton() {
  const depths = [0, 1, 2, 1, 0, 1];
  return <Frame label="Loading discussion">
    <div className="sk-head" aria-hidden="true">
      {line("90%", "sk sk-heading")}
      {line("56%", "sk sk-heading")}
      {line("60%")}
      <span className="sk sk-pill" />
    </div>
    <div className="sk-section" aria-hidden="true">{line("30%")}</div>
    {rows(depths.length, index => <CommentSkeleton index={index} depth={depths[index]} />)}
  </Frame>;
}

/** A profile: karma and joined, the about card and the three list rows. */
export function ProfileSkeleton() {
  return <Frame label="Loading profile">
    <div className="sk-facts" aria-hidden="true">
      {[0, 1].map(row => <div key={row} className="sk-fact">{line("64px")}{line(row ? "38%" : "22%")}</div>)}
    </div>
    <div className="sk-card" aria-hidden="true">{line("24%")}{line("94%")}{line("82%")}{line("40%")}</div>
    <ListRowsSkeleton count={3} />
  </Frame>;
}

/** Guidelines, FAQ and HN's other text pages: paragraphs of lines. */
export function InfoSkeleton() {
  return <Frame label="Loading page">
    {rows(4, index => <div className="sk-paragraph">
      {line("98%")}{line("94%")}{line("97%")}{line(index % 2 ? "58%" : "72%")}
    </div>)}
  </Frame>;
}

/** Search results: the total line, then result rows without ranks. */
export function ResultsSkeleton() {
  return <Frame label="Searching">
    <div className="sk-total" aria-hidden="true">{line("38%")}</div>
    {rows(8, index => <StoryRowSkeleton index={index} rank={false} />)}
  </Frame>;
}

/** The submit form: three labeled fields and the Post button. */
export function PostFormSkeleton() {
  return <Frame label="Loading the post form" className="sk-form">
    {rows(3, index => <div className="sk-field-group">{line("54px")}<span className={`sk sk-input${index === 2 ? " tall" : ""}`} /></div>)}
    <span className="sk sk-pill wide" aria-hidden="true" />
  </Frame>;
}

/** The Me tab: the account card and the list of the account's pages. */
export function AccountSkeleton() {
  return <Frame label="Loading account">
    <div className="sk-card" aria-hidden="true">{line("40%", "sk sk-heading")}{line("24%")}</div>
    <ListRowsSkeleton count={6} />
  </Frame>;
}

/** Saved: the filter chips, the title filter and saved story rows. */
export function SavedSkeleton() {
  return <Frame label="Loading saved stories">
    <div className="sk-chips" aria-hidden="true">{["44px", "112px", "72px", "88px"].map(width => <span key={width} className="sk sk-chip" style={{ width }} />)}</div>
    <span className="sk sk-input inset" aria-hidden="true" />
    {rows(6, index => <div className="sk-saved">
      {line(index % 2 ? "88%" : "76%", "sk sk-title")}
      {index % 3 === 0 && line("44%", "sk sk-title")}
      {line("58%")}
    </div>)}
  </Frame>;
}

/** Categories: the new category field and a row per category. */
export function CategoriesSkeleton() {
  return <Frame label="Loading categories">
    <div className="sk-field-row" aria-hidden="true"><span className="sk sk-input" /><span className="sk sk-pill" /></div>
    {rows(4, index => <div className="sk-category">{line(index % 2 ? "44%" : "32%")}<span className="sk sk-dot" /></div>)}
  </Frame>;
}

/** The Save screen's category choices: a check box and a name per row. */
export function ChoicesSkeleton() {
  return <Frame label="Loading saved state">
    {rows(4, index => <div className="sk-choice"><span className="sk sk-box" />{line(index % 2 ? "38%" : "26%")}</div>)}
  </Frame>;
}

/** Rows of a plain list, such as a profile's lists or the Me tab's links. */
function ListRowsSkeleton({ count }: { count: number }) {
  return <div className="sk-list" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => <div key={index} className="sk-list-row">{line(index % 2 ? "36%" : "28%")}</div>)}
  </div>;
}
