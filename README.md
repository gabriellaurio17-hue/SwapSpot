# SwapSpot

SwapSpot (also referred to as CITSwapSpot) is a React prototype for a campus marketplace for CIT-U students, faculty, staff, and recognized organizations. It presents buying, selling, renting, shop storefronts, and role-specific workspaces in one interface.

This repository currently contains a **front-end UI prototype**. Its sample content and interactions use local mock data and React state; it is not connected to a production API, database, or authentication provider.

## Contents

- [Features](#features)
- [Routes and demo roles](#routes-and-demo-roles)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Mock data and UI state](#mock-data-and-ui-state)
- [Design and accessibility](#design-and-accessibility)
- [Prototype limitations and production work](#prototype-limitations-and-production-work)

## Features

- **Landing page:** marketplace introduction, sample listings and shops, and the “How it works” section.
- **Browse:** search mock listings and filter by category and budget.
- **Listing detail:** item illustrations and specifications, sale/rental states, rental duration totals, local chat, payment-mode presentation, and request status.
- **Rentals:** sample renting/lending requests and return reminders.
- **Shops:** sample organization storefront, product cards, and reviews.
- **Admin workspace:** report review queue, moderation decisions with reason logging, shop applications, and a read-only audit log.
- **Shop Owner workspace:** inventory search/filtering and stock steppers, sample orders, support chat, storefront preview, and add/edit item screens.
- Responsive layouts, keyboard-operable controls, visible focus states, and reduced-motion handling.

## Routes and demo roles

| Route | Access in the UI prototype | Purpose |
| --- | --- | --- |
| `/` | All roles | Landing page |
| `/#how-it-works` | All roles | Landing page’s How it works section |
| `/browse` | All roles | Search and browse listings |
| `/auth` | All roles | Demo login/signup interface |
| `/auth?mode=login` | All roles | Login view |
| `/auth?mode=signup` | All roles | Signup view |
| `/listing?id=calc-fx991` | Non-visitors | Listing detail; the `id` selects mock data |
| `/rentals` | Non-visitors | Rental tracker |
| `/shop` | Non-visitors | Public shop |
| `/admin` | Admin role only | Admin workspace |
| `/shop-owner` | Shop Owner role only | Shop Owner workspace |
| `/shop-owner/inventory/new` | Shop Owner role only | Add-item form |
| `/shop-owner/inventory/:itemId/edit` | Shop Owner role only | Edit-item form |

The login/signup page has demo controls to continue as **Admin**, **Shop Owner**, **Verified User**, or **Visitor**:

- **Visitor:** can use Home, Browse, and Auth. Rent and Shops are hidden from the top navigation; direct access to listing details, rentals, and shops is redirected to Home.
- **Verified User:** can access the marketplace pages, including Browse, listing details, Rent, and Shops. There is no separate verified-user dashboard route; the marketplace is their main experience.
- **Admin:** can open `/admin`.
- **Shop Owner:** can open `/shop-owner` and its inventory editor routes.

The selected role lives in an in-memory React context (`src/context/AuthContext.js`). It resets on a full page reload. To preview a protected route, open `/auth?mode=login`, choose the appropriate demo role, and navigate within the app. A role mismatch redirects to Home and displays an access message.

These are UI route checks, not security controls. The current non-visitor check also allows Admin and Shop Owner demo roles to access marketplace listing, rentals, and shop routes. Real authorization must be enforced by a backend.

## Getting started

Requirements: Node.js and npm installed.

```powershell
git clone https://github.com/gabriellaurio17-hue/SwapSpot.git
cd SwapSpot
npm ci
npm start
```

The development server opens at <http://localhost:3000>. No environment variables or backend services are required for the current prototype.

### Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the development server |
| `npm test -- --watchAll=false` | Run the test suite once |
| `npm run build` | Create the optimized production build in `build/` |

## Project structure

```text
public/                  Static assets, campus photos, and photo background styles
src/
  components/            Shared UI (Topbar, Logo, ListingCard, DashboardShell, etc.)
  context/AuthContext.js In-memory demo role state
  data/                  Mock listings, shops, rentals, reports, and inventory
  hooks/                  Reusable listing-filter logic
  pages/                  Route-level screens
  utils/                  Validation helpers
  App.js                  Route definitions, role guards, and lazy page loading
  index.js                React entry point
  index.css               Global styles, theme, and page/dashboard styling
```

### Main files

- `src/App.js` defines routes, lazy-loads pages, and applies role-based route wrappers.
- `src/pages/Auth.js` provides the demo login/signup UI and role selector.
- `src/components/Topbar.js` renders marketplace navigation and hides Rent/Shops for Visitors.
- `src/pages/Listing.js` renders a listing using the `listings` mock data in `src/data/mock.js`.
- `src/pages/Admin.js` and `src/pages/ShopOwner.js` render the two workspaces.
- `src/components/DashboardShell.js` contains shared dashboard layout, navigation, stats, and account menu.
- `src/pages/ShopOwnerInventoryForm.js` renders the add/edit item screens.
- `src/data/shopOwnerInventory.js` contains the Shop Owner’s sample inventory records.
- `src/index.css` contains the global design system and the listing/dashboard styles.
- `public/` contains campus background images and related assets.

## Mock data and UI state

`src/data/mock.js` exports the sample listings, shops, shop items, rentals, process steps, reports, applications, and chat messages. The Shop Owner’s sample inventory is in `src/data/shopOwnerInventory.js`.

Interactions are illustrative and generally remain in component state:

- Browse filters update the visible mock listing cards.
- Listing detail updates rental totals, chat messages, favorite state, and request/payment indicators locally.
- Admin decisions remove a report from the local queue and add an audit entry for the current page session.
- Shop Owner stock steppers and support replies update local UI state.
- The item form displays a saved state but does not persist the item to the shared inventory.

Refreshing or leaving the page resets these demo changes. Login/signup validates input and displays UI feedback, but does not create an account or authenticate against a server.

## Design and accessibility

The visual system uses a maroon, gold, cream, and dark-text palette with Fraunces display headings and Manrope body text. Global styles are in `src/index.css`; campus background images are stored in `public/`. Dashboard-only styles use the `dash-` class prefix, and listing-detail styles use `ld-`.

The UI includes responsive layouts, labels for controls, semantic landmarks, focus indicators, and reduced-motion handling. Keep those behaviors in mind when extending or replacing the prototype screens.

## Prototype limitations and production work

- **Authentication and roles:** demo role state is client-only and resets on reload. It is not proof of identity.
- **Authorization:** React route guards can be bypassed and must not be trusted for real access control. The route guard includes a TODO to enforce authorization in the ASP.NET Core API and Supabase Row Level Security (RLS).
- **Persistence:** listings, inventory, decisions, orders, messages, and account state are mock data or in-memory UI state. There is no database connection.
- **Payments:** SwapSpot only presents payment information in the UI; it does not process or verify transfers.
- **Uploads:** the inventory form’s photo control is a UI affordance; file storage and image persistence are not implemented.

Before production use, connect the screens to real services, implement server-side authorization and data validation, define persistence and account flows, and add appropriate tests for those integrations.
