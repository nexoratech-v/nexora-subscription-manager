# Changelog

## [1.1.3]

### Changed — Subscription page spacing
Measured the computed styles rather than trusting the stylesheet, and found three inconsistencies that made the page feel unsettled:

- **Corner radii** — section-level cards mixed 18px and 14px. The referral card looked like a list item rather than a section
- **List item padding** — the app card used 16px while videos and details used 14px
- **List item spacing** — videos sat 10px apart, apps 12px, FAQ entries 8px. Three rhythms in one column

Now two levels: section cards at 18px with 16px between them, list items at 14px with 10px between them. Verified in a real DOM, not just in the CSS file.

## [1.1.2]

### Fixed
- **`/api/admin/bot/settings` could return 500 and blank the panel.** If `settings` or `topics` held `null` or an array, the parsed value wasn't an object and the frontend crashed reading `.name`. Both sides are now defensive, and the endpoint returns a readable error instead of 500
- The bot section shows a **recovery screen with a retry button** instead of a white page when settings can't be read
- `ThemeStep` was defined inside the component body, so React rebuilt its subtree on every render — causing visual jumps and losing the entrance animation

### Changed — Themes section spacing
Four inconsistent gaps (6, 8, 10 and 12px) sat in the same view, leaving no rhythm for the eye. Now a two-step scale: 8px inside cards, 12px between them.

- Palette swatches grew from 30 to 44px so the colour is actually readable
- The selected card lifts and casts a coloured shadow, rather than only gaining a border
- Check marks sit in a solid circle instead of floating on the gradient

## [1.1.1]

### Fixed — Depth was written but never visible
Two CSS rules were silently cancelling the new depth work:

- `.subscription-card.disconnected` sets its own shadow, and being two classes it outranked the single-class depth rule. The main card stayed flat. Fixed by matching the same specificity and giving the disconnected state its own depth in alert colours
- Palettes with `glow: 0` (Carbon, Minimal) removed shadows entirely with `box-shadow: none !important`, flattening every card. That switch now only removes the coloured halo — the depth shadows stay

Caught by reading the computed style in a real DOM rather than trusting that the CSS was present in the file.

## [1.1.0]

### Changed — Depth and motion
The subscription page and panel now have a consistent sense of physical depth, built entirely from shadows and gradients — no images, no libraries, and it works with all 8 palettes.

- **The usage ring became the signature element** — it sits in a recessed well with a glass highlight across its surface and light spilling from behind. On first load it sweeps from zero to the real figure while the number counts up, because that reading is what the customer opened the page to see
- Cards catch light along their top edge and cast a shadow below, so the eye knows what sits in front
- Buttons press down when tapped, like a physical key
- Cards tilt up to 4° following the cursor — only on devices with a precise pointer, since it means nothing on a phone
- The panel uses the same language: the sidebar indicator slides rather than jumps, dashboard figures count up, and modals open from their own centre

Motion is deliberately sparse. There is one orchestrated moment — the page entrance — and everything else is a small response to something the user did. **All of it is disabled when the system asks for reduced motion.**

## [1.0.0] — First public release

Everything below ships in the first version.

### Subscription page
- 4 layouts × 8 palettes, custom palettes, live preview in the panel
- One-tap install for Happ, v2rayNG, V2Box; QR; copy link
- FAQ in 4 languages, tutorial videos from Telegram, warning banners
- Referral card, help popup, custom CSS and footer

### Telegram sales bot
- Plans, card-to-card payment, photo and text receipts
- One-tap approve with automatic provisioning in 3x-ui
- Rejection with a reason and automatic coin refund
- Coin and referral system with a discount ladder
- Wallet, renewal, auto-renew, free trial
- Optional phone collection, expiry reminders, tickets
- Admin panel inside the bot, plus an admin group with topics

### Resellers
- Per-reseller brand, palette, layout and links
- Detection by email prefix or domain

### Operations
- Step-by-step 3x-ui connection test that provisions and cleans up a probe config
- Bot control, backup and restore from the panel
- Conversion funnel and statistics
- Snapshots, rollback, self-healing update
