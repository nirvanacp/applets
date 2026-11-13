import { list, value } from "@genesis/sdk/page";
import { kindOfUrl, urlOf, type Card, type Kind, type Section } from "../model";
import { hrefOf, imageIn, MAIN, textOf } from "./read";

/**
 * Spotify draws every row of tiles (Home, genre pages, artist and album pages, search) as a
 * `carousel-mwp`, with its heading as an `h2` somewhere before it. Cards come in three shapes:
 * Home's `home-card`, the link card `card-mwp` and the plain Encore `card`.
 */
const CAROUSEL = `${MAIN} [data-testid=carousel-mwp]`;
const CARD = "[data-testid=home-card], [data-testid=card-mwp], [data-encore-id=card]";

/** The last `h2` before the carousel in document order. */
function headingOf(carousel: Element): Element | null {
  let found: Element | null = null;
  for (const heading of carousel.ownerDocument.querySelectorAll(`${MAIN} h2`)) {
    if (heading.compareDocumentPosition(carousel) & Node.DOCUMENT_POSITION_FOLLOWING) found = heading;
    else break;
  }
  return found;
}

const titleOf = (carousel: Element) => textOf(headingOf(carousel), 120);

/** The title, with "#2", "#3" for later rows of the same name ("More like …" repeats). */
function sectionKey(carousel: Element): string {
  const title = titleOf(carousel) || "Section";
  let count = 0;
  for (const other of carousel.ownerDocument.querySelectorAll(CAROUSEL)) {
    if (other === carousel) break;
    if (titleOf(other) === title) count += 1;
  }
  return count === 0 ? title : `${title} #${count + 1}`;
}

/** `card-title-…spotify:album:<id>-n` names the object even where the card has no link. */
const LABEL_URI = /spotify:([a-z]+):([A-Za-z0-9]+)/;

function readCard(card: Element, index: number): Card {
  const labelledBy = card.getAttribute("aria-labelledby");
  const titleElement = (labelledBy && card.ownerDocument.getElementById(labelledBy))
    || card.querySelector("[data-encore-id=listRowTitle]") || card.querySelector("p, span");
  const subtitleElement = card.querySelector("[data-encore-id=listRowDetails]")
    ?? [...card.querySelectorAll("p, [data-encore-id=text]")]
      .find(node => node !== titleElement && !node.contains(titleElement) && !titleElement?.contains(node)) ?? null;
  const link = card.matches("a[href]") ? card : card.closest("a[href]") ?? card.querySelector("a[href]");
  let url = hrefOf(link);
  const uri = labelledBy ? LABEL_URI.exec(labelledBy) : null;
  if (!url && uri) url = urlOf(uri[1] as Kind, uri[2]!);
  const kind = kindOfUrl(url);
  return {
    key: url ?? `${index}:${labelledBy ?? ""}`,
    title: textOf(titleElement, 200),
    subtitle: textOf(subtitleElement, 200) || null,
    image: imageIn(card),
    url,
    kind,
    // A card without a link opens with a click on its title text, which Spotify handles.
    clickId: url ? null : labelledBy,
  };
}

function readSection(carousel: Element): Section {
  const cards = [...carousel.querySelectorAll(CARD)].filter(card => !card.parentElement?.closest(CARD));
  const byKey = new Map<string, Card>();
  for (const card of cards.map(readCard)) if (card.title && !byKey.has(card.key)) byKey.set(card.key, card);
  return { title: titleOf(carousel), cards: [...byKey.values()] };
}

/** Every titled row of tiles on the page, in page order. */
export const sections = list({
  root: MAIN,
  items: "[data-testid=carousel-mwp]",
  key: sectionKey,
  read: readSection,
  extent: carousel => [headingOf(carousel)],
});

/** The page's main heading, such as Home's greeting or a genre's name. */
export const heading = value(doc => textOf(doc.querySelector(`${MAIN} h1`), 200) || null, { root: MAIN });

/** Home is ready once its first row of tiles is drawn. */
export const homeReady = value(doc => doc.querySelector(CAROUSEL) !== null);
