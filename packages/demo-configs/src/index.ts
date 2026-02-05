export { sportsbetConfig } from './sportsbet';
export { coinsPhConfig } from './coins-ph';
export { monetaeConfig } from './monetae';
export { rainConfig } from './rain';

export {
  type DemoConfig,
  type AccountDefinition,
  type AccountColor,
  type TransactionStep,
  type Query,
  type BalanceQuery,
  type TransactionQuery,
  type AccountQuery,
  type QueryType,
  type TransactionFilterOptions,
} from './types';

import { sportsbetConfig } from './sportsbet';
import { coinsPhConfig } from './coins-ph';
import { monetaeConfig } from './monetae';
import { rainConfig } from './rain';
import { DemoConfig } from './types';

/**
 * All available demo configurations
 */
export const DEMO_CONFIGS: Record<string, DemoConfig> = {
  sportsbet: sportsbetConfig,
  'coins-ph': coinsPhConfig,
  monetae: monetaeConfig,
  rain: rainConfig,
};

/**
 * Get a demo configuration by ID
 */
export function getDemoConfig(id: string): DemoConfig | undefined {
  return DEMO_CONFIGS[id];
}

/**
 * List all available demo configurations
 */
export function listDemoConfigs(): DemoConfig[] {
  return Object.values(DEMO_CONFIGS);
}
