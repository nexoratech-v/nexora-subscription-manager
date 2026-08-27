# Changelog

## [1.0.7]

### Added — Full PDF invoices
The invoice now carries everything a reseller might question, so the numbers can be
defended line by line:

- Jalali and Gregorian dates for creation and expiry, converted at Tehran time
- Subscription length in days, months billed, and renewals per config
- Plan volume, real traffic used, and usage percentage
- Device limit per config
- Per-page subtotals and a grand total
- A closing page explaining how months are derived, plus every row that needs a human
  look — estimated durations, configs with no expiry, volumes with no rate

Estimated durations are marked in amber in the table rather than presented as fact.

### Fixed
- Restored the connection diagnosis endpoint, which was removed while rewriting the
  PDF generator. `tools/check-api-contract.py` caught it

## [1.0.6]

### Fixed — The reseller toggle switched itself back off
Saving a group sent `billed`, but the endpoint read `billable`, so the flag was always
stored as off. The rate saved fine; the switch did not. Recording a payment had the
same problem with `group` and `date` against `group_key` and `paid_at`.

Both endpoints now accept either spelling, and the save response echoes the stored
value so the interface can confirm rather than assume.

### Added
- `tools/check-api-contract.py` — walks every URL the panel calls and checks it has a
  matching route, then checks the field names both sides use. This class of mismatch
  fails silently: no error, no log, just a blank page or a button that does nothing

## [1.0.5]

### Fixed — The accounting page called endpoints that did not exist
The panel requested `/api/admin/billing/groups` and `/api/admin/billing/payment`, but
the backend only defined `/overview` and `/payments`. Both returned 404, and since a
404 body carries no `error` field, the page fell back to its generic message about the
database path — pointing at the one thing that was never wrong.

Every diagnostic passed because they used the endpoints that did exist. The request the
page actually made was never tested. Both spellings now resolve, and a check across all
frontend URLs confirms each one has a matching route.

## [1.0.4]

### Fixed — Accounting read the data but showed nothing
The panel was reading the 3x-ui database correctly all along — 202 configs, 9 groups,
every diagnostic green — but the page stayed empty. The two sides used different field
names for the same values, so every lookup came back `undefined` and rendered as blank
rather than raising an error: `key` vs `name`, `billable` vs `billed`, `due` vs
`amount`, `estimated` vs `uncertain`, `lines` vs `items`, `group_key` vs `group_name`.

The backend now sends both names for each value. A mismatch like this fails silently,
which is why four rounds of checking paths, permissions and WAL files found nothing.

### Fixed
- The system page showed the rollback card twice — once interactive, once as a static
  command reference

### Added
- **`billing-trace.py`** — runs the exact code path the panel uses and prints the full
  traceback instead of swallowing it. When accounting fails, this says which line broke
  rather than leaving you to guess

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

- **Accounting failed with an empty error while diagnosis passed.** The diagnosis and
  the main page read different things: diagnosis only touches the 3x-ui database, while
  the overview also opens Nexora's own billing database. A corrupt billing file made the
  overview return a 500, and the panel — receiving no error field — fell back to a
  message about the 3x-ui path, sending everyone looking in the wrong place. The
  overview now always returns a readable error, and a corrupt billing file is set aside
  and rebuilt rather than taking the whole section down

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
