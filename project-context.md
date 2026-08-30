# Project Context

> **Last reviewed:** 2026-09-01
>
> This document describes the current implementation of the project, including the recent Chat Scene UI work, mobile composer keyboard behavior, smart compact chat header, presence behavior hardening, password-manager-resistant Chat PIN lock implementation, GIPHY GIF integration, silent Bhatari identity Telegram ping (Bhandhari ping removed), Bhandhari Telegram analytics (enter/leave with duration, single leave), presence-dot multi-session fix, and the date-divider/unread-navigation upgrade. It is documentation only; changing this file does not change application behavior.

---

## 1. Project Summary

**For Penguin** is a private, personalized birthday-surprise website for Bhatari and Bhandhari. It presents a short cinematic journey and ends with a real-time two-person chat.

### Current scene flow

1. Password screen
2. Image Ladder — three personal photos
3. Envelope Letter — interactive envelope and fullscreen letter
4. Chat Scene — PIN-protected real-time chat

The Chat Scene can also be opened directly from the Image Ladder using **Go to Chat Screen**.

### Technology

- Static HTML, CSS, and vanilla JavaScript
- Firebase Firestore loaded dynamically when the Chat Scene opens
- Cloudinary unsigned uploads for chat photos and videos
- Telegram Bot API for the **Notify Bhatari** action
- Google Fonts for the display typefaces
- No framework, package manager, build step, backend server, or automated test suite

---

## 2. Repository Map

| Path | Responsibility |
|---|---|
| `index.html` | Complete page structure, overlays, scenes, and chat markup |
| `style.css` | All layout, colors, typography, responsive rules, animations, and chat styling |
| `script.js` | Password/PIN logic, scene controller, Firebase chat, media, presence, receipts, reactions, and UI interactions |
| `images/` | Ladder photos in JPG and WebP formats, including 640px variants |
| `songs/song1.mp3` | Currently unused audio asset |
| `instructions.md` | Repository workflow and Git requirements |
| `task.md` | Historical planning document for the Chat Scene revamp |
| `project-context.md` | This current technical and product reference |

The project is served as static files. A local server such as `python3 -m http.server` is sufficient for development.

---

## 3. Application Flow

### Initial load

- `DOMContentLoaded` initializes the main password overlay.
- The password is checked by hashing the entered value with SHA-256 and comparing it with a client-side hash.
- Three failed attempts cause a short session-based lockout.
- After success, the main content fades in and the `SceneController` starts the Image Ladder.

### Scene controller

`SceneController` manages these scene IDs:

```text
scene-ladder → scene-envelope → scene-chat
```

The controller adds and removes `scene-active` and `scene-exit` classes. Scene transitions use opacity and scale animations. Entering the Chat Scene initializes the chat layout and preloads Firebase.

### Privacy re-lock

When the browser tab becomes hidden:

- A blackout layer is shown.
- Chat listeners and presence are torn down.
- Media uploads and the lightbox are closed.
- The selected identity is cleared.
- The chat PIN is required again.

When the tab becomes visible again, the main password screen is shown and the experience resets to the first scene.

This is intentional privacy behavior, but it creates a longer re-entry flow.

---

## 4. Chat Scene Structure

`#scene-chat` contains three main layers:

### Access layers

- `#chat-lock-overlay` — four-digit on-screen PIN keypad
- `#chat-identity-overlay` — required Bhatari/Bhandhari identity selection after the PIN

### Chat layout

- `.chat-header`
  - `.presence-dot`
  - `.chat-title`
  - `#notify-bhatari-btn`
  - `#chat-identity-toggle`
- `#chat-messages` — scrollable message list
- `#chat-typing-bar` — typing status outside the message scroll area
- `#chat-scroll-fab` — scroll-to-latest control and unread count
- `#chat-reply-container` — reply preview above the composer
- `#chat-attachment-container` — upload preview, progress, retry, and cancel controls
- `#chat-gif-preview` — selected GIPHY GIF preview awaiting explicit Send
- `.chat-input-bar`
  - `#chat-plus-btn` — unified add control
  - `#chat-add-menu` — attachment/GIF options menu
  - `#chat-input`
  - `#chat-send-btn`
  - `#chat-status`

### Body-level overlays

These live outside the transformed scene elements so fixed positioning works correctly:

- `#chat-lightbox` — fullscreen photo/video viewer, including sent GIFs
- `#msg-info-overlay` — message information bottom sheet opened by long-pressing a sent message
- `#chat-gif-picker` — accessible responsive GIPHY picker with trending/search results

---

## 5. Current Chat UI Behavior

### Viewport and responsive layout

- `#scene-chat` uses the visible viewport variables `--vv-top` and `--vv-height` when available.
- `visualViewport` listeners update the chat height when browser controls or the mobile keyboard changes the visible area.
- `viewport-fit=cover` is present in the viewport meta tag.
- The Chat Scene itself no longer adds a second top safe-area inset; the header owns that spacing.
- The compact header preserves the top safe-area inset while scrolling.
- On narrow screens up to 600px, the header uses two rows while the keyboard is closed:
  - title and notification control
  - full-width identity selector
