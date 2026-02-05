'use client';

import { DemoConfig } from '@formance-demo/demo-configs';

const STORAGE_KEY = 'formance-generated-demos';

export interface GeneratedDemoConfig extends DemoConfig {
  generatedAt: string;
}

/**
 * Get all generated demos from localStorage
 */
export function getGeneratedDemos(): Record<string, GeneratedDemoConfig> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Get a specific generated demo by ID
 */
export function getGeneratedDemo(id: string): GeneratedDemoConfig | undefined {
  const demos = getGeneratedDemos();
  return demos[id];
}

/**
 * Save a generated demo to localStorage
 */
export function saveGeneratedDemo(config: DemoConfig): void {
  if (typeof window === 'undefined') return;

  const demos = getGeneratedDemos();
  demos[config.id] = {
    ...config,
    generatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(demos));
}

/**
 * Delete a generated demo
 */
export function deleteGeneratedDemo(id: string): void {
  if (typeof window === 'undefined') return;

  const demos = getGeneratedDemos();
  delete demos[id];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(demos));
}

/**
 * List all generated demos
 */
export function listGeneratedDemos(): GeneratedDemoConfig[] {
  return Object.values(getGeneratedDemos()).sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}
