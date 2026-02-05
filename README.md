# Formance Demo Builder

A standalone demo experience for Formance ledger capabilities with a **mocked backend**. No real Formance ledger required.

## Features

- **Pre-built Demos**: Sports betting, cross-border remittance, wealth management, corporate cards
- **Interactive Demo Viewer**: Step-by-step transaction execution with flow diagrams
- **Query Explorer**: Test balance queries, transaction filters, and account listings
- **Demo Builder**: AI-powered custom demo generation from company information
- **Mocked Backend**: Full ledger simulation without external dependencies

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000
```

## Project Structure

```
formance-demo-builder/
├── apps/
│   └── web/                   # Next.js 14 demo app
├── packages/
│   ├── ledger-engine/         # Mock ledger implementation
│   ├── numscript-parser/      # Parse & execute Numscript
│   ├── demo-configs/          # Pre-built demo configurations
│   └── agents/                # AI agent prompts for builder
└── docs/                      # Documentation
```

## Available Demos

| Demo | Description |
|------|-------------|
| **Sportsbet** | Customer wallet with deposits, wagering, and withdrawals |
| **Coins.ph** | Cross-border remittance with FX conversion tracking |
| **Monetae** | Wealth management with multi-currency custody |
| **Rain** | Corporate expense management with card funding |

## Demo Builder

Use the AI-powered builder to create custom demos:

1. Navigate to `/builder`
2. Provide company URL, transcript, or use case description
3. Watch the agent pipeline generate your demo
4. Preview and run your custom demo

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **pnpm + Turborepo** - Monorepo management

## Development

```bash
# Run all tests
pnpm test

# Build all packages
pnpm build

# Lint
pnpm lint
```

## Documentation

- [CLAUDE.md](./claude/CLAUDE.md) - Instructions for Claude Code
- [NUMSCRIPT.md](./docs/NUMSCRIPT.md) - Numscript language reference
- [AGENTS.md](./docs/AGENTS.md) - Demo builder agent system

## Deployment

Deploy to Vercel:

```bash
vercel
```

Or connect your GitHub repository - Vercel will use the `vercel.json` configuration.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | For AI-powered demo builder | Optional |

Without `ANTHROPIC_API_KEY`, the builder uses mock responses for demonstration.

## License

MIT
