# Heart Over Money

The staging website for Heart Over Money: limited-edition art from the mission, the live
Art + Charity events, and the collector's card onboarding. Mobile first; it widens to a
centered column on tablets and desktops.

Next.js 16 (App Router, React 19), Tailwind CSS 4, Postgres 16 through Drizzle ORM.

## Running it locally

You need Node 20 or later and Docker.

```bash
npm install
cp .env.example .env.local      # then set SESSION_SECRET: openssl rand -base64 32
npm run db:up                   # Postgres 16 in Docker, on port 5434
npm run db:migrate              # create the tables
npm run db:seed                 # demo data (wipes the tables first)
npm run dev                     # http://localhost:3100
```

`npm run db:seed` can be run again at any time to reset the demo data. The demo accounts
(an admin, a VIP and a member) and their password are listed at the top of
`scripts/seed.ts`.

## Test mode

Nothing is charged. Checkout, Buy Now, food orders and memberships are recorded as paid
straight away, and every payment screen says so. Card payments (Stripe test mode first) come
next.

## Email

Password resets and Contact messages send email through any SMTP provider: set `SMTP_URL`
and `MAIL_FROM` (and `CONTACT_EMAIL` for where Contact messages go). Without `SMTP_URL`
nothing is sent; the email is written to the server log instead, so on a machine without
mail the reset link is in the log.

## What's in it

| Area | Pages |
| --- | --- |
| Products | Home (`/`, open to everyone), artwork (`/art/[slug]`), artists with Follow (`/artists/[slug]`), collections (`/cities`, `/cities/[slug]`), cart and checkout, order confirmation |
| Auctions | All lots by phase (`/auctions`), and a lot (`/auctions/[id]`): VIP early Buy Now before the event, then live bidding. `/auction/[id]` redirects there |
| The next event | `/events`, the link on the cards handed out: sign in, pick the collector card you'll get at the door, the Joker's game (timed on the server), a line about yourself (with a VIP upgrade for non-VIPs), then the door or the mail, and a QR code for the door |
| Events | Overview (with the contract's terms and documents), Details (Tonight's Scoreboard), photo wall (share, download), posting a photo, food and drink |
| Posts | The current event's Overview (`/posts` redirects there): its posts are photos attached to the event, with hashtags. People can thumbs-down a photo (five take it off the wall); admins can remove one, and restore removed photos at `/admin/photos` |
| Collecting | Vault, certificates of authenticity (`/certificates/[code]`): a public check that a piece is genuine, with its ownership record; the owner's name shows only to the owner |
| Stories | Films (`/films`, `/films/[slug]`), The mission, About, Contact |
| Account | Sign in and up, Forgot details (`/reset-password`), Profile, My cards (`/profile/cards`), Settings (shipping address, email updates, password), Membership, Search with filters |
| Admin | `/admin`, for accounts with the admin role (see below) |
| Posts: Chat | `/chat`, the Connections Messenger: the attendee list (guests who allow it in Settings); messaging itself is next |

Navigation (agreed with the client, October 2026): the site has two sections. **Products**
(home `/`, art, artists, collections, auctions, cart) shows Home · Search · ♥ · Profile · Cart;
**Posts** (events and Chat) shows Home · Search · $ · Profile · Chat. Posts' homepage is the
current event's Overview (design page 10): a "post" is a photo attached to an event, shown as a
thumbnail down its left side (with + on top to post one, when signed in) and full screen on the
event's photo wall (page 9), with the poster's hashtags. `/posts` redirects to it. The center icon is
the way to the other section (♥ to Posts, $ back to Products); Home goes to the current
section's homepage; Search searches the current section (`/search?in=posts` on Posts). Pages
shared by both (Profile, Settings, the Vault, the stories) keep the section the visitor came
from (`hom_section` cookie). Nothing opens above the bar. Settings are behind the gear on
Profile. Chat opens the Connections Messenger for guests registered for the next event; a
visitor who isn't signed in is offered sign in, and one who isn't registered goes through the
card process first, which ends at the Messenger. ☰ on the Products home and the Posts feed
opens the site menu (Collections, Auctions, Membership, the next event, Posts, Films, The
mission, About, Contact).