- While the mobile keyboard is open, the header switches to a compact single row so more messages remain visible.
- The compact row keeps the presence indicator, Chat Screen title, both identity choices, and the notification control visible; the notification label becomes icon-only to save horizontal space.
- The title is left-aligned beside the presence indicator. The notification control stays on the right.
- The mobile chat container follows the height of the Chat Scene instead of introducing another independent viewport height.

### Header

- The title currently reads **Chat Screen**.
- The presence indicator is a small dot whose state is updated by Firebase presence data.
- The Notify button is only shown for the Bhandhari identity and has an accessible label/title.
- The identity toggle uses a sliding glider and colored identity dots.
- Notification text has a minimum width and does not wrap during its cooldown state.
- In the keyboard-open compact state, Notify Bhatari becomes a 36px icon button while preserving its action, disabled/loading state, and accessibility label.
- The identity glider is repositioned through a `ResizeObserver` when the compact layout changes the toggle dimensions.

### Message list

- Messages are displayed in ascending timestamp order.
- The live listener currently loads only the most recent 20 messages.
- Messages are grouped into per-day `.chat-day` sections (keyed by `day-Y-M-D`) so the sticky date divider pins only while its own day is in view and is pushed out by the next day's section.
- Date dividers are inserted for calendar-day boundaries, carry their day timestamp and an accessible `role="separator"` label, and show the year once a conversation spans more than one year.
- Labels re-derive after a local midnight passes while the tab is open: a self-rescheduling timer fires shortly after midnight and refreshes every label (with the pop animation) through the idempotent reconcile pass. The timer is cleared on privacy re-lock.
- Consecutive messages from the same sender within five minutes are grouped visually, but a day boundary always breaks a grouping run.
- The message list now keeps only a small gap below the latest message because the composer is a normal flex sibling, not an overlay.
- A sticky date divider, skeleton loader, empty state, typing state, unread count, and **New messages** divider are supported. With unread messages, the scroll FAB first jumps to the oldest missed message and flash-highlights it (reusing the quote-jump highlight); the plain glide-to-bottom remains when nothing is unread.

### Message bubbles

- Bhatari messages are left-aligned on a raised dark-glass surface.
- Bhandhari messages are right-aligned on a richer purple gradient.
- Sent text bubbles have a subtle top sheen, clearer edge, stronger metadata contrast, and slightly more depth.
- Received bubble borders and metadata are brighter so they do not disappear into the dark background.
- Sender labels, timestamps, edited labels, reply previews, and delivery ticks have been made more readable.
- Bubble tails use small rounded, rotated shapes rather than sharp triangular wedges.
- Only the first bubble in a grouped run shows a tail. Media bubbles do not show tails.
- Media bubbles use Cloudinary thumbnails and open images in the lightbox.
- GIF bubbles use sanitized GIPHY metadata, lazy loading, stable dimensions, validated HTTPS GIPHY hosts, accessible alt text, runtime-only media URLs, retry placeholders, and the existing lightbox path.

### Bubble actions

Reply and Edit controls are hidden by default to keep the conversation clean.

They become visible when:

- A message is tapped.
- A message receives keyboard focus.
- A desktop pointer hovers over a message.

Tapping a different message closes the previous action row. Pressing Escape closes the active action row. Existing Reply, Edit, quote, reaction, media, and long-press behavior remains separate from the action-row reveal.

Message bubbles are keyboard-focusable so hidden actions remain discoverable without relying only on touch gestures.

### Composer

- The composer is an auto-growing textarea capped at 140px.
- On touch/mobile devices, the keyboard Return/Enter key inserts a new line, matching the mobile chat behavior; messages are sent with the explicit Send button.
- On desktop, an unmodified Enter sends a message; Shift+Enter inserts a new line everywhere.
- The textarea uses `enterkeyhint="enter"` to request a newline/Return action from mobile keyboards.
- The send button is disabled and visually muted when there is no text, no ready attachment, or no selected identity.
- The send button becomes active when text or a completed attachment is available.
- Uploading an attachment keeps sending disabled until the upload is ready.
- The attachment and send buttons are 44px on small screens.
- Reply-cancel and attachment retry/cancel controls use larger touch areas.
- The mobile input remains at 16px to avoid browser zoom when focused.
- The composer uses bottom safe-area padding for devices with a home indicator.
- One animated plus button opens the `#chat-add-menu` with Photo/video and GIF options; selecting a GIF fills `#chat-gif-preview` and never sends immediately.
- GIFs and Cloudinary attachments are mutually exclusive in the composer. GIFs are sent only through the explicit Send button.
- The picker loads G-rated standard GIFs from GIPHY Trending/Search with a 300ms debounced search, direct browser requests, request timeout/abort handling, stale-run guards, retry/error/empty/offline states, and a mobile bottom-sheet layout.
- The picker has managed focus, Escape/outside dismissal, focus restoration, reduced-motion styles, lazy result images, fixed grid rows, an internal scroll area, and stable result dimensions. Load more appends new rows and smoothly reveals the newly loaded area instead of overlapping existing tiles.

