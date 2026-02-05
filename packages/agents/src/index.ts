import {
  researchAgentConfig,
  researchAgentPrompt,
} from './prompts/research';

import {
  chartOfAccountsAgentConfig,
  chartOfAccountsAgentPrompt,
} from './prompts/chart-of-accounts';

import {
  flowDesignerAgentConfig,
  flowDesignerAgentPrompt,
} from './prompts/flow-designer';

import {
  numscriptWriterAgentConfig,
  numscriptWriterAgentPrompt,
} from './prompts/numscript-writer';

import {
  configGeneratorAgentConfig,
  configGeneratorAgentPrompt,
} from './prompts/config-generator';

// Re-export all
export {
  researchAgentConfig,
  researchAgentPrompt,
  chartOfAccountsAgentConfig,
  chartOfAccountsAgentPrompt,
  flowDesignerAgentConfig,
  flowDesignerAgentPrompt,
  numscriptWriterAgentConfig,
  numscriptWriterAgentPrompt,
  configGeneratorAgentConfig,
  configGeneratorAgentPrompt,
};

export {
  type AgentConfig,
  type ResearchInput,
  type ResearchOutput,
  type ChartOfAccountsOutput,
  type FlowDesignOutput,
  type NumscriptOutput,
  type ConfigGeneratorOutput,
  type AgentProgress,
} from './types';

/**
 * All agent configurations in execution order
 */
export const AGENT_PIPELINE = [
  { config: researchAgentConfig, prompt: researchAgentPrompt },
  { config: chartOfAccountsAgentConfig, prompt: chartOfAccountsAgentPrompt },
  { config: flowDesignerAgentConfig, prompt: flowDesignerAgentPrompt },
  { config: numscriptWriterAgentConfig, prompt: numscriptWriterAgentPrompt },
  { config: configGeneratorAgentConfig, prompt: configGeneratorAgentPrompt },
] as const;
