# Changelog

## [1.1.1]

### Fixed
- **Nodes stayed offline even though the agent was checking in.** The tunnel module read
  its database path once at import time, but import order under uvicorn is not
  guaranteed — if the environment variable was not set at that moment, the wrong path
  stuck for the life of the process and every write went silently to another file. The
  path is now resolved on each connection

### Changed
- **The agent installer verifies each step and prints in English.** It confirms the
  panel is reachable before installing anything, checks the downloaded file is valid
  Python, performs one manual check-in, and only then installs the service. A failure at
  any step stops with the reason
- All shell and CLI output is now English; comments in the source stay Persian

## [1.1.1]

### Changed
- **Shell and CLI output is now English.** Persian renders as mangled boxes on most
  Linux terminals, so error messages from install and repair scripts were unreadable —
  which meant real failures went unnoticed. All 178 output lines across the scripts,
  tools and agent are now plain ASCII. Comments in the source stay Persian

### Added
- **«چرا آفلاین؟»** on any node the panel shows as offline. It reports whether the agent
  has ever checked in, when it last did, and gives the four commands to run on the
  Iranian server — status, live log, panel reachability and restart
- `rebuild.sh` rebuilds the panel from scratch when it comes up unstyled or shows
  `undefined` — usually a stale `dist`. It verifies the stylesheet before installing it
  and restores the previous build on failure

## [1.1.1]

### Added
- `rebuild.sh` rebuilds the panel from scratch when it comes up unstyled or shows
  `undefined` where data should be — usually a stale `dist` left behind by a build that
  did not finish. It clears the Vite cache, rebuilds, and refuses to install the result
  unless the stylesheet is a sensible size and contains the colour variables and
  component classes. The previous build is restored if anything fails

## [1.1.1]

### Fixed
- **Creating a config failed with HTTP 404 on 3x-ui 3.5.** The client called
  `/panel/api/inbounds/addClient`, which that version no longer serves. Rather than
  guessing the new path, the client now tries the known candidates in order, keeps
  whichever answers, and reuses it. If none work it reports every path it tried instead
  of a bare 404. This also unblocks order approval, which was silently stuck because
  provisioning failed
- **Receipt images never loaded in the panel.** An `<img>` tag cannot send the admin
  password header, so every request came back 401. The endpoint now also accepts the
  password as a query parameter

### Added
- **سفارش‌های من** in the bot — every order with its status, amount, coins spent, and
  the rejection reason when there is one. Previously the only way to ask was support

## [1.1.2]

### Added
- **Per-gigabyte pricing for resellers.** Where the deal is by traffic rather than by
  plan, switch the group to حجمی and set a rate per GB. The amount is calculated from
  actual usage, not the plan ceiling, and the panel shows the arithmetic as you type

### Fixed
- **`nexora update` accepted a broken build.** It only checked that `index.html`
  existed. If Tailwind failed to run, the build still succeeded with a nearly empty
  stylesheet and the panel came up unstyled. The stylesheet size is now verified, and
  the previous build is restored if it is too small
- The tunnel form asked for an address without making clear which server it belonged
  to. It now shows the traffic direction and states plainly that the address is the
  Iranian server, since the foreign server is the one that dials in

## [1.1.1]

### Added
- **Chisel** as a fifth tunnel engine. It carries traffic inside ordinary HTTP, which
  tends to keep working when other protocols get filtered — marked recommended
  alongside Backhaul. It takes command-line arguments rather than a config file, and
  ships a single gzipped binary rather than an archive, so the agent handles both cases

### Changed
- The port list in the tunnel form was a column of full-width fields for four-digit
  numbers. Ports are now compact chips laid out inline, with one-tap shortcuts for 443,
  8443, 2053, 2087 and 80

## [1.1.0]

### Changed
- **IRANSansX replaces Vazirmatn** in the panel. Two `@font-face` declarations and one
  changed line in `body` — nothing else in the stylesheet was touched

### Fixed
- Reverted the stylesheet to its original form. Earlier edits had rewritten sixteen
  utility classes and dropped five others (`fx-search`, `fx-side`, `fx-topbar`,
  `fx-badge`, `fx-card-hl`), which is what broke the layout
- Removed an nginx block containing `types { }`, which clears MIME mappings and made
  the server send stylesheets as `application/octet-stream`. Browsers refuse a
  stylesheet sent under the wrong type. `fix-nginx.sh` repairs servers that already
  have it

## [1.1.0]

### Fixed — The panel served CSS the browser refused to use
A `location /fonts/` block added to the nginx config contained `types { }`, which
clears every MIME mapping for that location. Worse, nginx applied the emptied mapping
more broadly than intended, so stylesheets went out as
`application/octet-stream` — and browsers will not apply a stylesheet sent under the
wrong type. The file itself was perfect, which is why every check on the file passed.

The block is removed, and `fix-nginx.sh` repairs servers that already received it: it
backs up the config, strips the block, verifies `nginx -t` before reloading, rolls back
if anything fails, and then fetches the CSS to confirm the type is right.