---

## 6. Chat Interactions and Features

### Chat PIN

- The PIN is a four-digit access code entered through the existing on-screen keypad; there is no password-like, hidden, readonly, or off-screen input element.
- Digits exist only in the runtime `chatState.pinInput` buffer. They are cleared after success, failure, lockout, hiding, relocking, scene teardown, and page teardown, and are never written to DOM text, accessibility labels, URLs, logs, analytics, or storage.
- Clear, delete-last-digit, and hardware-keyboard controls are supported. Digit keys include the main keyboard and numpad; Backspace and Delete remove one digit; Escape clears the current entry; Enter verifies a complete four-digit entry. Tab is trapped within the accessible lock dialog.
- The lock overlay is a modal dialog with managed focus, keypad labels, a digit-count announcement, busy state, and separate polite/assertive status messaging. It cannot be dismissed with Escape or bypassed through focus changes.
- Input is bounded to ASCII digits and exactly four positions. Rapid taps, duplicate clicks, duplicate verification, malformed input, paste, autofill, and IME composition do not add unvalidated data or start duplicate checks.
- SHA-256 verification runs asynchronously with a run ID so stale results cannot unlock a hidden, reset, or torn-down scene. Verification failures clear the buffer and do not expose exception details.
- Three failed attempts trigger a 15-second lockout. Only attempt count, timestamp, and lockout expiry may be recorded in local/session storage for short-lived throttling; the PIN is never persisted. Expired or malformed lockout records are discarded.
- Reloads, page visibility changes, scene teardown, and browser Back/Forward navigation invalidate pending checks and clear the runtime PIN. A history guard prevents locked Chat Scene navigation from bypassing the PIN; successful unlock removes that guard.
- PIN success hides the PIN overlay but always requires identity selection afterward.

### Identity selection

The user must choose **Bhatari** or **Bhandhari** after the PIN. The choice is not persisted across privacy re-locks.

The selected identity controls:

- Message alignment and ownership
- Which Edit controls are shown
- Delivery/read tick ownership
- Typing document key
- Presence document key
- Whether Notify Bhatari is visible

Whenever **Bhatari** becomes the active identity, a silent background Telegram ping is fired (see below). Bhandhari no longer uses the `🐧 She just chose Bhandhari` ping — it now uses only the analytics enter/leave pair (see below). Both happen for the post-PIN “Who are you?” overlay and the header identity toggle.

### Silent identity ping (Bhatari only)

When Bhatari is selected, `notifyBhatariSelected()` sends a fire-and-forget Telegram message (`✨ Bhatari Identity is chosen · <IST timestamp>`) to the owner’s chat using the same bot token as **Notify Bhatari**. `notifyBhandhariSelected()` (`🐧 She just chose Bhandhari`) is retained in code but no longer called from `applyIdentityUI()` — Bhandhari is tracked via `🟢`/`🔴` analytics only. The ping is deliberately invisible to the device user:

- No DOM change, no toast, no button disable/relabel, and no loading or cooldown state.
- Errors are swallowed; nothing is logged or surfaced.
- Uses `keepalive: true` so the request lands even if the tab is closed right after the tap.
- A 60-second client cooldown (`IDENTITY_PING_COOLDOWN_MS`, `identityPingLastSentAtBhatari`) collapses rapid re-selections (relock + re-pick, toggle bounce).
- Fires only for Bhatari via `applyIdentityUI()`.

### Real-time messages

Messages are stored in the Firestore collection:

```text
web_chat_v2
```

The listener uses `orderBy('timestamp', 'asc').limitToLast(20)`.

Messages are reconciled in place instead of rebuilding the entire list. Pending writes are shown with a pending state until Firestore confirms them.

### Typing indicator

Typing status is stored in:

```text
typing/status
```

The current identity writes its own status. The other identity is shown in a dedicated bar above the composer when the status is fresh.

### Presence

Presence status is stored in:

```text
presence/status
```

The active identity writes a heartbeat approximately every 25 seconds. The other identity is treated as offline when every matching heartbeat is older than approximately 75 seconds.

Presence data keeps the legacy top-level `Bhatari`/`Bhandhari` fields for compatibility and also stores per-tab/session entries under `sessions`. A unique session ID prevents multiple tabs using the same identity from incorrectly marking one another offline. Writes use `sessions.<sessionId>` dot-notation with `merge:true` so concurrent heartbeats from two users/tabs preserve each other (previously `sessions: { [sessionId]: ... }` overwrote the whole map and made the other side appear offline while chatting). Manual identity switches stop the old session and start a fresh session for the new identity.

