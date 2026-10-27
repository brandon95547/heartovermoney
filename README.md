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

## What's in it

| Area | Pages |
| --- | --- |
| Products | Home (`/`, open to everyone), artwork (`/art/[slug]`), cart and checkout, order confirmation |
| Auctions | A lot (`/auction/[id]`): Buy Now before the event, then live bidding |
| The next event | `/events`, the link on the cards handed out: sign in, pick the collector card you'll get at the door, the Joker's game, a line about yourself, then the door or the mail |
| Events | Overview, Details (Tonight's Scoreboard), photo wall, posting a photo, food and drink |
| Posts | `/posts`: every event's photos, the Home of the Posts side. People can thumbs-down a photo (five take it off the wall); admins can remove one, and restore removed photos at `/admin/photos` |
| Collecting | Vault, certificates of authenticity with a QR code (`/certificates/[code]`), city collections |
| Account | Sign in and up, Profile, Settings, Membership tiers, Search |
| Later | Chat (the Connections Messenger) has a placeholder page |

One event runs at a time; `/events` always means the next one. Any membership (from $25 a
month) makes someone a VIP, and only VIPs can buy fine art (prints and founders' art) or take
part in the auction; merch and shoes are open to everyone. The 700 Club is $77 a month, with
700 seats. A 700 Club member who owns more than one fine art piece is a Super Optimistic VIP.

Certificate IDs follow the business plan: `TITLE_NUMBER/EDITION_CITY-ST_MM.DD.YYYY-ARTIST`.

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

The client has answered most of the first questions. Still open: who counts as a Founding
Collector, and how certificates track ownership through resale. The card faces are stand-ins
until the real designs arrive.
