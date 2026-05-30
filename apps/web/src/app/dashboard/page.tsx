import { DashboardView } from '@/components/dashboard/dashboard-view';

// The dashboard is client-rendered (DashboardView uses TanStack Query), so the
// user data is fetched in the browser and nothing touches the API at build time.
// Middleware guards access; this is a defence-in-depth second layer.
export default function DashboardPage() {
  return <DashboardView />;
}
