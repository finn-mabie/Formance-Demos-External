'use client';

import { useEffect, useRef } from 'react';
import { useDemoStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { ArrowRight, BookOpen, Eye, CheckCircle2 } from 'lucide-react';

export function DemoSidebar() {
  const { config, currentStep, executedSteps, goToStep } = useDemoStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Smooth scroll to current step when it changes
  useEffect(() => {
    const currentButton = stepRefs.current.get(currentStep);
    if (currentButton && containerRef.current) {
      currentButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentStep]);

  if (!config) return null;

  const totalSteps = config.transactionSteps.length;
  const hasQueries = config.usefulQueries && config.usefulQueries.length > 0;

  return (
    <div ref={containerRef} className="px-8 py-3 border-b border-border overflow-x-auto bg-card scroll-smooth">
      <div className="flex items-center gap-2">
        {/* Intro step */}
        <button
          ref={(el) => { if (el) stepRefs.current.set(-1, el); }}
          onClick={() => goToStep(-1)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap',
            currentStep === -1
              ? 'bg-primary text-primary-foreground font-medium'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <BookOpen className="h-3 w-3" />
          <span className="hidden lg:inline">Overview</span>
        </button>
        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        {/* Transaction steps */}
        {config.transactionSteps.map((step, index) => {
          const stepExecuted = executedSteps.has(index);
          const isCurrentStep = currentStep === index;

          return (
            <div key={step.txType} className="flex items-center">
              <button
                ref={(el) => { if (el) stepRefs.current.set(index, el); }}
                onClick={() => goToStep(index)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap',
                  isCurrentStep
                    ? 'bg-emerald-600 text-white font-medium'
                    : stepExecuted
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {stepExecuted && !isCurrentStep && (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                <span className="font-mono text-xs">{index + 1}</span>
                <span className="hidden lg:inline">{step.label}</span>
              </button>
              {(index < totalSteps - 1 || hasQueries) && (
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mx-2" />
              )}
            </div>
          );
        })}

        {/* Useful queries step */}
        {hasQueries && (
          <button
            ref={(el) => { if (el) stepRefs.current.set(totalSteps, el); }}
            onClick={() => goToStep(totalSteps)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap',
              currentStep === totalSteps
                ? 'bg-primary text-primary-foreground font-medium'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <Eye className="h-3 w-3" />
            <span className="hidden lg:inline">Explore</span>
          </button>
        )}
      </div>
    </div>
  );
}
