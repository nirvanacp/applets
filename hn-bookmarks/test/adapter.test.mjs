// Runs the page module's readers and commands on small hand-written pages shaped like Hacker News.
// The markup keeps only what the readers read; ids, names and tokens are made up.
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import module from "../src/page.ts";
import { ROUTES, signInUrl, whenScreen } from "../src/routes.ts";

const layout = (body, { me = "alice" } = {}) => `<!doctype html><html><body><center><table id="hnmain"><tbody>
<tr><td><span class="pagetop"><b class="hnname"><a href="news">Hacker News</a></b></span>
<span class="pagetop">${me ? `<a id="me" href="user?id=${me}">${me}</a> | <a id="logout" href="logout?auth=t0&amp;goto=news">logout</a>` : `<a href="login?goto=news">login</a>`}</span></td></tr>
<tr id="bigbox"><td>${body}</td></tr>
</tbody></table></center></body></html>`;

const storyRows = (id, { rank, title, href, site, score, user, voted = false, signedIn = true, comments = "12&nbsp;comments" }) => `
<tr class="athing submission" id="${id}">
  <td class="title"><span class="rank">${rank}.</span></td>
  <td class="votelinks"><center>${signedIn
    ? `<a id="up_${id}" class="clicky${voted ? " nosee" : ""}" href="vote?id=${id}&amp;how=up&amp;auth=tok${id}&amp;goto=news"><div class="votearrow" title="upvote"></div></a>`
    : `<a id="up_${id}" href="vote?id=${id}&amp;how=up&amp;goto=news"><div class="votearrow" title="upvote"></div></a>`}</center></td>
  <td class="title"><span class="titleline"><a href="${href}">${title}</a>${site ? ` <span class="sitebit comhead">(<a href="from?site=${site}"><span class="sitestr">${site}</span></a>)</span>` : ""}</span></td>
</tr>
<tr><td colspan="2"></td><td class="subtext"><span class="subline">
  <span class="score" id="score_${id}">${score}</span> by <a href="user?id=${user}" class="hnuser">${user}</a>
  <span class="age" title="2026-11-08T08:00:00"><a href="item?id=${id}">3 hours ago</a></span>
  ${voted ? `| <a id="un_${id}" class="clicky" href="vote?id=${id}&amp;how=un&amp;auth=tok${id}&amp;goto=news">unvote</a>` : ""}
  | <a href="hide?id=${id}&amp;goto=news">hide</a> | <a href="item?id=${id}">${comments}</a>
</span></td></tr>
<tr class="spacer" style="height:5px"></tr>`;

const feedPage = ({ signedIn = true } = {}) => layout(`<table><tbody>
${storyRows("1001", { rank: 1, title: "A  story\n about parsers", href: "https://example.com/parsers", site: "example.com", score: "120 points", user: "bob", signedIn })}
${storyRows("1002", { rank: 2, title: "Ask HN: Text posts?", href: "item?id=1002", score: "40 points", user: "carol", voted: signedIn, signedIn, comments: "discuss" })}
<tr class="morespace"></tr><tr><td colspan="2"></td><td class="title"><a href="?p=2" class="morelink" rel="next">More</a></td></tr>
</tbody></table>`, { me: signedIn ? "alice" : null });

const commentRow = (id, { indent, parent, user, text, voted = false, userClass = true }) => `
<tr class="athing comtr" id="${id}"><td><table><tbody><tr>
  <td class="ind" indent="${indent}"><img src="s.gif" height="1" width="${indent * 40}"></td>
  <td class="votelinks"><center><a id="up_${id}" class="clicky${voted ? " nosee" : ""}" href="vote?id=${id}&amp;how=up&amp;auth=tok${id}&amp;goto=item%3Fid%3D2001"><div class="votearrow"></div></a></center></td>
  <td class="default"><div style="margin-top:2px; margin-bottom:-10px;"><span class="comhead">
    <a href="user?id=${user}"${userClass ? ' class="hnuser"' : ""}>${user}</a> <span class="age"><a href="item?id=${id}">1 hour ago</a></span>
    ${voted ? `<span id="unv_${id}"> | <a id="un_${id}" class="clicky" href="vote?id=${id}&amp;how=un&amp;auth=tok${id}">unvote</a></span>` : ""}
    <span class="navs">${parent ? ` | <a href="#${parent}" class="clicky">parent</a>` : ""} | <a href="#${id}" class="clicky">next</a> <a class="togg clicky" n="1" href="javascript:void(0)">[–]</a></span>
  </span></div><br><div class="comment"><div class="commtext c00">${text}</div>
  <div class="reply"><p><font size="1"><u><a href="reply?id=${id}&amp;goto=item%3Fid%3D2001%23${id}">reply</a></u></font></p></div></div></td>
</tr></tbody></table></td></tr>`;

