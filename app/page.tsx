/**
 * Next.js Home Page
 * Wraps the FlipFoundry application
 */

'use client';

import dynamic from 'next/dynamic';

// Dynamically import the App component to avoid SSR issues
const App = dynamic(() => import('@/src/App'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  ),
});

export default function HomePage() {
  return <App />;
}
