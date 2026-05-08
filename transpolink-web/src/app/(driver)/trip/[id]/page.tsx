import { redirect } from 'next/navigation';

export default function LegacyDriverTripRoute({ params }: { params: { id: string } }) {
  redirect(`/driver/trip/${params.id}`);
}
