# Implementation Plan: Unified Web Chat Feature

## Architecture Overview
Shift the chat architecture so both users (**Bhatari** and **Bhandhari**) interact exclusively through the Website UI. The Telegram Bot API will serve as an invisible message database and real-time sync layer.

- **Bot Token**: `8695269828:AAEa1pffPXcEfXZJIWiSMvE3BIxJtqINV94`
- **Channel ID**: `-1003904588299`
- **User 1 (Left Bubble)**: Bhatari (Glassmorphism theme)
- **User 2 (Right Bubble)**: Bhandhari (Primary accent color)

---

## 1. UI & Layout Strategy (`index.html` & `style.css`)

### HTML Structure (`index.html`)
Inside `#scene-chat`:
1. **Header & Identity Toggle**:
   - Header title: "Chat Screen"
   - Prominent dropdown toggle below header: `<select id="chat-identity-select">` with options:
     - `Bhatari` (Chatting as Bhatari)
     - `Bhandhari` (Chatting as Bhandhari)
2. **Messages Container**:
   - Scrollable container `#chat-messages` (`flex: 1`, `overflow-y: auto`).
   - Dynamically rendered chat bubbles & reply quotes.
   - Typing indicator bubble placeholder or dynamically appended typing bubble `#chat-typing-indicator`.
3. **Reply Container**:
   - `#chat-reply-container` (hidden by default):
     - `#chat-reply-quote` (shows sender & prefix-stripped quote text).
     - `#chat-reply-cancel` (cancel "✖" button).
4. **Input Bar & Status**:
   - `#chat-input` (Text input field).
   - `#chat-send-btn` (Circular send button with ➤ icon).
   - `#chat-status` ("✅ Connected" / "⏳ Reconnecting...").

### CSS Strategy (`style.css`)
1. **Dynamic Viewport Height (`100dvh`)**:
   - Use `height: 100dvh` for `.chat-scene` and container to ensure mobile browser bars and software keyboards do not obscure the fixed input bar.
   - Flexbox vertical stack: Header + Toggle (fixed top) → Messages (`flex: 1`) → Reply Box (conditional) → Input Bar (fixed bottom).
2. **Identity Toggle Styling**:
   - Glassmorphic container with custom styled `<select>` dropdown.
   - Centered alignment under the header for easy mobile access.
3. **Bubble Alignment & Themes**:
   - `.chat-bubble.left` (Bhatari): Glassmorphic background (`var(--glass-bg)`), backdrop blur, left-aligned, slide-in-left animation.
   - `.chat-bubble.right` (Bhandhari): Accent purple background (`var(--accent-primary)`), right-aligned, slide-in-right animation.
   - `.chat-sender-label`: Small, elegant label at top of bubble ("Bhatari" or "Bhandhari").
   - Small, tap-friendly "Reply" button inside each bubble.
4. **Quote Boxes**:
   - Internal bubble quote box (`.chat-quote-box`) styled with a left border accent and subtle contrast background.
5. **Typing Dots Animation**:
   - 3-dot animation (`.typing-dots span`) using `@keyframes dotPulse`.
   - Renders inside bubble aligned Left (Bhatari) or Right (Bhandhari).

---

## 2. JavaScript Logic (`script.js`)

### A. State Management (`chatState`)
```javascript
const chatState = {
    botToken: '8695269828:AAEa1pffPXcEfXZJIWiSMvE3BIxJtqINV94',
    channelId: '-1003904588299',
    apiBase: 'https://api.telegram.org/bot8695269828:AAEa1pffPXcEfXZJIWiSMvE3BIxJtqINV94/',
    currentIdentity: 'Bhatari', // 'Bhatari' or 'Bhandhari'
    messages: [],
    lastUpdateId: 0,
    pollingInterval: null,
    backoffTimer: 3000,
    maxBackoff: 30000,
    replyToMessage: null, // { id, text, sender }
    typingTimeout: null,
    lastTypingSentTime: 0,
    remoteTypingState: {
        Bhatari: false,
        Bhandhari: false,
        timer: null
    }
};
```

