# Implementation Plan: Premium Mobile Chat Screen Revamp

> **Scope**: Improve the UI and functionality of the chat screen (`#scene-chat`) to be more premium and optimized for mobile.
> **Status**: PLANNING ONLY — no implementation. This document replaces the earlier (superseded) Telegram-architecture plan; the chat now runs on **Firebase Firestore** (`web_chat_v2` collection, `typing/status` doc).

---

## 1. Current-State Analysis (read-only findings)

### 1.1 Structure (index.html:219-291)
- `#scene-chat.scene` contains:
  - `#chat-lock-overlay` — full-screen PIN gate (keypad, dots, lockout) — `index.html:221-250`
  - `.chat-scene` — `index.html:252-290`:
    - `.chat-header` — title + notify button + identity toggle — `index.html:254-269`
    - `#chat-messages` — scrollable list, bubbles injected by JS — `index.html:272`
    - `#chat-reply-container` — reply preview bar (hidden) — `index.html:277-280`
    - `.chat-input-bar` — `textarea` + send button + `#chat-status` — `index.html:283-289`

### 1.2 CSS (style.css:1879-2974)
- `.chat-scene` uses `100dvh` — `style.css:1885-1893` (good intent, but see §1.3 bug).
- Header `flex-wrap: wrap` — `style.css:1896-1910` (can wrap awkwardly on narrow screens).
- Identity toggle: segmented control, 44px touch targets — `style.css:1926-1988`.
- Bubbles: glassmorphism left (Bhatari) / gradient right (Bhandhari) — `style.css:2018-2055`.
- `.chat-reply-btn` styles at `2106-2135` are **dead** (actual reply button lives in `.chat-bubble-actions`).
- Input pill, send button, typing dots, date dividers, edit UI, PIN lock overlay all present.
- **A stray `}` at `style.css:2457`** closes a non-existent block (file is 430 `{` vs 431 `}`). Harmless in browsers but will break stylelint/formatting and is a latent risk.

### 1.3 Confirmed bugs / layout defects
1. **`charCounter` is undefined** — `script.js:1589` → `ReferenceError` on every keystroke in inline edit; `.chat-edit-char-counter` is never created. Breaks edit auto-resize UX.
2. **Class mismatch in `updateBubble`** — queries `.chat-actions-row` (`script.js:1442`) but bubbles use `.chat-bubble-actions` (`script.js:1523`) → edit-button visibility refresh is a no-op there.
3. **Wrong button targeted in edit check** — `script.js:1445` reads the first `.chat-action-btn` (the Reply button) instead of the Edit button.
4. **Notify button default mismatch** — hidden by default (`script.js:1266`) but the default identity is **Bhandhari** (`script.js:1219-1220`); "Notify Bhatari" is invisible until the toggle is re-clicked.
5. **`.scene` padding conflicts with `100dvh`** — `.scene` (`style.css:267-284`) has `padding: 2rem 1.5rem`, `align-items:center`, `justify-content:center`, `overflow:hidden`. `.chat-scene` requests `100dvh` inside it → the input bar can be clipped / miscentered on small screens. Needs `#scene-chat { padding: 0 }`-style override.
6. **No iOS safe-area handling** — viewport meta (`index.html:6`) lacks `viewport-fit=cover`; no `env(safe-area-inset-*)` padding → notch/home-indicator overlap on modern iPhones.
7. **No `visualViewport` / keyboard handling** — relies only on `100dvh`. On iOS Safari the software keyboard can still cover the input bar or cause jumps. Needs a `visualViewport` listener.
8. **XSS risk in reply preview** — `handleReply` builds preview via `innerHTML` (`script.js:1739`) with user-controlled text/sender → DOM-based XSS. Must switch to `textContent`.
9. **No message history pagination** — listener uses `limitToLast(20)` (`script.js:1283`); older messages are unreachable. No load-more affordance.
10. **No message status beyond `pending`** — sent/pending only; no delivered/seen indicator.
11. **`will-change: scroll-position`** on `.chat-messages` (`style.css:2001`) — can exhaust memory on long sessions; reconsider.
12. **Header toggle stale markup** — `index.html:262` sets Bhatari `active`/`aria-checked=true`, but JS re-initializes default to Bhandhari; initial render flickers.

---

## 2. Design Goals

