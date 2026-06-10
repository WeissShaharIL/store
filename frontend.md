# Frontend review — `store/frontend` (UI / UX)

_Senior frontend-designer review of the customer-facing experience. Reviewed: design tokens, global/base styles, the storefront button system, and the full customer journey — Landing → Showroom → 3D Designer → Cart/Quote — plus shared components (`ClosetCard`, `ItemCard`, `CustomerNav`, forms)._

The design **foundation is strong** — see [What's already excellent](#whats-already-excellent). Most findings below are about closing accessibility gaps and tightening the visual hierarchy on the **conversion path** (the buttons people click to buy). Prioritized; **🔴 Accessibility** items affect real users (keyboard, screen-reader, low-vision) and are worth doing first.

---

## 🔴 Accessibility

### A1 — Storefront buttons have no visible keyboard-focus state
The entire storefront button system in [styles/buttons.css](store/frontend/src/styles/buttons.css) defines `:hover`/`:active` (color brightens to white) but **no `:focus-visible`**. So every primary conversion action — "הוסף לעגלה", "שלח הצעה", inquiry submit, login, designer "הוסף לעגלה" — is **invisible to keyboard users** when focused. (Note: the *admin* `.btn` / `.icon-btn` in [styles/forms.css:68](store/frontend/src/styles/forms.css#L68) do this correctly with `box-shadow: var(--ring)` — the storefront system just never got the same treatment.)

**Fix** — add a focus ring to the canonical group:
```css
.landing .btn--primary:focus-visible,
.showroom-card__add-btn:focus-visible,
.sr-details__cta-btn:focus-visible,
.closet-designer__add-btn:focus-visible,
.inquiry-submit:focus-visible,
.cart-btn:focus-visible,
.login-btn:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
  border-radius: var(--radius-sm);
}
```

### A2 — Clickable `<figure>` in the landing gallery isn't keyboard-reachable
[LandingPage.jsx:374-383](store/frontend/src/pages/LandingPage.jsx#L374-L383): the "best sellers" cards open the detail modal via `<figure onClick=… style={{cursor:"pointer"}}>` — no `role`, `tabindex`, or key handler. Mouse-only; keyboard and screen-reader users can't open them. The Showroom already does this **right** ([ShowroomPage.jsx:193-209](store/frontend/src/pages/ShowroomPage.jsx#L193-L209) wraps the image in a real `<button aria-label=…>`) — mirror that pattern:
```jsx
<figure className="landing-gallery__card">
  <button type="button" className="landing-gallery__open" onClick={() => setSelectedCloset(c)}
          aria-label={`פרטים על ${c.name}`}>
    <img src={`/uploads/${c.image_path || defaultClosetImage}`} alt={c.name} loading="lazy" />
  </button>
  <figcaption>{c.name}</figcaption>
</figure>
```

### A3 — Emoji used as functional UI icons
Emoji are used as control glyphs and content in several customer-facing spots:
- Cart row meta — 📐 / 🚪 / 🎨 ([CartPage.jsx:221-227](store/frontend/src/pages/CartPage.jsx#L221-L227)); edit ✏️ / remove ✕ ([CartPage.jsx:232-234](store/frontend/src/pages/CartPage.jsx#L232-L234)); done ✓ ([CartPage.jsx:122](store/frontend/src/pages/CartPage.jsx#L122))
- Card placeholders 🪟 ([ClosetCard.jsx:10](store/frontend/src/components/ClosetCard.jsx#L10), [ShowroomPage.jsx:207](store/frontend/src/pages/ShowroomPage.jsx#L207)); "✓ נוסף לעגלה" ([ClosetCard.jsx:27](store/frontend/src/components/ClosetCard.jsx#L27))

Problems: emoji render inconsistently across OS/browser, and screen readers **announce them literally** ("triangular ruler", "door", "artist palette", "heavy check mark") mid-sentence. There's already a clean SVG set in `components/Icons.jsx` that the rest of the app uses — route these through it (decorative ones `aria-hidden`, the ✏️/✕ buttons already have `aria-label`s so just swap the glyph for an SVG). This is also a **consistency** win (see M2).

### A4 — The 3D Designer dialog isn't a proper modal for assistive tech
[ClosetDesigner.jsx:453](store/frontend/src/pages/ClosetDesigner.jsx#L453) — the flagship feature — uses `role="dialog"` (good) and handles Escape (good), but is missing:
- `aria-modal="true"`
- **focus management**: focus isn't moved into the dialog on open, and isn't restored to the trigger on close
- a **focus trap**: keyboard users can Tab out into the page behind the overlay

Since this is the marquee experience, it's worth a small focus-trap (move focus to the close button or first control on mount, restore on unmount, and loop Tab within the card). Same applies to `InquiryModal` and `ShowroomClosetDetails`.

### A5 — Resting contrast of storefront CTA labels
The canonical storefront button resting color is `rgba(255,255,255,0.55)` ([buttons.css:40](store/frontend/src/styles/buttons.css#L40)). On the dark storefront that's ~3:1 — below WCAG AA (4.5:1) for text. It's an intentional "quiet" look, but these are the **buy buttons**; faint-gray-until-hover reads as disabled and hides the primary action from low-vision users (and tells nothing to touch users, who have no hover). Bump the resting state to at least `rgba(255,255,255,0.75)` and lean on A1's focus ring + a clearer affordance (see U1).

---

## 🟠 Conversion-path clarity (UX)

### U1 — Primary CTAs don't look like buttons
There are two opposite button languages:
- `.btn--primary` (filled indigo pill + shadow + lift) in [forms.css:78](store/frontend/src/styles/forms.css#L78)
- the storefront **borderless gray text-link** in [buttons.css](store/frontend/src/styles/buttons.css), which even **overrides `.landing .btn--primary`** to the flat look

The net effect: the most important actions on the site — **"שלח הצעה"** (submit quote), **"הוסף לעגלה"**, **"לכל הדגמים"** — render as faint gray text rather than a tappable button. On a phone (no hover) they're easy to miss. The borderless aesthetic is lovely for *secondary* links; I'd give the **single primary action per screen** real button affordance (filled or outlined pill, the brand gradient `--brand-gradient` is right there) while keeping secondary actions as the quiet text-links. That's a hierarchy fix, not a redesign.

### U2 — Showroom card has two controls that do the same thing
In [ShowroomPage.jsx:193-224](store/frontend/src/pages/ShowroomPage.jsx#L193-L224) both the image button **and** the pill labeled **"הצג"** call `onCardClick` (open details). Meanwhile the pill is styled with a blue add-to-cart-looking glow ([buttons.css:75-89](store/frontend/src/styles/buttons.css#L75)). So the card has a button that *looks* like "add to cart" but means "show", duplicating the image tap. Either drop the redundant pill, or make it the actual primary action ("עיצוב" / "הוסף") so the prominent button does the valuable thing.

### U3 — Two near-duplicate lead forms with different validation rigor
The landing contact form ([LandingPage.jsx:411-440](store/frontend/src/pages/LandingPage.jsx#L411)) and the cart quote form ([CartPage.jsx:140-165](store/frontend/src/pages/CartPage.jsx#L140)) both submit leads, but only the cart form validates phone format and email ([CartPage.jsx:79-88](store/frontend/src/pages/CartPage.jsx#L79-L88)). A user who fat-fingers their phone on the landing form gets a silently bad lead. Extract one shared `<LeadForm>` (or at least one `validateLead()` helper) so validation, error copy, and success states are identical.

### U4 — Inputs are missing `autoComplete` (and the cart form bypasses the field system)
Neither lead form sets `autoComplete` on name/tel/email/address, so mobile browsers won't offer autofill — friction on the exact form that converts. Add `autoComplete="name" | "tel" | "email" | "street-address"` and `inputMode="tel"` / `inputMode="email"`. Separately, the cart form uses bare `<input>` with `.cart-field` ([CartPage.jsx:141](store/frontend/src/pages/CartPage.jsx#L141)) while the landing form uses the shared `.field` styles — folding both into `.field` (U3) removes the divergence.

### U5 — Loading states pop in instead of settling in
Showroom shows a plain "טוען דגמים…" string ([ShowroomPage.jsx:152](store/frontend/src/pages/ShowroomPage.jsx#L152)); the landing gallery renders nothing until data arrives, then snaps in. A lightweight **skeleton grid** (a few `--surface-2` placeholder cards with a shimmer) on these two surfaces removes the layout shift and reads as much more polished. The tokens for it (`--surface-2`, `--radius`, `--ease`) already exist.

---

## 🟡 Consistency with the design system

### M2 — Route the emoji through `Icons.jsx`
(Pairs with A3.) The app has a coherent SVG icon set; the emoji glyphs are the only place that breaks it. Swapping them is purely visual-consistency + a11y, no behavior change.

### M3 — The public storefront opts out of the theme system
[CartPage.jsx:57-60](store/frontend/src/pages/CartPage.jsx#L57-L60) hardcodes `document.body.style.background = "#0d0d0f"` — a raw hex that isn't even a token (dark `--bg` is `#0a0f1f`), and it forces a dark page regardless of the user's chosen theme. The token system supports `light` / `dark` / `sepia` ([tokens.css](store/frontend/src/styles/tokens.css)) and the admin honors it; the storefront ignores it. If the dark look is a deliberate brand choice, fine — but encode it as a scoped theme (e.g. `.landing, .showroom, .cart-page { /* dark token overrides */ }` or a `data-theme` wrapper) instead of mutating `body.style` with a magic hex, so it stays consistent and themable.

### M4 — Fake back-arrows via inline `transform: rotate(180deg)`
[CartPage.jsx:137](store/frontend/src/pages/CartPage.jsx#L137) & [177](store/frontend/src/pages/CartPage.jsx#L177) rotate an `<ArrowRight>` 180° with an inline style to make a back arrow. There's an `ArrowLeft` already imported in the designer — use the real icon (and in RTL, "back to home" should point the natural reading direction). Minor, but inline transforms on icons are a smell.

---

## ⚪ Polish (nice-to-have)

- **P1 — Per-route document title.** All routes share one `<title>`. Set `document.title` per page (e.g. "התצוגה · Forma", "העגלה שלי · Forma") for better tabs/bookmarks/back-button context.
- **P2 — Touch targets.** The header `.cart-icon` is 36×36 ([base.css:176-187](store/frontend/src/styles/base.css#L176)); the cart edit/remove icon buttons are small. The recommended minimum is ~44×44 for thumbs — bump the tap area (padding or min-size) even if the visual glyph stays small.
- **P3 — `RippleTitle` is mouse-only and heavy.** [LandingPage.jsx:461-488](store/frontend/src/pages/LandingPage.jsx#L461) wraps every H1 letter in a `<span>` with per-letter `onMouseEnter` color shifts — no touch equivalent, and it bloats the most important heading's DOM. Low value for the cost; consider a single CSS hover sheen instead, or drop it on touch devices.
- **P4 — `ItemCard` placeholder** uses the text "אין תמונה" while `ClosetCard`/`ShowroomCard` use 🪟 — pick one placeholder treatment (ideally a muted SVG) so empty-image states look the same everywhere.

---

## What's already excellent

Genuinely strong work worth preserving — these are why the bar for the rest is high:

- **A real token system** ([tokens.css](store/frontend/src/styles/tokens.css)): a full ramp of spacing, radius, type scale, shadows, easings, and semantic colors — plus **three themes** (light / dark / sepia) and a `prefers-reduced-motion` block that neutralizes all animation. This is design-system maturity most projects never reach.
- **RTL done with logical properties** — `inset-inline-end`, `margin-inline`, `text-align: start` show up where it matters (e.g. the cart badge in [base.css:189-205](store/frontend/src/styles/base.css#L189)), not hardcoded left/right.
- **Performance-aware UX**: the heavy `three.js` designer chunks are **preloaded on idle** and on hover ([LandingPage.jsx:106-120](store/frontend/src/pages/LandingPage.jsx#L106), [343](store/frontend/src/pages/LandingPage.jsx#L343)) with a visible Suspense spinner — the flagship feature opens instantly instead of blank-flashing.
- **The 3D Designer's mobile UX**: a dedicated sticky prev/next bar with a "שלב N מתוך M" indicator ([ClosetDesigner.jsx:487-507](store/frontend/src/pages/ClosetDesigner.jsx#L487)), Escape-to-close, and **state persisted to localStorage** so a closed design is restored — thoughtful, phone-first design for a genuinely complex interface.
- **Admin button + form system** ([forms.css](store/frontend/src/styles/forms.css)): proper `:focus-visible` rings, disabled states, `:active` press feedback, ghost/danger variants — the storefront just needs to inherit the same focus discipline (A1).
- **Honest empty/error/success states** in the cart and showroom (distinct loading / load-error / empty branches), and `loading="lazy"` on gallery imagery.

---

## Suggested order of work

1. **A1, A2, A3** — focus ring on storefront buttons, keyboard-accessible gallery cards, de-emoji. Small, high-impact, unblock keyboard/SR users on the buy path.
2. **A4** — focus-trap the Designer / modals (the marquee feature).
3. **U1, U2** — give the one primary action per screen real button affordance; fix the showroom double-control.
4. **U3, U4** — unify the lead forms + add autocomplete (directly helps conversion).
5. **M3, U5, P1–P4** — theme the storefront properly, skeletons, titles, and polish as you touch each surface.
