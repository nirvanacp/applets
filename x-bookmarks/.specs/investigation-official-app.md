# Investigation: the official X Android app

Problem ID: x-official-app-parity
Problem: Make the X applet look and feel like the official X Android app
Spirit animal: 🦜 Parrot

Explored on 2026-11-19 on a physical Android phone (1080 × 2340, light theme), official app 12.44.0, signed in to a test account that follows a few accounts and has no posts of its own. Screenshots stay outside the repositories. This record holds no handles, names or post text.

## Shell and navigation

- **Bottom tabs:** Home, Explore, Grok, Notifications, Messages. The current tab shows a filled icon. Unread tabs carry a small blue dot. No labels.
- **Top bar on Home:** the account avatar on the left opens the drawer, the X logo sits in the middle, and a follow-people icon is on the right.
- **Feed tabs under the top bar:** For you ▾, Following, then the user's pinned lists, then Add +. The current tab has a blue underline. A swipe moves between tabs.
- **Hiding on scroll:** scrolling down slides the top bar, the feed tabs and the bottom bar away. The first upward scroll brings them back. Only the compose button stays on screen.
- **New posts pill:** a blue pill with three small avatars and "Posted" floats under the top bar when the feed has newer posts. A tap scrolls to the top and shows them.
- **Reselecting Home** scrolls to the top and refreshes.
- **Compose button:** a round blue "+" at the bottom right. A tap opens the composer.
- **Drawer:** an account header with avatar, name, handle and Following and Followers counts. Entries: Profile, Premium, Calls, Communities, History, Lists, Spaces, Creator Studio, Settings and privacy, Help Center, and a display toggle at the foot.
- **Back:** closes a sheet or the drawer first, then pops to the previous screen at the same scroll position. Back on a Home tab other than For you goes to For you; Back on For you leaves the app.

## Post row

- Avatar (40 dp, round), then the name in bold, the verified badge, the handle and the relative time ("34m", "7h", "Nov 12") in grey. A Grok icon and ⋮ sit on the right.
- "Reposted by" and "Pinned" lines above the author, with a small icon.
- Text up to about 10 lines, then "Show more". Links, mentions and hashtags in blue.
- **Media:** photos sit in a rounded grid (1 full width at its aspect ratio, 2 side by side, 3 as one large and two small, 4 as a 2 × 2 grid). Videos and GIFs play inline at their aspect ratio. A quoted post shows as a rounded bordered card with its own author line, text and media thumbnail.
- **Action row:** reply, repost, like and view counts, then bookmark and share. Counts use the short form (1.2K). Like turns pink with a small burst, repost green, bookmark blue. Every action answers at once.
- Tap on the row opens the post detail. Tap on the avatar or name opens the profile. A long press does nothing special.

## Video

- **Inline autoplay, muted.** A video in the feed starts playing on its own, without sound, as soon as most of it is on screen, and pauses when it scrolls away. Only one video plays at a time. A mute toggle sits bottom right, and the time left sits bottom left. A source line can sit under the video.
- **GIFs** loop without sound and carry a "GIF" label.
- **Immersive player:** a tap on a video opens it full screen with sound, on black. It has Back and ⋮ at the top. At the bottom are the author with Follow, the caption, pill buttons for reply, repost, like, bookmark and share, a scrubber, play and pause, the time left, playback speed, mute and a picture-in-picture button. Swiping up moves to the next video from a video feed; swiping down or Back returns to the feed at the same post.
- The settings under Accessibility, display and languages → Data usage hold "Video autoplay" (on cellular or Wi-Fi, Wi-Fi only, never). The test account uses the default.

## Actions

- **Reply** opens the composer with "Replying to" the author.
- **Repost** opens a bottom sheet over a dimmed feed with Repost and Quote. After a repost, the same sheet offers Undo repost.
- **Like** toggles at once, with a pink filled heart and a pop.
- **Bookmark** toggles at once. A toast says "Added to your Bookmarks" with an action to add the post to a folder.
- **Share** opens a sheet with Copy link, Share via…, and direct targets.
- **⋮ overflow sheet:** Not interested, Unfollow, Add or remove from Lists, Mute, Block, Report post, Request Community Note, View post interactions, View hidden replies.

## Post detail