const itemPage = () => layout(`<table class="fatitem"><tbody>
${storyRows("2001", { rank: "", title: "Show HN: A thread", href: "https://example.org/", site: "example.org", score: "8 points", user: "dave" })}
<tr><td colspan="2"></td><td><div class="toptext">Hello <i>there</i>.<p>See <a href="https://example.org/docs">docs</a>.</p></div></td></tr>
<tr><td colspan="2"></td><td><form action="comment" method="post"><input type="hidden" name="parent" value="2001"><textarea name="text"></textarea><input type="submit" value="add comment"></form></td></tr>
</tbody></table><br><table class="comment-tree"><tbody>
${commentRow("3001", { indent: 0, user: "erin", text: "Top level <code>code</code>" })}
${commentRow("3002", { indent: 1, parent: "3001", user: "frank", text: "A reply", voted: true })}
${commentRow("3003", { indent: 0, user: "grace", text: "Another one", userClass: false })}
</tbody></table><a href="item?id=2001&amp;p=2" class="morelink" rel="next">More</a>`);

const userPage = () => layout(`<table><tbody>
<tr class="athing"><td valign="top">user:</td><td timestamp="1"><a href="user?id=bob" class="hnuser">bob</a></td></tr>
<tr><td valign="top">created:</td><td><a href="front?day=2010-01-01&amp;birth=bob">January 1, 2010</a></td></tr>
<tr><td valign="top">karma:</td><td>4242</td></tr>
<tr><td valign="top">about:</td><td style="overflow:hidden;">Writes <i>parsers</i>.</td></tr>
<tr><td></td><td><a href="submitted?id=bob"><u>submissions</u></a></td></tr>
</tbody></table>`);

const parse = (html, url) => {
  const doc = parseHTML(html).document;
  if (url) Object.defineProperty(doc, "location", { value: new URL(url) });
  return doc;
};

const { readers, commands } = module;
const read = (name, doc) => readers[name].read(doc);
const call = (name, doc, args) => commands[name]({ document: doc, url: doc.location?.href ?? "", element: null, args }, args);

/** Reads a list reader the way the page agent does: items under the root, each with its key and data. */
function readList(doc, name) {
  const reader = readers[name];
  const root = doc.querySelector(reader.root);
  if (!root) return [];
  return [...root.querySelectorAll(reader.items)].map(item => ({ key: reader.key(item), data: reader.read(item), item }));
}

/** Reads a one reader: its root's data, or null without a root. */
function readOne(doc, name) {
  const reader = readers[name];
  const root = doc.querySelector(reader.root);
  return root ? reader.read(root) : null;
}

test("pages are ready on HN's layout only", () => {
  assert.equal(read("ready.hn", parse(feedPage())), true);
  assert.equal(read("ready.hn", parse("<html><body>Sorry.</body></html>")), false);
});

test("the account reader reports the name, false when signed out, and null without evidence", () => {
  assert.equal(read("account", parse(feedPage(), "https://news.ycombinator.com/")), "alice");
  assert.equal(read("account", parse(feedPage({ signedIn: false }), "https://news.ycombinator.com/")), false);
  assert.equal(read("signedOut", parse(feedPage({ signedIn: false }), "https://news.ycombinator.com/")), true);
  assert.equal(read("account", parse(feedPage(), "https://hn.algolia.com/?query=x")), null, "the search site shows no account");
  assert.equal(read("account", parse(feedPage())), null, "a page without a URL says nothing");
  // Sign-in returns to the page that needed it.
  assert.equal(signInUrl("https://news.ycombinator.com/upvoted?id=alice"), "/login?goto=upvoted%3Fid%3Dalice");
});

test("the route table keeps HN's routes in match order", () => {
  assert.equal(ROUTES.length, 29);
  assert.deepEqual(ROUTES.slice(0, 3).map(route => route.id), ["account", "search", "home"]);
  for (const id of ["account", "hidden", "upvoted", "submit", "submit-result"]) {
    assert.equal(ROUTES.find(route => route.id === id).requiresAccount, true, id);
  }
  assert.ok(whenScreen("feed").some(guard => guard.pattern === "/newest"));
  assert.equal(whenScreen("feed"), whenScreen("feed"), "one guard array per screen");
});