- **Premium feel**: micro-interactions, layered glass, tasteful gradients, refined typography, spring-like motion, subtle glow.
- **Mobile-first**: thumb-friendly targets (≥44px), keyboard-aware layout, safe-area insets, no horizontal overflow, 100dvh + `visualViewport` strategy.
- **Performance**: passive listeners, no layout thrash in scroll, batch DOM writes, guard `will-change`.
- **Accessibility**: `aria-live` for new messages, focus management in edit/reply, visible focus rings, `prefers-reduced-motion` honored.
- **Keep backend stable**: same Firestore collection/doc + same message schema; no data migration.

---

## 3. UI Improvements

### 3.1 Header & Identity Toggle (`index.html` + `style.css`)
- **Compact sticky header**:
  - Reduce vertical padding, keep one row on phones: title (left) + notify button (right).
  - Move the identity toggle to a second slim row or make it horizontally scrollable so it never wraps/overflows on 320px widths.
- **Premium segmented control**:
  - Pill container with a sliding highlight (transform-based, GPU-accelerated) instead of per-button gradients.
  - Add avatar dots + full-width tap zones (min 44px tall).
  - Persist chosen identity to `sessionStorage` and restore on re-entry (small functional win).
- **Notify button**:
  - Restyle as a compact gradient chip with icon; always visible (fix §1.3.4 mismatch by wiring initial visibility to the default identity).
  - Show countdown as a thin progress ring/bar instead of plain text.
- **Safe-area**: add `padding-top: env(safe-area-inset-top)` on `.chat-header` and `viewport-fit=cover` in the meta tag.

### 3.2 Message Bubbles (`createBubble`/`updateBubble` + CSS)
- **Bubble tails**: give left/right bubbles an asymmetric corner (already partially done) plus a subtle tail pseudo-element for a more chat-app look.
- **Grouped rendering**: show the sender label + timestamp only on the first message of a consecutive run from the same sender within a time window (2–5 min) → cleaner list. Add a small `data-run-start` concept in `reconcileMessages`.
- **Premium states**:
  - `pending`: subtle opacity + a tiny spinner/dot that turns into a checkmark once confirmed.
  - `edited`: keep the tag, style it as a muted superscript.
  - Add a long-press / secondary action sheet (Reply / Edit / Delete if added) rather than always-visible buttons (see §4.2).
- **Reply quote boxes**: match bubble side (left accent for left bubbles, right accent for right), tap-on-quote scrolls to original message (see §4.4).
- **Timestamp styling**: place inside the bubble footer, muted, with a "Today/Yesterday" short form on bubble footer for recent messages.

### 3.3 Typing Indicator & Status
- **Typing bubble**: keep 3-dot animation but align it as a proper left/right bubble with the sender's avatar dot; ensure it never pushes the scroll position awkwardly (fix auto-hide + scroll guard).
- **Connection status**: convert `#chat-status` from an absolutely-positioned text under the input bar to a slim, centered pill/banner that appears above the input bar only when reconnecting/offline; add a "reconnected ✓" transient state.
- **Empty state**: when `#chat-messages` is empty, show a centered greeting ("Say hi 💜") with the sender avatar pair.

### 3.4 Input Bar
- **Auto-grow textarea**: keep, but cap at ~5 lines and add a subtle max-height fade.
- **Character counter** for the composer (and FIX the edit `charCounter` bug — §4.3).
- **Send button**: swap `➤` for a cleaner paper-plane SVG; micro-scale on active; disabled (muted) when input is empty/whitespace.
- **Composer secondary row** (optional, future): emoji/attachment toggles as icon buttons (44px). Keep out of scope if it risks layout, note as stretch.
- **Keyboard handling**: listen to `window.visualViewport` resize; set a CSS variable `--kb-offset` and translate the input bar up so it never sits under the keyboard (see §5.2).

### 3.5 Motion & Polish
- **Scroll-to-bottom FAB**: a floating round button that appears when the user scrolls up (≥120px from bottom) and fades on return to bottom; tap scrolls smoothly. Renders above the input bar.
- **Date divider**: keep the pill design; freeze the "latest" divider to the top as a sticky header label while scrolling (premium timeline feel) — optional/flagged as advanced.
- **Haptics**: `navigator.vibrate` on send and on reply-select (guard for unsupported browsers).
- **Micro-interactions**: bubble press scale (not just hover); reply-bar spring slide-in (already exists via `reply-anim`); toast rework with slide+fade.
- **Reduced motion**: ensure all new animations are disabled under `prefers-reduced-motion`.

