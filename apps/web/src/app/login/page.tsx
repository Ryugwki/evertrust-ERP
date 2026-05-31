import { LoginForm } from '@/components/auth/login-form';

// Data fetching here is fully client-side (the login mutation runs on submit), so
// nothing hits the API at build time.
export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight">Evertrust ERP</h1>
          <p className="text-sm text-muted-foreground">Tender operations platform</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