test("feed stories are keyed by item id and read their subtext row", () => {
  const doc = parse(feedPage());
  const stories = readList(doc, "stories");
  assert.deepEqual(stories.map(story => story.key), ["1001", "1002"]);
  assert.deepEqual(stories[0].data, {
    id: "1001", title: "A story about parsers", articleUrl: "https://example.com/parsers", domain: "example.com",
    submitter: "bob", score: "120 points", age: "3 hours ago", comments: "12 comments", rank: "1",
    canVote: true, voted: false,
  });
  assert.equal(stories[1].data.articleUrl, null, "a text post links to its own discussion");
  assert.equal(stories[1].data.comments, "discuss");
  assert.deepEqual([stories[1].data.canVote, stories[1].data.voted], [false, true]);
  // The extent is the subtext row, so a vote changing it re-reads the story.
  const extent = readers.stories.extent(stories[0].item);
  assert.ok(extent[0].querySelector(".subtext"));
  // Vote tokens stay in the page.
  assert.doesNotMatch(JSON.stringify(stories.map(story => story.data)), /auth|tok/);
});

test("the feed's more link and loadMore", () => {
  const doc = parse(feedPage());
  assert.deepEqual(readOne(doc, "more"), { url: "https://news.ycombinator.com/?p=2" });
  assert.deepEqual(call("loadMore", doc), { steps: [{ op: "click", target: { css: "a.morelink" } }], navigates: true });
});

test("setVoted clicks HN's vote link and waits for the page to show the vote", () => {
  const doc = parse(feedPage());
  const up = call("setVoted", doc, { id: "1001", voted: true });
  assert.deepEqual(up.steps, [{ op: "click", target: { css: '[id="up_1001"]' } }]);
  assert.equal(up.until(doc), false);
  doc.querySelector('[id="up_1001"]').classList.add("nosee");
  assert.equal(up.until(doc), true);
  assert.deepEqual(call("setVoted", doc, { id: "1001", voted: true }), { satisfied: true });
  assert.deepEqual(call("setVoted", doc, { id: "1002", voted: false }).steps, [{ op: "click", target: { css: '[id="un_1002"]' } }]);
  assert.throws(() => call("setVoted", doc, { id: "1001" }), /voted: boolean/);
  assert.throws(() => call("setVoted", doc, { id: "x]", voted: true }), /Not a Hacker News item/);
});

test("setVoted refuses when HN shows no vote link to click", () => {
  const doc = parse(feedPage({ signedIn: false }));
  const [first] = readList(doc, "stories");
  assert.equal(first.data.canVote, true, "HN shows arrows to signed-out readers; the screen hides them");
  assert.deepEqual(call("setVoted", doc, { id: "1001", voted: false }), { satisfied: true });
  first.item.querySelector('[id="up_1001"]').remove();
  assert.throws(() => call("setVoted", doc, { id: "1001", voted: true }), /cannot be upvoted/);
});

test("an item page reads its head, a keyed thread with parents and depths, and its more link", () => {
  const doc = parse(itemPage());
  const head = readOne(doc, "story");
  assert.equal(head.story.title, "Show HN: A thread");
  assert.equal(head.comment, null);
  assert.equal(head.canComment, true);
  assert.deepEqual(head.text.map(part => part.text), ["Hello ", "there", ".", "\n\n", "See ", "docs", "."]);
  assert.equal(head.text[5].href, "https://example.org/docs");

  const comments = readList(doc, "item.comments");
  assert.deepEqual(comments.map(entry => [entry.key, entry.data.depth, entry.data.parent]),
    [["3001", 0, null], ["3002", 1, "3001"], ["3003", 0, null]]);
  const reply = comments[1].data;
  assert.equal(reply.author, "frank");
  assert.equal(comments[2].data.author, "grace", "the user link names the author without .hnuser");
  assert.deepEqual([reply.canVote, reply.voted, reply.canReply], [false, true, true]);
  assert.deepEqual(reply.links, [], "thread rows carry no navigation links");
  assert.deepEqual(comments[0].data.parts, [{ text: "Top level " }, { text: "code", code: true }]);
  assert.deepEqual(readOne(doc, "more"), { url: "https://news.ycombinator.com/item?id=2001&p=2" });
  assert.equal(readOne(doc, "rest"), null, "a short thread has nothing left on HN's page");

  assert.deepEqual(call("setVoted", doc, { id: "3001", voted: true }).steps, [{ op: "click", target: { css: '[id="up_3001"]' } }]);
  assert.deepEqual(call("setVoted", doc, { id: "2001", voted: true }).steps, [{ op: "click", target: { css: '[id="up_2001"]' } }]);
});

