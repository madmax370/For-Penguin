# Project Context

> **Last reviewed:** 2026-08-26
>
> This document describes the current implementation of the project, including the recent Chat Scene UI work and the current mobile composer keyboard behavior follow-up. It is documentation only; changing this file does not change application behavior.

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
- `.chat-input-bar`
  - `#chat-attach-btn`
  - `#chat-input`
  - `#chat-send-btn`
  - `#chat-status`

### Body-level overlays

These live outside the transformed scene elements so fixed positioning works correctly:

- `#chat-lightbox` — fullscreen photo viewer
- `#msg-info-overlay` — message information bottom sheet opened by long-pressing a sent message

---

## 5. Current Chat UI Behavior

### Viewport and responsive layout

- `#scene-chat` uses the visible viewport variables `--vv-top` and `--vv-height` when available.
- `visualViewport` listeners update the chat height when browser controls or the mobile keyboard changes the visible area.
- `viewport-fit=cover` is present in the viewport meta tag.
- The Chat Scene itself no longer adds a second top safe-area inset; the header owns that spacing.
- The compact header preserves the top safe-area inset while scrolling.
- On narrow screens up to 600px, the header intentionally uses two rows:
  - title and notification control
  - full-width identity selector
- The title is left-aligned beside the presence indicator. The notification control stays on the right.
- The mobile chat container follows the height of the Chat Scene instead of introducing another independent viewport height.

### Header

- The title currently reads **Chat Screen**.
- The presence indicator is a small dot whose state is updated by Firebase presence data.
- The Notify button is only shown for the Bhandhari identity.
- The identity toggle uses a sliding glider and colored identity dots.
- Notification text has a minimum width and does not wrap during its cooldown state.

### Message list

- Messages are displayed in ascending timestamp order.
- The live listener currently loads only the most recent 20 messages.
- Date dividers are inserted for calendar-day boundaries and use stable day-based keys.
- Consecutive messages from the same sender within five minutes are grouped visually.
- The message list now keeps only a small gap below the latest message because the composer is a normal flex sibling, not an overlay.
- A sticky date divider, skeleton loader, empty state, typing state, unread count, and **New messages** divider are supported.

### Message bubbles

- Bhatari messages are left-aligned on a raised dark-glass surface.
- Bhandhari messages are right-aligned on a richer purple gradient.
- Sent text bubbles have a subtle top sheen, clearer edge, stronger metadata contrast, and slightly more depth.
- Received bubble borders and metadata are brighter so they do not disappear into the dark background.
- Sender labels, timestamps, edited labels, reply previews, and delivery ticks have been made more readable.
- Bubble tails use small rounded, rotated shapes rather than sharp triangular wedges.
- Only the first bubble in a grouped run shows a tail. Media bubbles do not show tails.
- Media bubbles use Cloudinary thumbnails and open images in the lightbox.

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

---

## 6. Chat Interactions and Features

### Chat PIN

- Four-digit PIN entered with an on-screen keypad.
- Includes clear and backspace controls.
- Three failed attempts cause a short in-memory lockout.
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

The active identity writes a heartbeat approximately every 25 seconds. The other identity is treated as offline when the heartbeat is older than approximately 75 seconds.

The header dot is green for a fresh online heartbeat and muted otherwise.

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
- Only Cloudinary URLs are accepted when rendering stored media.

### Scroll and unread behavior

- The scroll-to-latest button appears when the user is far from the bottom.
- Missed incoming messages increase the unread count when the user is scrolled up or when the Chat Scene is not active.
- The unread count appears on the scroll button and is capped at `99+`.
- A **New messages** divider appears above the first missed message.
- Reaching the bottom or pressing the scroll button clears the unread state.

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

### Telegram

The Notify Bhatari action calls the Telegram Bot API directly from the browser. The bot token is currently hardcoded in client-side JavaScript and should be treated as exposed. It should be rotated and moved behind a server-side endpoint before any public or production use.

---

## 9. Security and Privacy Notes

The password and Chat PIN are checked by comparing a SHA-256 hash in the browser. This is casual obscurity, not server-enforced authentication. Anyone with developer tools can inspect or bypass the client-side gate.

The identity selector is also a UI choice, not an authorization boundary. A visitor who passes the client-side gates can choose either identity unless Firestore Rules enforce stronger controls.

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

The mobile keyboard fix is currently uncommitted in `index.html`, `script.js`, and `project-context.md`. The previously removed `CHAT_SCREEN_UI_UX_REPORT.md` file remains deleted as part of the earlier committed repository state.

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
- `startMessageListener()`
- `reconcileMessages()`
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

The most recent read-only validation completed successfully for JavaScript syntax, Git whitespace checks, and public static preview responses.
