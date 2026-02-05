export { crossBorderRemittanceConfig } from './cross-border-remittance';
export { cedefiCustodyConfig } from './cedefi-custody';
export { stablecoinIssuanceConfig } from './stablecoin-issuance';

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

import { crossBorderRemittanceConfig } from './cross-border-remittance';
import { cedefiCustodyConfig } from './cedefi-custody';
import { stablecoinIssuanceConfig } from './stablecoin-issuance';
import { DemoConfig } from './types';

/**
 * All available demo configurations
 */
export const DEMO_CONFIGS: Record<string, DemoConfig> = {
  'cross-border-remittance': crossBorderRemittanceConfig,
  'cedefi-custody': cedefiCustodyConfig,
  'stablecoin-issuance': stablecoinIssuanceConfig,
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
