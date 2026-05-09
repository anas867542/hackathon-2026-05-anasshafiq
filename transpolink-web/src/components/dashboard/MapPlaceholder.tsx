'use client';

const pins = [
  { x: '24%', y: '42%', color: 'bg-emerald-500', pulse: true },
  { x: '52%', y: '58%', color: 'bg-brand-500', pulse: false },
  { x: '68%', y: '28%', color: 'bg-emerald-500', pulse: true },
  { x: '38%', y: '72%', color: 'bg-amber-500', pulse: false },
  { x: '80%', y: '55%', color: 'bg-gray-400', pulse: false },
];

const legend = [
  { color: 'bg-emerald-500', label: 'Available' },
  { color: 'bg-brand-500', label: 'In transit' },
  { color: 'bg-amber-500', label: 'Arriving' },
  { color: 'bg-gray-400', label: 'Offline' },
];

export function MapPlaceholder() {
  return (
    <div className="relative h-64 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 lg:h-72">
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.07)_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* Road lines */}
      <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 600 300" fill="none">
        <line x1="0" y1="150" x2="600" y2="150" stroke="#0d9488" strokeWidth="3" />
        <line x1="300" y1="0" x2="300" y2="300" stroke="#0d9488" strokeWidth="2" />
        <line x1="0" y1="75" x2="600" y2="75" stroke="#0d9488" strokeWidth="1" strokeDasharray="8 4" />
        <line x1="0" y1="225" x2="600" y2="225" stroke="#0d9488" strokeWidth="1" strokeDasharray="8 4" />
        <line x1="150" y1="0" x2="150" y2="300" stroke="#0d9488" strokeWidth="1" strokeDasharray="8 4" />
        <line x1="450" y1="0" x2="450" y2="300" stroke="#0d9488" strokeWidth="1" strokeDasharray="8 4" />
        {/* Route overlay */}
        <path d="M 145 170 Q 250 110 315 160 Q 390 210 450 165" stroke="#14b8a6" strokeWidth="2.5" strokeDasharray="6 3" opacity="0.5" />
      </svg>

      {/* Driver pins */}
      {pins.map((pin, i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: pin.x, top: pin.y }}
        >
          <div className={`size-3 rounded-full ${pin.color} shadow-soft`} />
          {pin.pulse && (
            <div className={`absolute inset-0 rounded-full ${pin.color} animate-pulse-ring opacity-60`} />
          )}
        </div>
      ))}

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/60 dark:border-gray-700 bg-white/85 dark:bg-gray-900/85 backdrop-blur-sm px-5 py-3.5 shadow-card text-center">
          <span className="text-xl">🗺️</span>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Live Driver Map</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-block size-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />
            4 drivers active
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-2.5">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${item.color}`} />
            <span className="text-[10px] text-gray-600 dark:text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