One event runs at a time; `/events` always means the next one. Any membership (from $25 a
month) makes someone a VIP. Only VIPs can buy fine art (prints and founders' art); a guest who
taps Buy is sent to sign in, and a member to Membership, and both come back to the piece.
Merch, shoes and food are open to everyone. Auction lots: Buy Now before the event is a VIP
early deal; at the live auction anyone signed in can bid, except on art lots (`lots.is_art`),
which stay VIP-only. The 700 Club is $77 a month, with 700 seats. A 700 Club member who owns
more than one fine art piece is a Super Optimistic VIP.

Certificate IDs follow the business plan: `TITLE_NUMBER/EDITION_CITY-ST_MM.DD.YYYY-ARTIST`.

## The admin panel

`/admin` runs the site without touching the database. Every change is kept in the activity
log (`/admin/activity`) with who made it, and changes that matter (a membership set by hand,
a piece retired, a refund, a removed bid) need a reason.

| Section | What it does |
| --- | --- |
| Dashboard | What needs doing (orders to hand over or ship, messages, photos the community removed), the next event, the latest orders and changes |
| Orders | Filter by what's open; hand over or ship (with tracking); refund (the order leaves the scoreboard, its numbered pieces are retired) |
| Art | Pieces (price, edition size, release date, pictures), artists, collections (each city's story, song and cover) |
| Editions | Every numbered piece and its owner; record a sale made in person; move a piece to a new owner; mark it void or damaged |
| Events | Details, terms, sponsors, documents, cost goal and charity share; the food and drink menu |
| Cards | Each event's deck; add a run of codes or import printed ones; mark mailed; cancel a registration |
| Auctions | Schedule lots (art or open to all); see bids; remove a bid; close a lot to the top bidder |
| Members | Roles and memberships, 700 Club seats; set a membership by hand; email a password reset link |
| Content | The home page's current drop, the Mission and About introductions, films |
| Photos, Messages, Check-in | Restore removed photos; Contact messages; the door check-in |

A drop with a release date in the future can be bought only by VIPs until then (their early
access). Pictures added in the admin panel are saved with posted photos in `UPLOAD_DIR`.

## Where things are

- `src/app/`: pages, one folder per route. Server Actions are in `src/app/actions/`.
- `src/components/`: shared pieces (navigation, cards, forms, buttons).
- `src/lib/`: data queries (`queries.ts`), the session and current user (`session.ts`,
  `dal.ts`), and formatting, membership tiers and certificate IDs.
- `src/db/schema.ts`: the tables. After changing it, run `npm run db:generate`, then
  `npm run db:migrate`.
- `scripts/seed.ts`: the demo data, and the placeholder pictures in `public/placeholders/`.
- Photos people post are saved in `storage/uploads/` (not in git), or wherever `UPLOAD_DIR`
  points, and served by `/media/[name]`.

## Staging

https://heartovermoney.skylanex.com runs from a checkout in `/var/www/heartovermoney` on the
phansora.com server: the app and its own Postgres in Docker (`docker-compose.prod.yml`),
behind nginx (`/etc/nginx/conf.d/heartovermoney.skylanex.com.conf`, proxying to port 3100).
Docker restarts both after a reboot. Settings are in `.env` beside the compose file on the
server, including `SEED_PASSWORD`, the demo accounts' password there.

To release the latest `master`:

```bash
ssh root@phansora.com 'cd /var/www/heartovermoney && git pull && docker compose -f docker-compose.prod.yml up -d --build && docker image prune -f'
```

Migrations run when the app starts. To reset the demo data on staging (this wipes it):

```bash
ssh root@phansora.com 'cd /var/www/heartovermoney && docker compose -f docker-compose.prod.yml run --rm app npx tsx scripts/seed.ts'
```

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

The build fails if a page reads the database, cookies or the request outside a `<Suspense>`
boundary (Next.js Cache Components), so run it before pushing.

## Open questions

The client has answered most of the first questions. Still open:

- Founding Collector: the call notes say anyone who gives any amount; the business plan
  (page 55) says anyone who owns Year 1 artwork.
- Resale: every numbered piece keeps an ownership record (`provenance`) from its first sale,
  so its history can follow it, but how transfers between collectors work isn't decided.
- Bidding: the overview says everyone bids at the live auction and the client says art is
  VIP-only; the site does both (art lots VIP-only), pending his confirmation.
- The card faces and the film posters are stand-ins until the real designs and films arrive.
- Card payments: everything is still test mode, including memberships and refunds.