The presence lifecycle uses visibility cleanup, `pagehide`, and `beforeunload` as best-effort offline paths, skips heartbeats while hidden/offline, and immediately resumes a heartbeat after network recovery. Stale listeners and writes are ignored after a presence restart.

The header dot has explicit unknown, checking, unavailable, offline, and online states. It is green (`#4ade80` with `presencePulse 2.4s infinite`, `style.css:5211`) only when at least one matching fresh heartbeat exists; it is muted for missing, stale, invalid, unavailable, or disconnected presence data. Offline sessions are kept as `online:false` entries and ignored by `isFreshPresenceEntry()`.

### Replies

- A Reply action opens the reply preview above the composer.
- Reply previews are built with DOM elements and `textContent`.
- Reply quotes inside message bubbles are keyboard-focusable.
- Selecting a quote scrolls to the original message and briefly highlights it.
- If the original message is outside the last-20 window, an informational toast says it is unavailable.

### Editing

- Only messages belonging to the selected identity can be edited.
- Edit uses an inline textarea with a 2,000-character limit.
- Empty and unchanged edits are rejected.
- Save and Cancel controls are available, along with Escape-to-cancel and Enter-to-save behavior.
- Edited messages show an `(edited)` label.

### Reactions

- Double-tapping a received text message toggles a purple-heart reaction.
- Own messages, pending messages, media messages, links, quotes, and action buttons are excluded from the double-tap reaction handler.
- Only one reaction slot is supported per message.

### Read receipts

Messages use a `readBy` map:

```js
{
  Bhatari: Timestamp,
  Bhandhari: Timestamp
}
```

A received message is considered read after enough of its bubble is visible for a short dwell period. Own messages are never marked as read by the same identity.

Own message ticks show:

```text
pending → ✓ sent → ✓✓ read
```

Long-pressing an own sent message opens the Message Info sheet with its sent time and read information.

### Media

Cloudinary is used for unsigned image and video uploads.

- Images: maximum 25 MB
- Videos: maximum 100 MB
- Upload progress is shown in the attachment strip.
- Failed uploads can be retried.
- Images use a fullscreen lightbox.
- Videos use a custom inline player with lazy playback, poster image, progress, mute, and fullscreen controls.
- Cloudinary URLs are accepted only for Cloudinary image/video records. GIF records use a separate sanitized GIPHY provider path and never route media through Cloudinary.
- GIF Firestore records prefer the GIPHY ID plus rendition/dimension/title metadata; direct GIPHY media URLs remain runtime-only and visible history hydrates them with de-duplicated GIPHY ID lookups when configured.

### Scroll and unread behavior

- The scroll-to-latest button appears when the user is far from the bottom.
- Missed incoming messages increase the unread count when the user is scrolled up or when the Chat Scene is not active.
- The unread count appears on the scroll button and is capped at `99+`.
- A **New messages** divider appears above the first missed message.
- With unread messages, tapping the scroll button first jumps to the oldest missed message and flash-highlights it; the divider and badge persist until the bottom is actually reached. With nothing unread, the button keeps its plain glide-to-bottom and clears the unread state.
- Reaching the bottom or pressing the scroll button (bottom path) clears the unread state.

---

## 7. Current Data Shape

A current message can contain:

```js
{
  sender: 'Bhatari' | 'Bhandhari',
  text: String,
  timestamp: Firestore Timestamp,
  replyTo: {
    id: String,
    sender: String,
    text: String
  } | null,
  isEdited: Boolean,
  editedAt: Firestore Timestamp | null,
  media: {
    type: 'image' | 'video',
    publicId: String,
    url: String,
    width: Number,
    height: Number,
    duration: Number | null,
    format: String,
    bytes: Number
  } | null,
  readBy: {
    Bhatari: Firestore Timestamp,
    Bhandhari: Firestore Timestamp
  },
  reaction: {
    by: 'Bhatari' | 'Bhandhari'
  } | null
}
```

For a GIPHY GIF, `media` is a separate sanitized representation rather than a Cloudinary URL record:

```js
media: {
  type: 'gif',
  provider: 'giphy',
  providerId: String,
  rendition: 'fixed_width' | 'fixed_width_small' | 'fixed_height' | 'downsized_medium' | 'original',
  width: Number,
  height: Number,
  title: String,
  alt: String,
  rating: 'g'
}
```

GIPHY media URLs are kept in the runtime-only metadata map and are not written to Firestore. Historical visible GIFs hydrate by GIPHY ID with request de-duplication; without a configured key they show an unavailable placeholder.

Older documents may contain `readBy` as an array. The current code normalizes legacy arrays in memory and migrates them when a read receipt is written.

---

## 8. External Services and Configuration

### Firebase

Firebase is loaded dynamically from the Google CDN when Chat opens. The web configuration is present in `script.js`. Actual access control depends on Firebase Security Rules, which are not stored in this repository.

The application uses:

- Firestore collection `web_chat_v2`
- Firestore document `typing/status`
- Firestore document `presence/status`

### Cloudinary

