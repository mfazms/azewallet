import { redirect } from 'next/navigation';

export default function HomePage() {
  // AppShell handles authentication routing,
  // but for the root path we'll just redirect to dashboard.
  redirect('/dashboard');
}
