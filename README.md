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
| Products | Home (`/`), artwork (`/art/[slug]`), cart and checkout, order confirmation |
| Auctions | A lot (`/auction/[id]`): VIP-only Buy Now window, then live bidding |
| Events | List, Overview, Details (Tonight's Scoreboard), photo wall, posting a photo, food and drink |
| Collecting | Vault, certificates of authenticity with a QR code (`/certificates/[code]`), city collections |
| Account | Sign in and up, Profile, Settings, Membership tiers, Search |
| Onboarding | `/start`: pick a favorite card, the game, a tagline, then claim at the door or by mail |
| Later | Chat (the Connections Messenger) has a placeholder page |

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

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

The build fails if a page reads the database, cookies or the request outside a `<Suspense>`
boundary (Next.js Cache Components), so run it before pushing.

## Open questions

The questions sent to the client are still open, among them the game's rules (what the card
number does, what the Joker's countdown leads to), so the onboarding game is a stand-in that
shows the flow. The logo is a stand-in until the real branding arrives.
