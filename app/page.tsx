'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/admin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Collections AI System</h1>
        <p className="text-slate-400">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
