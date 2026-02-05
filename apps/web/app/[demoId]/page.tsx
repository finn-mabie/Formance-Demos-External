'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDemoConfig } from '@formance-demo/demo-configs';
import { useDemoStore } from '@/lib/store';
import { DemoFullscreen } from '@/components/demo/DemoFullscreen';

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const demoId = params.demoId as string;

  const { config, initDemo } = useDemoStore();

  useEffect(() => {
    const demoConfig = getDemoConfig(demoId);
    if (!demoConfig) {
      router.push('/');
      return;
    }

    // Only init if config doesn't match current demo
    // The singleton ledger pattern in store.ts handles state persistence
    if (!config || config.id !== demoId) {
      initDemo(demoConfig);
    }
  }, [demoId, config, initDemo, router]);

  if (!config || config.id !== demoId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <DemoFullscreen />;
}
