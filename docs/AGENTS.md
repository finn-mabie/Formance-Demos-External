# Demo Builder Agent System

The Demo Builder uses a pipeline of specialized AI agents to create custom Formance demos from company information.

## Agent Pipeline

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Research   │────▶│ Chart of Accts  │────▶│ Flow Designer│
└──────────────┘     └─────────────────┘     └──────────────┘
                                                    │
                                                    ▼
                     ┌─────────────────┐     ┌──────────────┐
                     │Config Generator │◀────│Numscript Wtr │
                     └─────────────────┘     └──────────────┘
```

## Agent Details

### 1. Research Agent

**Purpose:** Analyze company information to understand their business model and payment flows.

**Input:**
- Company website URL
- Sales call transcript (optional)
- Use case description (optional)

**Output:**
```typescript
{
  companyName: string;
  businessModel: string;
  keyFlows: string[];
  painPoints: string[];
  stakeholders: string[];
  currencies: string[];
  suggestedDemoType: string;
}
```

### 2. Chart of Accounts Designer

**Purpose:** Design the account structure for the demo ledger.

**Input:** Research output

**Output:**
```typescript
{
  accounts: Array<{
    address: string;
    name: string;
    description: string;
    color: string;
    purpose: 'customer' | 'platform' | 'external' | 'omnibus' | 'exchange';
  }>;
  rationale: string;
}
```

### 3. Flow Designer

**Purpose:** Design transaction flows and step sequences.

**Input:** Research output + Chart of accounts

**Output:**
```typescript
{
  steps: Array<{
    txType: string;
    label: string;
    description: string;
    postings: Array<{
      from: string;
      to: string;
      amount: string;
      asset: string;
    }>;
    metadata: Record<string, string>;
  }>;
  rationale: string;
}
```

### 4. Numscript Writer

**Purpose:** Convert flow designs into executable Numscript code.

**Input:** Flow design output

**Output:**
```typescript
{
  steps: Array<{
    txType: string;
    numscript: string;
  }>;
}
```

### 5. Config Generator

**Purpose:** Assemble all outputs into a complete demo configuration.

**Input:** All previous outputs

**Output:** Complete `DemoConfig` object ready to run

## Configuration

Agents use these model settings:

| Agent | Model | Temperature | Max Tokens |
|-------|-------|-------------|------------|
| Research | claude-3-5-sonnet | 0.3 | 4096 |
| Chart of Accounts | claude-3-5-sonnet | 0.2 | 4096 |
| Flow Designer | claude-3-5-sonnet | 0.3 | 4096 |
| Numscript Writer | claude-3-5-sonnet | 0.1 | 4096 |
| Config Generator | claude-3-5-sonnet | 0.1 | 8192 |

## Prompt Structure

Each agent prompt includes:

1. **Role definition** - What the agent specializes in
2. **Task description** - What it needs to do
3. **Output format** - JSON schema for response
4. **Guidelines** - Best practices and rules
5. **Examples** - Reference implementations

## Using the Builder

1. Navigate to `/builder`
2. Provide at least one input:
   - Company URL
   - Sales call transcript
   - Use case description
3. Click "Generate Demo"
4. Watch the agent pipeline progress
5. Preview and download the generated config

## Customization

### Adding a New Agent

1. Create prompt file in `packages/agents/src/prompts/`
2. Define config and prompt
3. Export from `packages/agents/src/index.ts`
4. Add API route in `apps/web/app/api/agents/`

### Modifying Prompts

Prompts are in `packages/agents/src/prompts/`:
- `research.ts`
- `chart-of-accounts.ts`
- `flow-designer.ts`
- `numscript-writer.ts`
- `config-generator.ts`

## API Routes

- `POST /api/agents/research`
- `POST /api/agents/chart-of-accounts`
- `POST /api/agents/flow-designer`
- `POST /api/agents/numscript-writer`
- `POST /api/agents/config-generator`

Each route expects:
```json
{
  "input": { /* original user input */ },
  "previousOutput": { /* output from previous agent */ }
}
```

## Environment Variables

For production use with real AI:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Without this, agents return mock data for demonstration purposes.