---

## 4. Functionality Improvements

### 4.1 Message Loading & Pagination
- **Load more**: render a "Load earlier" chip / infinite-scroll trigger at the top.
  - Implementation: Firestore query `orderBy('timestamp','desc').limit(N)` paginated with `startAfter`; merge older pages at the top of the list; preserve scroll anchor (record `scrollTop`/first rendered id before insertion).
  - Keep `limitToLast(20)` live listener for the tail so real-time stays cheap.

### 4.2 Message Actions (Reply / Edit; optional Delete)
- **Reply**: keep inline "↩ Reply" but move into a tap-to-reveal action row (tap bubble → action bar) to reduce clutter and improve mobile ergonomics. Fix the dead `.chat-reply-btn` CSS.
- **Edit**: keep inline edit; fix the `updateBubble` bugs (§1.3.2/§1.3.3) so Edit visibility tracks identity correctly.
- **Delete (optional, needs schema/decision)**: Firestore `delete()` + tombstone handling in `reconcileMessages`; requires user decision (schema already has `isEdited`; add `deletedAt`?). Flagged — not implemented without approval.

### 4.3 Edit Bug Fixes (required, small)
- Create the `.chat-edit-char-counter` element in `startEdit` and update it on input (fixes `ReferenceError`).
- `updateBubble`: target `.chat-bubble-actions` and select the `.chat-edit-btn` specifically (via `[data-owner-id]`), not the first `.chat-action-btn`.
- Preserve the identity-switch visibility refresh.

### 4.4 Tap-to-Quote & Jump to Original
- Make the reply quote box inside a bubble clickable → locate `#msg-<id>` (add `id`/`data-id` to each bubble, already `dataset.id`) and smooth-scroll it into view + brief highlight pulse.
- Strip sender prefix and clamp text (already 60/70-char clamps) — switch to `textContent` (XSS fix).

### 4.5 Message Status Indicators
- Extend bubble footer with a tiny status glyph: `pending` → single check (pending write), confirmed → no glyph or subtle "sent", plus optional "seen" once the other identity's client acknowledges. For v1: rely on `doc.metadata.hasPendingWrites`; "seen" flagged as future.

### 4.6 Notify & Cooldown Polish
- Fix initial visibility to match default identity.
- Progress ring or countdown chip on the notify button during cooldown.
- Toast feedback on success/failure (already present) — restyle as premium.

### 4.7 Offline & Reconnect UX
- When `navigator.onLine` goes false while in chat: show inline banner in the messages area (not a full-screen lock) + disable send button.
- On reconnect: banner → "Reconnected ✓" and re-enable send; Firestore snapshot fires automatically (already handled by `onSnapshot`).

---

## 5. Mobile-Specific Optimization

### 5.1 Layout
- Add `viewport-fit=cover` to the viewport meta (`index.html:6`).
- `#scene-chat { padding: 0; }` override so `.chat-scene` fills the viewport edge-to-edge.
- Safe-area insets: `env(safe-area-inset-top)` on header, `env(safe-area-inset-bottom)` on input bar.
- Ensure `.scene` centering (`align-items/justify-content`) is bypassed for the chat scene.

### 5.2 Keyboard Handling
- Use `visualViewport` (`window.visualViewport.addEventListener('resize', ...)`) to compute `height` delta and set `--kb-offset`.
- Apply `padding-bottom` or `transform: translateY(-var(--kb-offset))` to `.chat-input-bar`; on Android, `resize`/`innerHeight` fallback.
- Prevent iOS auto-zoom: input font-size ≥16px is already 1rem (16px) — keep it.
- Keep focus on the input when tapping send (no blur), so the keyboard stays open for rapid messages.

### 5.3 Touch & Ergonomics
- All interactive targets ≥44×44px (verify reply/edit/notify/toggle/FAB).
- `touch-action: manipulation` on buttons to remove 300ms delay / double-tap zoom.
- Throttle heart-on-tap effect so it doesn't fight message taps.
- `overscroll-behavior: contain` on `.chat-messages` to prevent pull-to-refresh hijack.

