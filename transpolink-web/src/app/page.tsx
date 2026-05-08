import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Button } from '@/components/ui/Button';

const features = [
  {
    icon: '⚡',
    title: 'Real-time matching',
    body: 'Nearby drivers are notified the moment you create a booking. No phone calls, no waiting.',
  },
  {
    icon: '📍',
    title: 'Live GPS tracking',
    body: 'Watch your shipment move on the map from pickup to drop-off. Share the link with anyone.',
  },
  {
    icon: '💬',
    title: 'Transparent pricing',
    body: 'See an estimate up-front, or open it to bidding and pick the offer you like best.',
  },
];

const truckTypes = [
  { label: 'Mini truck',   capacity: 'up to 800 kg',  emoji: '🚐' },
  { label: 'Pickup',       capacity: 'up to 1 ton',   emoji: '🛻' },
  { label: 'Medium truck', capacity: 'up to 3 tons',  emoji: '🚚' },
  { label: 'Large truck',  capacity: 'up to 7 tons',  emoji: '🚛' },
  { label: 'Container',    capacity: '20+ tons',      emoji: '📦' },
];

const stats = [
  { label: 'Avg match time', value: '~45s' },
  { label: 'Truck types',    value: '7'    },
  { label: 'Cities',         value: '12+'  },
];

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <section className="container-page py-16 sm:py-24">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                <span className="size-1.5 rounded-full bg-brand-500 animate-pulse" aria-hidden />
                On-demand goods transport
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                Move anything,<br className="hidden sm:block" /> anywhere —<br className="hidden sm:block" />{' '}
                <span className="text-brand-600">in minutes.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
                TranspoLink is the fastest way to book a truck. Set pickup and drop-off,
                pick a truck size, and a driver near you accepts in seconds.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/book">
                  <Button variant="brand" size="lg">Book a truck</Button>
                </Link>
                <Link href="/register?role=driver">
                  <Button size="lg" variant="secondary">Drive with us</Button>
                </Link>
              </div>
              <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-zinc-200 pt-6">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dt className="text-xs text-zinc-500">{s.label}</dt>
                    <dd className="mt-1 text-2xl font-bold text-zinc-900">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Hero visual */}
            <div className="relative">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-brand-50 via-white to-zinc-50 p-6 shadow-card-hover">
                {/* Mock trip card */}
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white text-sm font-bold shadow-soft">
                        T
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">Live trip · TPL-7K3M9X</p>
                        <p className="text-xs text-zinc-500">Driver: Bilal Ahmed</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                      Live
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        <div className="size-2.5 rounded-full bg-brand-600" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">Gulberg III, Lahore</p>
                        <p className="text-xs text-zinc-500">Pickup · 12 min ago</p>
                      </div>
                    </div>
                    <div className="ml-1.5 h-6 w-px bg-zinc-200" />
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        <div className="size-2.5 rounded-full border-2 border-zinc-400 bg-white" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">DHA Phase 5</p>
                        <p className="text-xs text-zinc-500">ETA · 8 min</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-zinc-100">
                    <div>
                      <p className="text-xs text-zinc-500">Estimated fare</p>
                      <p className="text-lg font-bold text-zinc-900">PKR 1,840</p>
                    </div>
                    <div className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white text-lg">
                      🚛
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-zinc-200 bg-white">
          <div className="container-page py-16">
            <div className="mb-10">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
                Built for shippers and drivers
              </h2>
              <p className="mt-2 text-zinc-500">Everything you need to move goods reliably.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6">
                  <div className="mb-4 grid size-12 place-items-center rounded-xl bg-white text-2xl shadow-soft">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Truck types */}
        <section className="container-page py-16">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Pick the right size</h2>
            <p className="mt-2 text-zinc-500">From parcels to pallets to full containers.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {truckTypes.map((t) => (
              <li
                key={t.label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-5 text-center transition-shadow hover:shadow-card"
              >
                <span className="text-3xl" aria-hidden>{t.emoji}</span>
                <div className="font-semibold text-zinc-900">{t.label}</div>
                <div className="text-xs text-zinc-500">{t.capacity}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="border-t border-zinc-200 bg-brand-600">
          <div className="container-page flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Need a truck right now?</h2>
              <p className="mt-2 text-brand-200">Drivers within 5 km will see your request instantly.</p>
            </div>
            <Link href="/book">
              <Button variant="secondary" size="lg" className="whitespace-nowrap">
                Book in 30 seconds →
              </Button>
            </Link>
          </div>
        </section>

        <footer className="border-t border-zinc-200 bg-white">
          <div className="container-page py-8 text-center text-xs text-zinc-400">
            © {new Date().getFullYear()} TranspoLink · On-demand goods transport
          </div>
        </footer>
      </main>
    </>
  );
}