The client contains the Cloudinary cloud name and unsigned upload preset. The Cloudinary API secret must never be placed in client code.

### GIPHY

GIPHY is called directly from the browser because this application is static. `GIPHY_API_KEY` in `script.js` contains the owner-supplied visible web key and should be replaced if rotated; it is not a server secret. Requests use the Trending and Search endpoints with `rating=g`, `bundle=messaging_non_clips`, and no analytics/action-register calls. Stickers and Clips are excluded.

The implementation avoids Cloudinary and avoids persisting/copying media binaries. Firestore stores the GIPHY ID plus rendition metadata where possible; direct media URLs remain runtime-only and visible history hydrates by ID. The official GIPHY documentation requires conspicuous “Powered By GIPHY” attribution for API integrations, but the product requirement currently rejects visible attribution. This is an unresolved terms/compliance conflict and must be resolved before production use; the current UI does not silently claim compliance.

### Telegram

The Notify Bhatari action calls the Telegram Bot API directly from the browser. The same bot token is also used by the silent Bhatari identity ping fired on Bhatari selection (`notifyBhatariSelected()` `✨`) and by the Bhandhari analytics pings (enter `🟢 Bhandhari entered chat` + single leave `🔴 Bhandhari left chat · stayed <duration>` via `notifyBhandhariAnalyticsEnter()` / `notifyBhandhariAnalyticsExit()` — 2 fire-and-forget messages per Bhandhari session, `GET` `keepalive` + single `sendBeacon` fallback to avoid CORS preflight and duplicate leaves on unload). The Bhandhari `🐧 She just chose Bhandhari` ping (`notifyBhandhariSelected()`) is no longer sent. The bot token is currently hardcoded in client-side JavaScript and should be treated as exposed. It should be rotated and moved behind a server-side endpoint before any public or production use.

---

## 9. Security and Privacy Notes

The password and Chat PIN are checked by comparing a SHA-256 hash in the browser. This is casual obscurity, not server-enforced authentication. Anyone with developer tools can inspect or bypass the client-side gate. The Chat PIN specifically uses a custom keypad and memory-only digit buffer to avoid presenting a credential-like field to password managers; this cannot control every third-party extension's heuristics.

The Chat PIN lockout metadata may use local/session storage for a short-lived attempt window, but it contains no PIN or entered digits. The client also invalidates stale asynchronous checks and clears the runtime buffer across success, failure, lockout, visibility, page, scene, and history transitions.

The identity selector is also a UI choice, not an authorization boundary. A visitor who passes the client-side gates can choose either identity unless Firestore Rules enforce stronger controls.

Selecting Bhatari silently notifies the owner over Telegram (`✨ Bhatari Identity is chosen` via `notifyBhatariSelected()`). Selecting Bhandhari now sends only the analytics pair (`🟢 Bhandhari entered chat` on entry and single `🔴 Bhandhari left chat · stayed <duration>` on exit via `GET` + single `sendBeacon` fallback) — the previous `🐧 She just chose Bhandhari` ping is removed. This is invisible to the device user, so treat it as a privacy-relevant behavior: anyone with developer tools can observe or block the requests, and the exposed bot token makes the pings spoofable.

GIPHY receives only the user's GIF search query and uses a browser-visible API key. Chat text, identities, PIN data, Firestore documents, and Cloudinary uploads are not sent to GIPHY by the GIF feature. The supplied key should be treated as exposed and rate-limited by the provider.

Important security items:

1. Rotate the exposed Telegram bot token.
2. Verify Firestore Rules for `web_chat_v2`, `typing/status`, and `presence/status`.
3. Do not assume the client-side password, PIN, or identity choice provides real authorization.
4. Keep all stored message and media rendering defensive.
5. Do not add new secrets to HTML, CSS, or client-side JavaScript.

---

## 10. Known Limitations and Technical Debt

### Current product limitations

- Only the latest 20 messages are loaded.
- There is no pagination or **Load earlier messages** control.
- Quotes referring to older unloaded messages cannot jump to their original.
- Privacy re-lock resets the complete experience after a tab switch.
- There is no visible conversation avatar or named chat-partner subtitle; the header still says **Chat Screen**.
- Gesture-based actions such as double-tap reaction and long-press Message Info are not fully introduced to first-time users.

### Repository debt

- `songs/song1.mp3` is not referenced anywhere.
- Legacy reply/question JavaScript and CSS remain from the earlier Chat Scene plan.
- `task.md` is a historical planning document and should not be treated as the exact current architecture.
- There is no JavaScript linter, test runner, build process, or automated browser test suite.
- CSS contains a large historical stylesheet with repeated sections and legacy styles; changes should be made carefully and locally.

### UI caveat

The current Chat Scene has been reviewed through source inspection and manual preview testing. Responsive behavior should still be checked on real 320px, 375px, 390px, 414px, tablet, desktop, iOS, and Android viewports.

---

## 11. Recent UI Updates

The following changes were made on 2026-08-26 in the current working tree:

