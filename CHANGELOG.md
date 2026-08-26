# Changelog

## [1.0.3]

### Fixed — Accounting couldn't reach the 3x-ui database
Three separate problems stacked on top of each other, each hiding the next.

- **The error screen showed a fixed message rather than the real cause.** The backend
  had been reporting the actual problem, but a generic paragraph about `XUI_DB_PATH`
  sat underneath it — and that's what people read. The path itself was pulled from the
  wrong field, so it never appeared at all
- **A manually set path won even when it pointed at nothing.** One typo, or an
  invisible character carried in by copy-paste, disabled accounting for good. The path
  is now checked before use and the other sources are tried as a fallback
- **WAL side files were not accounted for.** When 3x-ui runs in WAL mode, SQLite also
  needs `-wal` and `-shm`; without them it refuses to open the database and blames the
  main file. Nexora now names the exact file that needs fixing
- An earlier fallback used `immutable=1`, which opens a WAL database but hides
  everything written since the last checkpoint — tables looked empty rather than
  erroring. That path is now only taken when no `-wal` file exists

### Added
- **Connection diagnosis inside the panel.** A button on the error screen walks every
  step — where the path came from, whether the file exists, permissions on all three
  files, which user the panel runs as, opening the database, reading the schema, and
  listing the groups — and shows which step failed along with the command to fix it
- `nexora fix-xui` finds the database, repairs permissions on the side files too, and
  writes the path to both the service and the panel settings
- `billing-doctor.sh` for diagnosing from the shell

### Changed
- `systemctl status nexora` works now; the service is `nexora-panel` and an alias is
  created at install
- Panel font stack falls back through Segoe UI and Noto Sans Arabic, with tabular
  figures so numbers don't jump
- The label inside the usage ring takes the brand colour, and section headings gained
  a coloured marker, so a gold palette no longer leaves grey text beside a gold ring
- Snapshot cards and warning boxes had no breathing room

## [1.0.2]

### Fixed
- **The 3x-ui connection error was always the same generic message.** Every failure
  was swallowed and reported identically, so a permission problem looked the same as
  a missing file. It now reports the actual cause — missing folder, missing file,
  no read permission (with the `chmod` command), a locked database, or a file that
  isn't SQLite at all
- Opening the database now runs a real query, because SQLite accepts a corrupt file
  silently until you touch a table
- Warning boxes sat flush against the buttons above them

### Added
- **PDF invoices** — a landscape summary page plus a full per-config breakdown:
  volume, usage, months, renewals, rate and amount for every client, with a running
  total per page. Persian text is shaped and laid out right-to-left, and the font is
  chosen by testing that it actually contains the joined glyphs rather than trusting
  its name

### Changed
- The label inside the usage ring took the brand colour instead of a flat grey, and
  section headings gained a coloured marker, so a gold palette no longer leaves grey
  text sitting next to a gold ring
- Panel font stack falls back through Segoe UI and Noto Sans Arabic if Vazirmatn
  fails to load, with tabular figures so numbers don't jump

## [1.0.1]

### Fixed
- **`systemctl status nexora` didn't work** — the service is called `nexora-panel`.
  An alias is now created at install, and `nexora doctor` adds it to existing setups
- **Accounting couldn't find the 3x-ui database.** The path came only from an
  environment variable, so installs that predate it had no way to fix it. The path is
  now settable from the panel, falls back to the environment variable, and finally
  probes the common install locations
- **The usage ring ignored the palette.** Its colours were hard-coded teal, amber and
  red, so a gold palette still drew a teal ring. It now uses the brand colour, and only
  switches to a warning colour when the quota is nearly gone

### Added
- **Accounting settings page** — see where the 3x-ui database is, pick from paths found
  on the server, or set one manually
- **Backup and restore for accounting** — rates, payments and the renewal log. A safety
  copy is taken before any restore

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