### 5.4 Performance
- Replace `will-change: scroll-position` with `will-change: auto` or remove; keep `contain`/`overflow` handling.
- Batch bubble DOM writes (DocumentFragment) during initial load; avoid per-message reflow.
- Passive listeners on scroll/touch.
- Debounce scroll handler for the FAB and sticky-divider logic.

---

## 6. Accessibility

- `aria-live="polite"` on `#chat-messages` so new messages are announced.
- Keyboard/focus trap: reply cancel, edit save/cancel, FAB, and toggle must be reachable via Tab with visible focus.
- Preserve `role="radiogroup"` semantics on the identity toggle; `aria-checked` synced correctly (fix initial-state flicker).
- Color contrast: ensure text on gradient right bubbles and on glass bubbles meets WCAG AA (test #f3e8ff on #5a189a etc.).
- Honor `prefers-reduced-motion`.

---

## 7. File-by-File Change Map (for the implementation phase)

| File | Change |
|------|--------|
| `index.html` | `viewport-fit=cover`; chat header/toggle markup adjustments; add FAB + empty-state + status-banner containers; (optional) load-more trigger; notify button markup |
| `style.css` | Remove stray `}` at 2457; `#scene-chat` padding override; safe-area insets; grouped-bubble/tail styling; FAB, status pill, empty state, char counter, composer counter; keyboard-offset var; mobile media-query tightening; delete dead `.chat-reply-btn` |
| `script.js` | Fix `charCounter`; fix `updateBubble` class/button selectors; fix notify initial visibility; `visualViewport` keyboard handling; pagination (load earlier); status glyphs; `handleReply` → `textContent`; quote-jump; FAB scroll logic; passive listeners; empty-state render; `sessionStorage` identity persistence |
| `task.md` | This plan (authoritative reference) |

---

## 8. Implementation Phases

- **Phase 1 — Bug-fix foundation**: §1.3 fixes (charCounter, updateBubble selectors, notify visibility, stray `}`, XSS in reply preview, scene padding override). Low risk, high value.
- **Phase 2 — Mobile layout hardening**: viewport-fit/safe-area, visualViewport keyboard handling, 44px targets, overscroll/passive listeners, FAB + empty state + status pill.
- **Phase 3 — Premium visual pass**: grouped bubbles + tails, sliding segmented toggle, bubble press states, notify progress chip, toast/footer polish, motion + reduced-motion.
- **Phase 4 — Feature depth (needs user decisions)**: pagination/load-more, tap-quote-to-jump, message status glyphs, optional Delete, identity persistence. Confirm Firestore rules allow `delete()` if Delete is added.
- **Phase 5 — Verification & polish**: manual checklist below; stylelint run; mobile + iOS keyboard + offline + multi-tab + `prefers-reduced-motion` pass.

---

## 9. Verification Checklist (implementation phase)

- [ ] No console errors (especially the old `charCounter` ReferenceError).
- [ ] Chat opens full-viewport edge-to-edge; no clipping with keyboard open on iOS and Android.
- [ ] Safe-area insets correct on iPhone notch/home indicator (portrait + landscape).
- [ ] Identity toggle defaults to Bhandhari; Notify button visible immediately; switching updates edit-button visibility + typing doc keys.
- [ ] Reply works; preview uses text (no `innerHTML`); tap-quote jumps to original (if implemented).
- [ ] Edit works with live char counter; save/cancel/Esc/Enter; identity switch hides others' edit buttons.
- [ ] New messages appear in real time; typing indicator shows/hides correctly.
- [ ] FAB appears when scrolled up, returns to bottom on tap.
- [ ] Empty state renders when no messages.
- [ ] Reconnect banner shows offline, clears on reconnect, send disabled while offline.
- [ ] stylelint passes (no stray braces); `prefers-reduced-motion` disables animations.
- [ ] All touch targets ≥44px; no horizontal scroll; 320px width passes.
- [ ] Firestore rules still allow all needed reads/writes (verify in console if Delete added).

---

## 10. Out of Scope / Flags

- Deleting messages (schema + rules + reconciliation) — **needs user decision**.
- Emoji picker / attachments / images in chat — stretch, note for future.
- Real "seen/read" receipts — depends on server presence; future.
- Moving hardcoded secrets to env config — separate task (see `project-context.md` §21-F).
