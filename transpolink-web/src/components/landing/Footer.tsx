import Link from 'next/link';

const links: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: 'Book a truck', href: '/book' },
    { label: 'Drive with us', href: '/register?role=driver' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing', href: '#faq' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#contact' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ],
};

const socials = [
  { label: 'X', icon: 'X' },
  { label: 'LinkedIn', icon: 'in' },
  { label: 'Facebook', icon: 'f' },
];

export function Footer() {
  return (
    <footer className="bg-[#050F1A] border-t border-white/5">
      <div className="container-page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="grid size-8 place-items-center rounded-xl bg-brand-600 text-white font-bold text-sm">
                T
              </div>
              <span className="font-bold text-white">TranspoLink</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Pakistan's fastest on-demand truck booking platform. Move anything, anywhere — in minutes.
            </p>
            <div className="mt-5 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="grid size-8 place-items-center rounded-lg bg-white/5 text-xs font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                {group}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} TranspoLink. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">Made in Pakistan 🇵🇰</p>
        </div>
      </div>
    </footer>
  );
}