### B. Message Prefix & Formatting Logic
1. **Sending Messages (`sendMessage()`)**:
   - Prepend `chatState.currentIdentity + ": "` to user text (e.g. `Bhatari: Hello!`).
   - If replying, attach `reply_to_message_id` in API payload.
   - Render optimistically with stripped text in UI.
2. **Parsing Messages (`parseMessageText()`)**:
   - Inspect message text string:
     - If starts with `Bhatari: `, sender is `Bhatari` (LEFT bubble), clean text = `text.substring(9)`.
     - If starts with `Bhandhari: `, sender is `Bhandhari` (RIGHT bubble), clean text = `text.substring(11)`.
     - Fallback for legacy/unprefixed messages: classify based on `from.id` or bot flag.

### C. History Fetching & Real-Time Polling Loop
1. **`loadChatHistory()`**:
   - Call `getUpdates?offset=-20&limit=20` on scene init.
   - Filter out `__TYPING__::` and legacy `🐧 Penguin is typing...` messages.
   - Sort messages chronologically by `date` / `message_id`.
   - Store highest `update_id` into `chatState.lastUpdateId`.
   - Render initial 20 messages.
2. **`pollMessages()`**:
   - Polling loop runs every 3 seconds with `offset=${chatState.lastUpdateId + 1}`.
   - Process new incoming updates:
     - Check for `__TYPING__::Bhatari` or `__TYPING__::Bhandhari` payloads (handled via silent cleanup).
     - Standard messages are appended to `chatState.messages` and rendered.
     - Reset exponential backoff to 3s on success; scale backoff (up to 30s) on network failure.

### D. Silent Synced Typing Indicator Logic
1. **Outgoing Typing Detection**:
   - Listen to `#chat-input` `input` events.
   - Debounce outgoing typing messages: only send payload if `Date.now() - lastTypingSentTime > 3000`.
   - Hidden Payload: POST `__TYPING__::${chatState.currentIdentity}` to Telegram channel.
2. **Incoming Typing Handling & Silent Cleanup**:
   - In `pollMessages()`, if `msg.text` starts with `__TYPING__::`:
     - Extract sender (`Bhatari` or `Bhandhari`).
     - Immediately invoke `deleteMessage` on Telegram API with `chat_id` and `message_id` so the Telegram channel remains 100% clean.
     - Show typing indicator bubble on Left (if Bhatari) or Right (if Bhandhari).
     - Set/Reset 4-second timeout timer. If no new typing pings or messages arrive within 4 seconds, automatically hide the typing bubble.

### E. Reply Feature Execution
1. **Bubble Reply Button**:
   - Clicking "Reply" on any message bubble populates `chatState.replyToMessage = { id, text, sender }`.
2. **Reply Container UI**:
   - Displays quoted snippet and sender name in `#chat-reply-container`.
   - Focusing input field.
   - Cancel button "✖" clears reply state and hides container.
3. **Receiving Replied Messages**:
   - If incoming message has `reply_to_message`, extract original quoted text.
   - Strip any sender prefix from quoted text.
   - Render quote box inside bubble above new message text.

---

## 3. Execution Phases

- **Phase 1: Planning (Current Step)** — Create `task.md` & obtain user approval.
- **Phase 2: HTML & CSS Implementation** — Build header identity toggle, mobile-optimized `100dvh` container, glassmorphism / accent bubbles, reply bar, and animated typing dots.
- **Phase 3: JavaScript & API Integration** — Implement state, identity selector handler, prefix parser, history fetch, 3s polling loop, silent typing sync & auto-deletion, and reply system.
- **Phase 4: Verification & Polish** — Test identity switching, typing auto-cleanup on Telegram, reply quote rendering, and responsive keyboard handling.
