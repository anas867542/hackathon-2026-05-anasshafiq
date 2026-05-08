import { BookingForm } from '@/components/booking/BookingForm';

export default function BookTruckPage() {
  return (
    // Escape the container-page padding on mobile so the map fills edge-to-edge
    // md:mx-0 md:mt-0 restores normal layout on desktop (inside the container)
    <div className="-mx-4 sm:-mx-6 md:mx-0">
      {/* Desktop-only header above the 2-col form */}
      <div className="hidden md:block container-page pt-8 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Book a truck</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set pickup and drop-off, pick a truck size, and we&apos;ll match you with a nearby driver.
        </p>
      </div>

      <div className="md:container-page md:pb-10">
        <BookingForm />
      </div>
    </div>
  );
}
