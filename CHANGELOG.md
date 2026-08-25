# Changelog

## [1.0.0] — First release

### Subscription page
- 4 structures × 8 palettes, plus custom palettes
- One-tap install for Happ, v2rayNG and V2Box; QR codes; copy link
- Usage ring that sweeps from zero on load, with the figure counting up
- Depth built from shadows and gradients — no images, works with every palette
- Text colour on branded surfaces is computed from real contrast, so every
  palette stays readable
- FAQ in Persian, English, Turkish and Arabic
- Tutorial videos hosted on your Telegram channel

### Telegram sales bot
- Plans, card-transfer payment, photo and text receipts
- One-tap approval with automatic provisioning in 3x-ui
- Rejection with a reason, and spent coins are refunded
- Coin and referral system with a discount ladder
- Wallet, renewal, auto-renew, free trial
- Optional phone collection, expiry reminders, support tickets
- Admin panel inside the bot, plus an admin group with topics

### Accounting for resellers
- Groups read straight from `x-ui.db`, read-only, with real usage
- Per-group rate tables: any volume you type, or unlimited
- Payments logged in Nexora, since 3x-ui doesn't record them
- Invoices with a per-config breakdown
- Renewal log — past months are estimated and labelled honestly; from now on
  every renewal made through Nexora is recorded

### Panel
- Three workspace layouts to choose from: accordion, dropdown, icon rail
- Step-by-step 3x-ui connection test that provisions and removes a probe config
- GitHub repository configurable from the panel, verified before saving
- Bot control, backup and restore
- Snapshots, rollback, self-healing update
- `nexora doctor` checks the bot module, billing data and 3x-ui read access
