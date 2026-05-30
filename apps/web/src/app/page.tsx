import { redirect } from 'next/navigation';

// Entry point. Middleware decides the real destination: authenticated users land
// on the dashboard, everyone else is redirected to /login.
export default function HomePage() {
  redirect('/dashboard');
}
