'use client';

import { useDemoStore } from '@/lib/store';
import { DemoSidebar } from './DemoSidebar';
import { DemoIntro } from './DemoIntro';
import { DemoStep } from './DemoStep';
import { DemoExplore } from './DemoExplore';
import { BalanceSidebar } from './BalanceSidebar';
import { DemoHeader } from './DemoHeader';
import { GibonChat } from './GibonChat';

export function DemoFullscreen() {
  const { config, currentStep } = useDemoStore();

  if (!config) return null;

  const isIntro = currentStep === -1;
  const isExplore = currentStep === config.transactionSteps.length;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <DemoHeader />

      {/* Progress bar / Step Navigation */}
      <DemoSidebar />

      {/* Main content with balance sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">
            {isIntro && <DemoIntro />}
            {!isIntro && !isExplore && <DemoStep stepIndex={currentStep} />}
            {isExplore && <DemoExplore />}
          </div>
        </main>

        {/* Right Sidebar - Account Balances */}
        <BalanceSidebar />
      </div>

      {/* Gibon Chat Assistant */}
      <GibonChat />
    </div>
  );
}
