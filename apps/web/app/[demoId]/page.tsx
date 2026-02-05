'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDemoConfig, DemoConfig } from '@formance-demo/demo-configs';
import { useDemoStore } from '@/lib/store';
import { DemoFullscreen } from '@/components/demo/DemoFullscreen';
import { getGeneratedDemo } from '@/lib/generated-demos';

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const demoId = params.demoId as string;

  const { config, initDemo } = useDemoStore();

  useEffect(() => {
    // Check for pre-configured demos first, then generated demos
    let demoConfig: DemoConfig | undefined = getDemoConfig(demoId);

    if (!demoConfig) {
      // Check if it's a generated demo stored in localStorage
      demoConfig = getGeneratedDemo(demoId);
    }

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