test("a user page reads the profile table", () => {
  assert.deepEqual(readOne(parse(userPage()), "profile"), {
    name: "bob", created: "January 1, 2010", karma: "4242",
    about: [{ text: "Writes " }, { text: "parsers", em: true }, { text: "." }],
  });
});

const submitPage = ({ form = true, message = "" } = {}) => layout(form
  ? `${message}<form action="/r" method="post"><input type="hidden" name="fnid" value="tok"><input type="hidden" name="fnop" value="submit-page">
<table><tbody><tr><td>title</td><td><input type="text" name="title" value="Draft"></td></tr>
<tr><td>url</td><td><input type="url" name="url" value=""></td></tr>
<tr><td>text</td><td><textarea name="text">Body</textarea></td></tr>
<tr><td></td><td><input type="submit" value="submit"></td></tr></tbody></table></form><script>tlen()</script>`
  : `<b>Login</b><form action="login" method="post"><input type="text" name="acct"></form>`, { me: null });

test("the submit page reads HN's form and the message above it", () => {
  assert.deepEqual(readOne(parse(submitPage()), "form"), { title: "Draft", url: "", text: "Body", error: null });
  const rejected = readOne(parse(submitPage({ message: "That's not a valid url." })), "form");
  assert.equal(rejected.error, "That's not a valid url.");
  // The page has no top bar; the form says nothing about the account, and HN's login form means signed out.
  assert.equal(read("account", parse(submitPage(), "https://news.ycombinator.com/submit")), null);
  assert.equal(read("account", parse(submitPage({ form: false }), "https://news.ycombinator.com/submit")), false);
});

test("setField fills one of HN's fields and submit posts HN's form", () => {
  const doc = parse(submitPage());
  assert.deepEqual(call("setField", doc, { name: "title", value: "Draft" }), { satisfied: true });
  const fill = call("setField", doc, { name: "url", value: "https://example.com" });
  assert.deepEqual(fill.steps, [{ op: "fill", target: { css: "form[action='/r'] [name='url']" }, value: "https://example.com" }]);
  assert.throws(() => call("setField", doc, { name: "fnid", value: "x" }));
  assert.throws(() => call("setField", doc, { name: "title", value: "x".repeat(81) }));
  assert.deepEqual(call("submit", doc), { steps: [{ op: "submit", target: { css: "form[action='/r']" } }], navigates: true });
  assert.throws(() => call("submit", parse(submitPage({ form: false }))), /no submit form/);
});

test("the account page reads the name and karma, and signOut follows HN's logout link", () => {
  const doc = parse(layout("").replace("</a> | <a id=\"logout\"", '</a> (<span id="karma">7</span>) | <a id="logout"'));
  assert.deepEqual(readOne(doc, "account.profile"), { name: "alice", karma: "7" });
  assert.deepEqual(call("signOut", doc), { steps: [{ op: "click", target: { css: "a#logout" } }], navigates: true });
  const out = parse(layout("", { me: null }));
  assert.equal(readOne(out, "account.profile"), null);
  assert.deepEqual(call("signOut", out), { satisfied: true });
});

test("information pages read their text, and only HN's layout shows the account", () => {
  const guidelines = parse(`<html><head><title>Hacker News Guidelines</title></head><body><center><table><tr><td><b>Hacker News Guidelines</b></td></tr><tr><td><br><br>
<p>Be kind. Don't
be snarky.</p><p> </p><p><i>Thanks</i> <b>all</b>.</p></td></tr></table></center></body></html>`, "https://news.ycombinator.com/newsguidelines.html");
  assert.equal(read("ready.info", guidelines), true);
  assert.equal(read("account", guidelines), null);
  assert.equal(read("account", parse(feedPage(), "https://news.ycombinator.com/lists")), "alice");
  const sections = readOne(guidelines, "sections");
  assert.equal(sections.title, "Hacker News Guidelines");
  // One break per run, wrapped lines joined, the repeated title dropped, spaces between words kept.
  assert.deepEqual(sections.parts, [
    { text: "Be kind. Don't be snarky." }, { text: "\n\n" },
    { text: "Thanks", em: true }, { text: " " }, { text: "all", strong: true }, { text: "." },
  ]);
});
