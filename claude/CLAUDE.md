# Claude Code Instructions for Formance Demo Builder

This document provides instructions for Claude Code agents working on the `formance-demo-builder` repository.

## Project Overview

This is a standalone demo experience for Formance ledger capabilities with a **mocked backend**. No real Formance ledger is required.

## Repository Structure

```
formance-demo-builder/
├── apps/
│   └── web/                        # Next.js 14 demo app
│       ├── app/
│       │   ├── page.tsx            # Demo selector
│       │   ├── [demoId]/page.tsx   # Demo viewer
│       │   └── builder/page.tsx    # Demo builder (AI workflow)
│       ├── components/
│       │   ├── demo/               # DemoFullscreen, Sidebar, FlowDiagram
│       │   └── builder/            # InputsForm, AgentProgress
│       └── lib/
│           └── store.ts            # Zustand ledger store
│
├── packages/
│   ├── ledger-engine/              # Mock ledger implementation
│   ├── numscript-parser/           # Parse & execute Numscript
│   ├── demo-configs/               # Pre-built demo configurations
│   └── agents/                     # Agent prompt definitions
│
├── docs/                           # Documentation
└── claude/                         # This file
```

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **pnpm + Turborepo**
- **Zustand** for state management

## Key Packages

### @formance-demo/ledger-engine

Mock Formance ledger with:
- `MockLedger` class
- Account management with balances per asset
- Transaction creation with postings
- Pattern matching for queries (prefix with `:`, wildcard with `::`)

### @formance-demo/numscript-parser

Numscript parsing and execution:
- `parseNumscript()` - Parse Numscript to AST
- `executeNumscript()` - Execute against MockLedger
- `formatAmount()` - Format amounts with currency symbols

### @formance-demo/demo-configs

Pre-built demo configurations:
- `sportsbet` - Sports betting platform
- `coins-ph` - Cross-border remittance
- `monetae` - Wealth management
- `rain` - Corporate cards

### @formance-demo/agents

Agent prompts for demo builder:
- Research agent
- Chart of accounts designer
- Flow designer
- Numscript writer
- Config generator

## Common Tasks

### Adding a New Demo

1. Create a new file in `packages/demo-configs/src/`
2. Export from `packages/demo-configs/src/index.ts`
3. Add to `DEMO_CONFIGS` map

### Modifying the Numscript Parser

1. Update `packages/numscript-parser/src/parser.ts`
2. Add tests in `packages/numscript-parser/src/parser.test.ts`
3. Run tests: `pnpm test --filter=@formance-demo/numscript-parser`

### Updating the UI

1. Components are in `apps/web/components/`
2. State management in `apps/web/lib/store.ts`
3. Styling uses Tailwind CSS

## Numscript Syntax Reference

```numscript
// Simple send
send [USD/2 1000] (
  source = @world
  destination = @users:alice:wallet
)

// With overdraft (for external entities)
send [USD/2 1000] (
  source = @psp:stripe allowing unbounded overdraft
  destination = @users:alice:wallet
)

// Transaction metadata
set_tx_meta("type", "DEPOSIT")
set_tx_meta("customer_id", "alice-123")

// Account metadata
set_account_meta(@exchanges:001, "rate", "5.45")
```

## Account Naming Conventions

- `@customers:{ID}:available` - Customer available balance
- `@customers:{ID}:pending` - Pending funds
- `@platform:revenue` - Platform fees
- `@treasury:{provider}:hot` - Hot wallets
- `@exchanges:{ID}` - FX conversion tracking
- `@banks:{name}:operating` - Bank accounts
- `@world` - External money (unbounded overdraft)

## Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm test --filter=@formance-demo/ledger-engine

# Run in watch mode
pnpm test:watch --filter=@formance-demo/numscript-parser
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build all packages
pnpm build
```

## Deployment

Deploy to Vercel:
1. Connect GitHub repository
2. Vercel will use `vercel.json` configuration
3. Set environment variables if needed:
   - `ANTHROPIC_API_KEY` (for builder agents, optional)
