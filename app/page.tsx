import { redirect } from 'next/navigation';

export default function Root() {
  // For now hardcode; once we're past the trip-context layer this becomes "today within trip dates"
  redirect('/days/today');
}