### UI-02 — Mobile header stability

- Mobile header changed to an intentional title row plus identity row.
- Title is left-aligned beside the presence dot.
- Notification control is kept on the right with stable sizing.
- Identity buttons share the full width on narrow screens.

### UI-03 — Composer affordances

- Send state is synchronized with available text and completed attachments.
- Empty send state is visibly muted and disabled.
- Small-screen composer controls use larger touch areas.
- Mobile message input remains at least 16px.

### UI-04 — Message-list bottom spacing

- Removed the unnecessary composer-height reservation from the message list.
- Kept only a small visual gap below the latest message.

### UI-05 — Safe-area and keyboard layout

- Removed duplicate top safe-area padding.
- Preserved safe-area padding in the compact header.
- Removed the second independent mobile viewport height rule so the child follows the visible Chat Scene height.

### UI-06 — Bubble contrast and hierarchy

- Received bubbles and metadata were lifted slightly from the dark background.
- Sent bubbles received a richer gradient, subtle sheen, clearer edge, and stronger action/meta contrast.

### UI-07 — Bubble action clutter

- Reply/Edit rows are hidden by default.
- Actions reveal on message selection, keyboard focus, or desktop hover.
- A dedicated message-action interaction preserves existing replies, edits, reactions, media, quotes, and long-press behavior.

### Additional tail refinement

- Both bubble tails were changed from sharp CSS triangles to softer rounded rotated shapes.
- Grouped continuation bubbles and media bubbles retain their existing tail rules.

### Mobile keyboard newline fix — 2026-08-26

- The chat input now listens for `keydown` instead of the deprecated `keypress` event.
- On touch/mobile devices, keyboard Return/Enter is left native so it inserts a newline; the explicit Send button is the mobile send action.
- Desktop keeps the existing unmodified-Enter-to-send shortcut, while Shift+Enter remains a newline.
- IME/composition events are ignored to avoid accidental sends while a mobile input method is composing text.
- The textarea declares `enterkeyhint="enter"` to request a Return/newline key from mobile browsers.

### Smart compact chat header — 2026-08-26

- When `#scene-chat` receives the existing `keyboard-visible` state on screens up to 600px wide, the two-row header collapses into a compact single row.
- The compact row preserves the presence dot, Chat Screen title, Bhatari/Bhandhari selector, and notification action.
- The notification button keeps its loading/cooldown semantics but hides its text label and shows the icon only in the compact state.
- The identity toggle glider observes its container dimensions so it remains aligned after the responsive width change.
- When the keyboard closes, the existing two-row mobile header layout returns automatically.

### Presence behavior hardening — 2026-08-26

- Presence is restarted when the selected identity changes, so the heartbeat and the “other person” dot target always match the active identity.
- Presence writes now use unique per-tab session IDs and continue writing the legacy identity fields for compatibility.
- The dot aggregates fresh sessions, so one tab closing cannot mark another tab with the same identity offline.
- Stale asynchronous listeners and old-session writes are invalidated when presence restarts.
- Presence timestamps accept Firestore timestamps plus safe legacy Date, number, string, and serialized timestamp values.
- Missing, stale, malformed, unavailable, and disconnected states are rendered as non-online instead of producing a false green dot.
- Page lifecycle cleanup and network recovery are handled as best effort without extending a hidden/offline session.

### Chat PIN lock hardening — 2026-08-26

- Removed the old off-screen input and randomized password-manager mitigation; the custom keypad is now the only PIN control and the four-digit buffer stays in JavaScript memory.
- Added accessible digit/numpad keyboard handling, Backspace/Delete/Escape/Enter behavior, modal focus management, focus trapping, keypad labels, and status/error announcements.
- Added exact-input validation, duplicate-verification guards, secure-hash capability checks, stale async-result invalidation, bounded attempts, a 15-second lockout, and short-lived lockout metadata without PIN data.
- Added cleanup for paste/autofill attempts, rapid taps, visibility/page/scene teardown, relocking, reloads, and browser Back/Forward navigation. Successful PIN entry still requires fresh identity selection.
- Existing Chat Scene behavior, including the compact header, mobile composer rules, presence, messages, replies, edits, reactions, media, receipts, typing, safe-area, and dynamic viewport handling, is unchanged.

### GIPHY GIF integration — 2026-08-26

- Added a unified animated plus control with Photo/video and GIF options, plus the accessible responsive picker, trending/search states, debounced direct GIPHY requests, `rating=g`, standard-GIF-only filtering, request cancellation, stale-result guards, retry/error/offline handling, and mobile bottom-sheet behavior.
- Fixed GIF result layout with explicit non-overlapping grid rows, a constrained internal scroll region, smooth Load more reveal behavior, loading skeletons, and rendition fallbacks so each tile remains visible.
- GIF selection is preview-first and explicit-send-only. Pending GIFs are mutually exclusive with Cloudinary attachments, and failed sends restore the text/GIF draft without duplicate sends.
- Added a separate sanitized `media.type === 'gif'` representation, runtime-only GIPHY rendition metadata, lazy/dimension-stable rendering, HTTPS host validation, accessible alt text, and the existing media lightbox path.
- Historical GIFs hydrate by de-duplicated GIPHY ID lookup. No GIPHY analytics/action-register calls are made, and no GIF binary is stored or routed through Cloudinary.
- `GIPHY_API_KEY` now contains the owner-supplied browser-visible key and remains replaceable. The requested absence of visible GIPHY attribution conflicts with the provider's documented attribution requirement and remains a pre-production compliance decision.

