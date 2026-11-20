/**
 * One skeleton per destination, each shaped like the content it stands for and built from the
 * kit's `.sk` classes, so all of them fade in late and shimmer the same way.
 */
import type { ReactNode } from "react";

function Frame({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={`skeleton${className ? ` ${className}` : ""}`} role="status" aria-busy="true" aria-label={label}>{children}</div>;
}

const line = (width: string, className = "sk sk-line") => <span className={className} style={{ width }} />;

/** A shelf: its title and a row of square tiles with two text lines each. */
function ShelfSkeleton({ index, round = false }: { index: number; round?: boolean }) {
  return <div className="sk-shelf" aria-hidden="true">
    {line(index % 2 ? "38%" : "52%", "sk sk-title")}
    <div className="sk-tiles">{[0, 1, 2].map(slot => <div key={slot} className="sk-tile-card">
      <span className={`sk sk-art${round && slot === 1 ? " round" : ""}`} />
      {line("86%")}{line("58%")}
    </div>)}</div>
  </div>;
}

/** Home and category hubs: shelves of tiles. */
export function ShelvesSkeleton({ label }: { label: string }) {
  return <Frame label={label}>{[0, 1, 2].map(index => <ShelfSkeleton key={index} index={index} round={index === 1} />)}</Frame>;
}

/** A track row: art, title and artists. Artist pages number their rows instead of art. */
function TrackRowSkeleton({ index, numbered = false }: { index: number; numbered?: boolean }) {
  return <div className="sk-track" aria-hidden="true">
    {numbered ? <span className="sk sk-index" /> : <span className="sk sk-thumb" />}
    <div className="sk-lines">{line(index % 3 === 1 ? "48%" : "66%")}{line(index % 2 ? "34%" : "42%")}</div>
  </div>;
}

/** An album or playlist: centred art, title, byline, meta, the action row and the tracks. */
export function EntitySkeleton() {
  return <Frame label="Loading">
    <div className="sk-entity" aria-hidden="true">
      <span className="sk sk-cover" />
      {line("62%", "sk sk-title")}
      {line("34%")}
      {line("48%")}
      <div className="sk-actions">
        <span className="sk sk-round" />
        <span className="grow" />
        <span className="sk sk-play" />
      </div>
    </div>
    {[0, 1, 2, 3, 4, 5].map(index => <TrackRowSkeleton key={index} index={index} />)}
  </Frame>;
}

/** An artist: the full-width photo with the name over it, listeners, actions and numbered rows. */
export function ArtistSkeleton() {
  return <Frame label="Loading artist">
    <div aria-hidden="true">
      <span className="sk sk-hero" />
      <div className="sk-entity left">
        {line("40%")}
        <div className="sk-actions">
          <span className="sk sk-pill" />
          <span className="grow" />
          <span className="sk sk-play" />
        </div>
        {line("30%", "sk sk-title")}
      </div>
    </div>
    {[0, 1, 2, 3, 4].map(index => <TrackRowSkeleton key={index} index={index} numbered />)}
  </Frame>;
}

/** Search's Browse all: the heading and two columns of category tiles. */
export function BrowseSkeleton() {
  return <Frame label="Loading Search">
    <div aria-hidden="true">
      {line("32%", "sk sk-title sk-browse-title")}
      <div className="sk-browse">{Array.from({ length: 8 }, (_, tile) => <span key={tile} className="sk sk-category" />)}</div>
    </div>
  </Frame>;
}

/** Search results and recent searches: square or round art and two lines. */
export function ResultsSkeleton({ label = "Searching", chips = true }: { label?: string; chips?: boolean }) {
  return <Frame label={label}>
    {chips && <div className="sk-chips" aria-hidden="true">{["18%", "16%", "20%", "18%"].map((width, slot) => <span key={slot} className="sk sk-chip" style={{ width }} />)}</div>}
    {Array.from({ length: 7 }, (_, index) => <div key={index} className="sk-track" aria-hidden="true">
      <span className={`sk sk-thumb${index % 4 === 1 ? " round" : ""}`} />
      <div className="sk-lines">{line(index % 3 === 1 ? "44%" : "62%")}{line(index % 2 ? "30%" : "38%")}</div>
    </div>)}
  </Frame>;
}
