# TranspoLink Web

Next.js 14 (App Router) frontend for the on-demand truck booking platform. Tailwind CSS, Socket.io for live tracking.

## Run

```bash
cd transpolink-web
npm install
cp .env.local.example .env.local       # point to your API
npm run dev
```

Visit `http://localhost:3000`. Backend must be running on `http://localhost:4000` (or whatever you set in `.env.local`).

## Routes

| Path                      | Description                              | Auth          |
|---------------------------|------------------------------------------|---------------|
| `/`                       | Marketing landing                        | public        |
| `/login`                  | Sign-in (prefilled demo creds)           | public        |
| `/dashboard`              | Customer overview + active trip          | customer      |
| `/book`                   | Book a truck (form + truck selector)     | customer      |
| `/book/[id]`              | Live tracking & status stepper           | customer      |
| `/driver/dashboard`       | Online toggle, incoming requests, stats  | driver        |
| `/driver/trip/[id]`       | Active trip + GPS streaming controls     | driver        |

Role-aware route groups are in `src/app/(customer)/...` and `src/app/(driver)/...` — both wrapped in `<AuthGuard>` and the shared `<Header>`.

## Structure

```
src/
├── app/
│   ├── layout.tsx          root layout, Inter font
│   ├── globals.css         Tailwind base + utilities
│   ├── page.tsx            landing
│   ├── (auth)/login/page.tsx
│   ├── (customer)/
│   │   ├── layout.tsx      AuthGuard role="customer"
│   │   ├── dashboard/page.tsx
│   │   └── book/
│   │       ├── page.tsx        booking form
│   │       └── [id]/page.tsx   live tracking page
│   └── (driver)/
│       ├── layout.tsx      AuthGuard role="driver"
│       ├── driver/dashboard/page.tsx
│       └── driver/trip/[id]/page.tsx
├── components/
│   ├── ui/                 Button · Card · Input · Badge
│   ├── nav/                Header · AuthGuard
│   ├── booking/            BookingForm · TruckTypeSelector · FareEstimate
│   └── status/StatusBadge.tsx
├── hooks/
│   ├── useAuth.ts          session-aware
│   ├── useBookingTracking.ts   customer side
│   ├── useDriverTracking.ts    driver side
│   └── useDriverInbox.ts       incoming requests
├── lib/
│   ├── api/                fetch client + typed endpoints
│   ├── auth/session.ts     localStorage session
│   ├── socket/             Socket.io client + event types
│   └── utils.ts            cn(), formatCurrency, formatRelative
```

## Demo accounts (live on production + after running `npm run db:seed` locally)

| Role     | Email                         | Password      |
|----------|-------------------------------|---------------|
| admin    | admin@transpolink.dev         | Admin@2025    |
| customer | customer@transpolink.dev      | Customer@2025 |
| driver   | driver@transpolink.dev        | Driver@2025   |

> **Tip:** Open two browser windows — one as Customer, one as Driver — to see the live GPS tracking flow end-to-end.

## Notes

- The booking form uses raw lat/lng inputs for clarity; replace with Google Places autocomplete in production.
- The fare estimate runs locally (Haversine) for instant feedback. Server returns the authoritative fare on `POST /bookings`.
- Maps are intentionally not rendered — feed `driverLocation.lat/lng` from `useBookingTracking` into your map of choice (Google Maps JS API, Mapbox, etc.).