### Silent Bhatari / Bhandhari identity pings — 2026-08-30

- Added `notifyBhatariSelected()` mirroring `notifyBhandhariSelected()`, both called from `applyIdentityUI()` so they fire on every path that makes Bhatari or Bhandhari the active identity (post-PIN overlay and header toggle).
- Each sends a fire-and-forget Telegram message to the owner’s chat with an IST timestamp, reusing the existing `TG_BOT_TOKEN`/`TG_CHAT_ID` and the Notify Bhatari transport, with distinct per-identity text (`✨ Bhatari Identity is chosen · <IST timestamp>` vs `🐧 She just chose Bhandhari · <IST timestamp>`).
- Fully silent to the device user: no DOM, toast, button, loading, or cooldown UI; all errors swallowed and nothing logged.
- `keepalive: true` delivers the ping even if the tab is closed immediately; a 60-second per-identity client cooldown (`identityPingLastSentAt` / `identityPingLastSentAtBhatari`) de-duplicates rapid re-selections independently.
- Identical behavior for both identities; no cross-suppression between Bhatari and Bhandhari selections.

### Bhandhari Telegram analytics (enter/leave with duration) — 2026-08-31

- Added `notifyBhandhariAnalyticsEnter()` / `notifyBhandhariAnalyticsExit()` + `formatBhandhariAnalyticsDuration()` and `bhandhariAnalyticsStartAt`, wired into `applyIdentityUI()` (enter on any Bhandhari activation, no cooldown, deduped by `startAt`) and `relockChatForLifecycle()` + `visibilitychange`/`pagehide`/`beforeunload` (leave with `stayed <duration>`). 2 fire-and-forget Telegram messages per Bhandhari session: `🟢 Bhandhari entered chat · <IST>` and `🔴 Bhandhari left chat · <IST> · stayed <duration>` (e.g. `5s`, `2m 13s`, `1h 5m`). No DOM, no extra SDK, no render cost.
- Fixed overlay double-set bug (`selectChatIdentity` pre-sets `currentIdentity` before `applyIdentityUI`) by triggering analytics enter on `identity === 'Bhandhari'` + `startAt` guard instead of `prev !== 'Bhandhari'`.
- Fixed unload reliability: leave now uses `GET https://api.telegram.org/botTOKEN/sendMessage?chat_id=...&text=...` with `keepalive:true` + `mode:'no-cors'` and single `sendBeacon` fallback to avoid CORS preflight failure on `pagehide`/`beforeunload` (previous `POST JSON` was cancelled).
- Analytics is Bhandhari-only, Bhatari still uses `✨` ping; Bhandhari `🐧` ping was kept at this stage but is removed in the 2026-09-01 update below.

### Presence dot multi-session fix — 2026-08-31

- Fixed `writePresenceState()` `script.js:5291` — previously `sessions: { [sessionId]: ... }` with `{merge:true}` overwrote the entire `sessions` map on each heartbeat, so concurrent heartbeats from Bhatari and Bhandhari (or two tabs) deleted each other and the dot stayed offline while both were chatting. Now uses `sessions.<sessionId>` dot-notation with `merge:true` to preserve other sessions, so `refreshPresenceDot()` `script.js:5474` correctly aggregates `data[other]` + `data.sessions[*].identity===other` and `isFreshPresenceEntry()` `age<75000` shows `online` (`#4ade80` + `presencePulse 2.4s` `style.css:5211`) when any fresh heartbeat exists.
- No change to `PRESENCE_HEARTBEAT_MS 25000` / `PRESENCE_STALE_MS 75000`, `presenceRunId` invalidation, or `presenceData` handling; offline sessions remain `online:false` and are ignored by freshness check.

### Bhandhari ping removal + analytics single-leave fix — 2026-09-01

- Removed `🐧 She just chose Bhandhari` ping — `notifyBhandhariSelected()` `script.js:953` retained but no longer called from `applyIdentityUI()` `script.js:2010` (commented `// notifyBhandhariSelected();`). Bhatari `✨` ping `notifyBhatariSelected()` remains. Bhandhari now sends only `🟢`/`🔴` analytics (2 msgs/session).
- Fixed duplicate `🔴` leave — `notifyBhandhariAnalyticsExit()` `script.js:1044` previously did `fetch(GET keepalive)` **plus** `navigator.sendBeacon(url)` → 2 Telegram messages per 1 leave. Now single beacon only: `sendBeacon(url)` if available else one `fetch(GET keepalive, no-cors)`, still deduped by `bhandhariAnalyticsStartAt=0` at entry of exit.
- Verified `node --check`, single `🟢` on Bhandhari enter, single `🔴` with `stayed <duration>` on switch/relock/tab close, no `🐧` on Bhandhari.