- Top bar: Back, the title "Post", and a Grok button. No bottom tabs.
- The author row has Follow or Subscribe and ⋮. The text is larger than in the feed. The media is full width. Then "time · date · N Views", the action row with counts, and a bookmark count.
- Replies follow, sorted by "Relevant ▾", with "View quotes". A reply thread is joined by a vertical line between avatars, and "Show replies" opens hidden branches.
- A pinned bar at the bottom says "Post your reply", with the avatar and photo and GIF buttons, and grows into the composer when tapped.
- When the post is a reply, its parent posts sit above it, joined by the thread line.

## Explore and search

- Top bar: the avatar, a rounded "Search" pill and a settings gear.
- Tabs: For you or Explore, Trending, News, Sports, Entertainment.
- Rows: a news story shows its title in bold, a line of three small avatars, "Trending now · News · N posts" and a square thumbnail on the right. A trend shows "Trending in <place>", the trend in bold, an optional post count and ⋮.
- Tapping Search opens a full-screen search with recent searches and typeahead suggestions for people and topics. Results have the tabs Top, Latest, People, Media and Lists.

## Notifications

- Top bar: the avatar, the title "Notifications" and a gear.
- Tabs: All, Verified, Mentions.
- A row has an icon on the left (a heart for likes, arrows for reposts, a person for follows, a bell or the Community Notes logo for others), a line of small avatars, a bold line ("<name> and 3 others liked your post"), and the post text in grey. Mentions and replies show as full post rows with actions.

## Messages

- The Messages tab now opens X Chat, which asks the user to set up a passcode before the inbox shows. This was not explored, because setting a passcode changes the account's security.

## Profile

- A banner with round, translucent Back, search and ⋮ buttons over it. The large avatar overlaps the banner's lower edge.
- Edit profile, or Follow and a message button, as pill buttons on the right of the avatar.
- Name, verified badge, handle, bio, location, link, birth and join dates, then Following and Followers counts in bold.
- Tabs: Posts, Replies, Highlights, Articles, Media, Likes, scrollable, with the blue underline. Posts lists pinned first.
- The banner shrinks into a top bar with the name and post count as the profile scrolls.

## Composer

- Opens as a full screen over the feed, with the keyboard already up and the field focused.
- Top bar: an X close, and a blue "Post" pill that stays dimmed until the text is valid. Drafts sit under a "Drafts" button.
- The avatar and "What's happening?", then "Everyone can reply" with a globe.
- The toolbar above the keyboard: photo, camera, GIF, poll, location, a circle that fills as the text nears the limit, and "+" to add a post to a thread.
- Closing with text asks whether to save or delete the draft.

## Lists, Bookmarks and other surfaces

- Bookmarks open from the drawer or the profile, as a plain post list with a search, and folders on Premium accounts.
- Lists open from the drawer. A list has a header card with members and followers, and its posts as a feed.

## Motion

- Screens push from the right and pop to the right. Sheets rise from the bottom over a dimmed screen. Tabs swap without an animation. The bars slide away on scroll.
- Pull to refresh on every feed shows the circular spinner under the top bar.
- Posts load on their own as the user nears the end of the feed. There is never a "Show more" button for the feed. A small spinner shows at the foot while the next page loads.

## Observed and assumed

Observed on the device in this session: the shell, tabs, top bars and drawer; hiding on scroll and the new posts pill; the post row and photo grid; muted inline autoplay (confirmed by comparing frames) and the immersive player with swipe to the next video; the repost, overflow and share sheets; the post detail with threaded replies and the reply bar; Explore, Notifications and the X Chat passcode gate; the own profile; the composer.

Taken from the app's usual behavior and not checked in this session: the Back rules between feed tabs, the video autoplay setting's location, search typeahead and result tabs, profile tabs other than the own profile's, the shrinking profile banner, the bookmark toast, the draft prompt, Lists and Bookmarks screens, and autoload at the end of the feed. Verify each one on the device before building on it.

## Core journeys

1. Open the app and read Home, with videos playing as they pass.
2. Switch between For you and Following.
3. Like, repost, bookmark and share a post from the feed.
4. Open a post, read its replies and reply to it.
5. Open a video full screen and page through videos.
6. Open a photo and swipe between photos.
7. Open a profile and read its posts and media.
8. Search, then open a result.
9. Read notifications and open one.
10. Write and send a post.
