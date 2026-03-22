'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Leaflet
const App = dynamic(() => import('@/components/App'), { ssr: false });

export default function Home() {
  return <App />;
}