### Date divider and unread navigation upgrade — 2026-08-28

- Messages are now wrapped in per-day `.chat-day` sections keyed by `dayKeyFor()`. The sticky date divider is pinned only within its own section and is pushed out by the next day, fixing the previous bug where a pinned divider stayed on top for the entire remaining scroll range and stacked over other dividers.
- Day sections are reconciled incrementally like bubbles: empty or stale sections are removed per pass, and new messages append inside their day section. No full rebuild.
- Divider labels are re-derived after a local midnight passes while the tab stays open: `scheduleMidnightDividerRefresh()` arms a self-rescheduling timer for ~1.5s after the next local midnight and re-runs the idempotent reconcile, and `refreshDateDividers()` rewrites changed labels with the existing pop animation. The timer is cleared on privacy re-lock.
- Grouping runs now break at day boundaries: a same-sender run may never straddle two days.
- `formatDateLabel()` appends the year once a conversation spans more than one calendar year.
- Date dividers gained `role="separator"` and an `aria-label` for screen readers.
- The scroll FAB now jumps to the oldest unread message and flash-highlights it (reusing the quote-jump `message-highlight` treatment and reduced-motion handling) when unread messages exist; the previous glide-to-bottom-and-clear behavior remains for the no-unread case, and unread state still clears only on actually reaching the bottom.

The date-divider/unread changes are currently uncommitted in the working tree. The silent identity ping is committed on `test-branch` (`6d07361`). The Chat PIN and GIPHY changes are part of the synchronized baseline (`92f3bd4`). The previously removed `CHAT_SCREEN_UI_UX_REPORT.md` file remains deleted as part of the earlier committed repository state.

---

## 12. Safe Change Guidelines

Before changing the Chat Scene:

1. Read `instructions.md`.
2. Verify the repository, branch, and working-tree state.
3. Do not overwrite or discard unrelated working-tree changes.
4. Keep the Firestore collection and document names unchanged unless a migration is planned.
5. Keep the identity strings exactly `Bhatari` and `Bhandhari` unless all related code and stored data are updated together.
6. Preserve the current dynamic viewport and safe-area behavior when touching layout.
7. Preserve `syncSendButtonState()` when changing composer behavior.
8. Preserve action-row reveal behavior when changing bubble markup.
9. Keep all user-controlled text rendered through safe DOM APIs.
10. Test the Chat Scene on narrow mobile screens, keyboard-open screens, desktop, offline/reconnect, and reduced-motion settings.

### Current important function names

- `SceneController`
- `initChatScene()`
- `initChatLockOverlay()`
- `selectChatIdentity()`
- `notifyBhatariSelected()` (Bhatari only — Bhandhari `🐧` ping `notifyBhandhariSelected()` retained but no longer called)
- `notifyBhandhariAnalyticsEnter()` / `notifyBhandhariAnalyticsExit()` / `formatBhandhariAnalyticsDuration()` (Bhandhari 2 msgs/session, single `🔴` leave)
- `writePresenceState()` (dot-notation `sessions.<id>` fix)
- `startMessageListener()`
- `reconcileMessages()`
- `dayKeyFor()`
- `refreshDateDividers()`
- `scheduleMidnightDividerRefresh()`
- `createBubble()`
- `updateBubble()`
- `syncSendButtonState()`
- `initChatMessageActions()`
- `handleReply()`
- `startEdit()`
- `buildImageMedia()`
- `buildVideoMedia()`
- `initReadReceiptObserver()`
- `initChatReactions()`
- `startPresence()`
- `showRemoteTypingIndicator()`

---

## 13. Validation Status

There is no automated test suite. The following checks are currently appropriate:

- `node --check script.js`
- `npx stylelint style.css`
- `git diff --check`
- Manual password and Chat PIN flow
- Manual identity selection and switching
- Sending text with empty/non-empty composer states
- Sending image and video attachments
- Reply, edit, reaction, read receipt, typing, presence, and Message Info flows
- Mobile keyboard and safe-area behavior
- Narrow-width header and bubble layout
- Desktop hover behavior
- Keyboard focus and reduced-motion behavior
- Offline and reconnect states

The most recent validation (after the date-divider/unread-nav changes) completed successfully for JavaScript syntax (`node --check script.js`), CSS lint (`stylelint style.css`), and Git whitespace checks (`git diff --check`). Earlier passes also covered GIF/PIN structure assertions and HTTP 200 responses from a temporary local static preview. No automated browser test runner is installed, so the sticky push-out, midnight relabel, unread jump, GIF picker, keyboard, focus, lifecycle, and lockout behavior still require manual browser checks.