### Added
- `tools/test-serve.py` serves the built files over HTTP and makes the same requests a
  browser would — checking status, MIME type and size for the stylesheet, every font it
  references, and the bundle. File-level checks cannot catch a transport problem

## [1.1.0]

### Added — Tunnel management
A fourth workspace for connecting an Iranian server to your foreign one, so the panel
itself never has to live inside Iran.

**Four engines:** Backhaul (recommended), Rathole, GOST and FRP. Each config is
generated for both ends from a single form.

**Agent, not SSH.** The Iranian server runs a small agent that connects out to the
panel. It opens no ports and stores no password — just a token you can revoke per
server. The agent only understands a fixed set of commands, so even a compromised panel
cannot run arbitrary code on it. Installation is one curl command.

**What you get:** live CPU, memory and disk from each server; deploy, restart, stop and
log from the panel; the foreign-side config ready to copy; an event log of what
happened.

The agent depends only on the Python standard library — no pip install on a server that
may have restricted internet.

## [1.1.2]

### Fixed — The panel rendered without any styling
Editing `index.css` to add the font block had removed two things the whole interface
depends on: the `:root` block holding all sixteen colour variables, and sixteen utility
classes including `.fx-input`, `.fx-stepper` and `.fx-table`. Every `var(--...)`
resolved to nothing and inputs fell back to browser defaults.

`npm run build` succeeded both times, which is the whole problem — a nearly empty
stylesheet is still a valid stylesheet.

### Added
- `tools/test-render.cjs` runs the built CSS in a simulated browser and reads real
  computed styles: utility classes resolve to the right values, all sixteen colour
  variables have values, the font reaches `body`, and every `fx-`/`nx-` class used in
  the panel exists. Run it after every build

## [1.1.1]

### Fixed — The panel lost all styling
Adding the font block to the top of `index.css` overwrote the three `@tailwind`
directives that pull in every utility class. The build still succeeded and the CSS file
was still produced, just nearly empty — so the panel rendered as unstyled HTML with
default browser buttons.

`tools/check-api-contract.py` now verifies the Tailwind directives are present and that
the font is not only declared but actually applied to `html`/`body`. Both failures are
silent at build time, which is exactly why they need an explicit check.

## [1.1.0]

### Fixed — The font never applied
Three `@font-face` rules loaded IRANSansX correctly, but nothing ever set it as the
page font: the rule that put the stack on `html`/`body` had been lost. The browser fell
back silently, which is why clearing the cache changed nothing. The stack now sits on
`html`, `body` and `#root`, and form elements inherit it explicitly.

Nginx also gained a `/fonts/` block with correct MIME types and a revalidating cache,
so replacing a font file no longer leaves browsers holding the old one for months.

### Changed — Client list is far more readable
Rows are taller and carry more at a glance: plan volume, device limit, reset count and
Telegram link sit under the email; creation date shows the subscription length beneath
it; days remaining is a large figure that turns amber near expiry and red past it;
renewals are badged and marked when the count is estimated; usage shows the figure, a
coloured bar and the percentage together.

## [1.0.9]

### Added — Every client in one view
A new page under Accounting listing every config on the server, including those in no
group at all. Built to answer questions about a single customer without opening 3x-ui:

- Who renewed and who did not, how many times, and whether that count is certain or
  estimated from the create-to-expiry gap
- Days remaining, with expiring and expired rows coloured
- Traffic used against quota, with a usage bar
- Created and expiry dates in Jalali, subscription length, device limit, reset count,
  Telegram ID, subscription ID and any note left on the config
- Amount owed per client where the group has rates

Filter by group, status or renewal state; search across email, group and notes; sort by
any column. Status counts double as filter buttons. Row click opens full detail.

Also exports to CSV with a BOM so Excel reads Persian correctly.

## [1.0.9]

### Fixed
- **The font declarations were ordered so browsers could skip IRANSansX entirely.**
  The variable font was declared first under the same family name; if a browser
  didn'''t support `woff2-variations` it had nothing to fall back to. Static weights
  now come first under the primary name, with the variable font as a separate family
- **The invoice table left a large gap at the bottom of each page.** Row capacity was
  computed from the first page, which is shorter because of the summary cards, so later
  pages stopped early. Each page now uses its own height, and the space the totals need
  is reserved so they never spill onto a page of their own

## [1.0.8]

### Changed
- **IRANSansX is now the panel and invoice font**, bundled locally rather than fetched
  from Google. The variable web font covers every weight in one file, and the TTFs
  carry the joined Arabic glyphs the PDF needs
- **The PDF invoice was rebuilt on a light, print-ready layout** — navy header rule,
  summary cards with the payable amount set apart, a bordered table with alternating
  rows, highlighted renewal cells, per-group and grand totals, then a closing page for
  the calculation method and rows needing review

### Fixed
- **Rollback did nothing when triggered from the panel.** The service runs with a
  minimal PATH that may not include /usr/local/bin, so calling `nexora` by name failed
  silently. The full path is resolved first, the process is detached properly, and PATH
  is now set in the unit file
- The rollback card sat flush against the card above it

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
