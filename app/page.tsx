// This is a Server Component — it has no state, no hooks, no 'use client'.
// It simply renders ClientPage, which is the client-side shell of the app.
// Next.js will server-render the initial HTML from ClientPage, then hydrate it in the browser.
import ClientPage from '@/components/ClientPage';

export default function Home() {
  return <ClientPage />;
}
