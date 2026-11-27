# SwapSpot

SwapSpot is a Create React App campus marketplace for CIT-U students, faculty, staff, and recognized organizations. It supports listings for sale or rent, shop storefronts, messaging, rental tracking, reviews, and administrative moderation.

## Features

- Supabase authentication and role-aware application routes.
- Marketplace listings with search, rental requests, transactions, and reporting.
- Realtime buyer/seller messaging.
- Shop applications, approved storefronts, and shop-owner inventory management.
- Rental status tracking, payment status, and transaction ratings.
- Admin report moderation, shop approvals, and an append-only audit log.
- Listing photos and private GCash QR image storage.

## Supabase integration

The app uses Supabase directly through the public client in `src/lib/supabaseClient.js`:

- **Auth:** Supabase Auth manages account sessions. User role and account status are read from `profiles`.
- **Postgres:** Marketplace, shop, transaction, rental, report, and rating data is stored in Postgres. Row Level Security (RLS) policies enforce access. Administrative decisions call audited database functions rather than updating protected tables directly.
- **Realtime:** Supabase Realtime delivers new chat messages.
- **Storage:** Listing photos use the public `listing-photos` bucket. GCash QR images are stored in the private `gcash-qr` bucket and accessed through short-lived signed URLs.

Set these public client environment variables for local development and deployment:

| Variable | Description |
| --- | --- |
| `REACT_APP_SUPABASE_URL` | Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase publishable/anon key |

For local development, create `.env.local` in the project root and set both variables. Never put a Supabase `service_role` key in this React application. The database schema, RLS policies, functions, and storage buckets must already be configured in Supabase.

## Getting started

Requirements: Node.js and npm.

```powershell
npm ci
npm start
```

The development server runs at <http://localhost:3000>.

### Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the development server |
| `npm test -- --watchAll=false` | Run the test suite once |
| `npm run build` | Create the optimized production build in `build/` |

## Main routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Everyone | Landing page and marketplace highlights |
| `/browse` | Everyone | Search and browse available listings |
| `/auth` | Everyone | Sign up or log in |
| `/listing?id=<listingId>` | Logged-in users | Listing detail, request, chat, payment, and rating |
| `/rentals` | Logged-in users | Rental status and return tracker |
| `/messages` | Logged-in users | Buyer/seller conversations |
| `/shop` | Logged-in users | Approved shops and available shop listings |
| `/shop/apply` | Logged-in users | Apply to open a shop |
| `/sell` | Verified users, shop owners, and admins | Create an individual listing |
| `/shop-owner` | Shop owners | Shop inventory and orders |
| `/admin` | Admins | Reports, shop applications, and audit history |

## Deploy to Vercel

1. Import the Git repository into Vercel and keep the Create React App build preset (or set the build command to `npm run build` and output directory to `build`).
2. Add `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in the Vercel project’s Environment Variables for the deployment environments you use.
3. Deploy the project. `vercel.json` rewrites application routes to `index.html` so React Router routes work on direct visits and refreshes.
4. In Supabase Auth settings, configure the production site URL and any required redirect URLs for the Vercel domain.

## Project structure

```text
public/                  Static assets and campus photos
src/
  components/            Shared UI components
  context/AuthContext.js Supabase session and profile context
  hooks/                  Reusable data and chat hooks
  lib/                    Supabase client, storage helpers, and row mappers
  pages/                  Route-level screens
  App.js                  Routes and access guards
```

## Security notes

Client-side route guards provide navigation behavior, not authorization. Supabase RLS and database functions are the authorization boundary. Only public Supabase client credentials belong in the React build; never add a service-role key. Payment transfers are arranged directly between users and are not processed or verified by SwapSpot.
