import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions precisely and output valid JSON.' }],
      },
    ],
  });

  const result = await chat.sendMessage(userPrompt);
  const response = await result.response;
  return response.text();
}

export function extractJSON<T = Record<string, unknown>>(text: string): T {
  // Try to find JSON in the response
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]) as T;
  }

  // Try to parse the whole thing as JSON
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed) as T;
  }

  throw new Error('No valid JSON found in response');
}

// Comprehensive Formance context for all agents
export const FORMANCE_CONTEXT = `
## What is Formance?

Formance is a programmable financial ledger for fintechs, neobanks, crypto companies, and payment platforms. It uses double-entry bookkeeping with a domain-specific language called Numscript.

## Numscript Quick Reference

### Basic Structure
\`\`\`numscript
send [ASSET/PRECISION AMOUNT] (
  source = @source_account
  destination = @destination_account
)
\`\`\`

### Asset Notation
- \`[USD/2 1000]\` = $10.00 (1000 cents, 2 decimal places)
- \`[USDT/6 1000000]\` = 1 USDT (6 decimal places)
- \`[BTC/8 100000000]\` = 1 BTC
- \`[USD/2 *]\` = entire balance

### Special Accounts
- \`@world\` = external money (always allows overdraft, represents money entering/leaving system)
- NEVER use "allowing unbounded overdraft" on @world - it already has unlimited overdraft

### Sources & Destinations
\`\`\`numscript
// Single source
source = @users:alice:wallet

// Ordered sources (waterfall)
source = {
  @users:alice:bonus
  @users:alice:main
}

// With limits
source = {
  max [USD/2 500] from @users:alice:bonus
  @users:alice:main
}

// Split destination
destination = {
  2.5% to @platform:fees
  remaining to @merchants:456
}
\`\`\`

### Overdraft (for non-@world accounts)
\`\`\`numscript
source = @psp:stripe allowing unbounded overdraft
source = @users:123 allowing overdraft up to [USD/2 50]
\`\`\`

### Metadata
\`\`\`numscript
set_tx_meta("order_id", "ORD-123")
set_tx_meta("type", "DEPOSIT")
set_account_meta(@user, "status", "active")
\`\`\`

## Account Naming Conventions

### CRITICAL RULES:
1. **Use colons for ALL separation** - NEVER underscores in account names
   - WRONG: \`@interco:ph:owed_to_ph\`
   - RIGHT: \`@interco:ph:debt\`

2. **IDs must be colon-separated** (enables aggregation with :: wildcard)
   - WRONG: \`@customers:cust001\`
   - RIGHT: \`@customers:001\`

3. **Accounts are multi-asset** - NEVER include asset type in names
   - WRONG: \`@users:alice:usd:available\`
   - RIGHT: \`@users:alice:available\` (holds USD, USDC, BTC, etc.)

4. **Per-customer custody accounts** (not shared treasury)
   - WRONG: \`@treasury:fireblocks:hot\` (all mixed)
   - RIGHT: \`@customers:001:fireblocks:hot\` (per customer)

5. **No double counting** - customer accounts ARE the omnibus total

### Standard Categories
- \`@customers:{ID}:\` - End-user accounts
- \`@merchants:{ID}:\` - Seller/vendor accounts
- \`@platform:\` - Company operational accounts (revenue, fees, expenses)
- \`@treasury:\` - Cash management accounts
- \`@banks:{NAME}:\` - Bank integration accounts
- \`@psp:{NAME}:\` - Payment processor accounts
- \`@exchanges:{ID}\` - FX conversion tracking (use overdraft)
- \`@interco:{ENTITY}:\` - Intercompany accounts

### Common Subtypes
- \`:available\` - Funds available for use
- \`:pending\` or \`:pending:{type}\` - Awaiting confirmation
- \`:hot\` / \`:cold\` - Custody wallet type
- \`:debt\` / \`:credit\` - Intercompany obligations

## Common Flow Patterns

### Deposit (money enters system)
\`\`\`numscript
send [USD/2 10000] (
  source = @world
  destination = @customers:001:available
)
\`\`\`

### Deposit with fee
\`\`\`numscript
send [USD/2 10000] (
  source = @world
  destination = {
    2.5% to @platform:fees
    remaining to @customers:001:available
  }
)
\`\`\`

### Withdrawal (money leaves system)
\`\`\`numscript
send [USD/2 5000] (
  source = @customers:001:available
  destination = @world
)
\`\`\`

### Transfer between users
\`\`\`numscript
send [USD/2 1000] (
  source = @customers:001:available
  destination = @customers:002:available
)
\`\`\`

### PSP authorization (credit before settlement)
\`\`\`numscript
send [USD/2 10000] (
  source = @psp:stripe allowing unbounded overdraft
  destination = @customers:001:available
)
\`\`\`

### Marketplace with commission
\`\`\`numscript
send [USD/2 10000] (
  source = @customers:buyer:available
  destination = {
    10% to @platform:commission
    remaining to @merchants:seller:available
  }
)
\`\`\`

### Escrow flow
\`\`\`numscript
// Step 1: Fund escrow
send [USD/2 10000] (
  source = @customers:001:available
  destination = @escrow:order:123
)

// Step 2: Release to seller
send [USD/2 *] (
  source = @escrow:order:123
  destination = {
    10% to @platform:commission
    remaining to @merchants:seller:available
  }
)
\`\`\`

### Currency conversion
\`\`\`numscript
// Debit source currency
send [EUR/2 1000] (
  source = @customers:001:available
  destination = @exchanges:conv:001
)

// Credit destination currency
send [USD/2 1100] (
  source = @exchanges:conv:001 allowing unbounded overdraft
  destination = @customers:001:available
)

set_tx_meta("exchange_rate", "1.10")
\`\`\`

## Use Case Examples

### Digital Wallet
- @customers:{ID}:available - User's spendable balance
- @customers:{ID}:pending - Pending deposits/withdrawals
- @platform:revenue - Platform fees earned
- @psp:stripe - Stripe integration (overdraft allowed)

### Cross-Border Remittance
- @treasury:binance:hot - USDT working capital
- @banks:bradesco:operating - BRL operating account
- @banks:bradesco:pending:{REF} - Wire in transit
- @platform:revenue - FX spread earned

### Marketplace
- @customers:{ID}:available - Buyer accounts
- @merchants:{ID}:available - Seller accounts
- @merchants:{ID}:pending - Pending payouts
- @platform:commission - Platform take rate
- @escrow:{ORDER_ID} - Order escrow

### Omnibus Custody
- @customers:{ID}:hot - Customer's share in hot wallet
- @customers:{ID}:cold - Customer's share in cold storage
- @platform:fees - Custody fees
// Query @customers::hot for total hot wallet balance
`;

export const DEMO_OUTPUT_FORMAT = `
## Output Format

You must respond with a valid JSON object (no markdown code blocks, just raw JSON):

{
  "id": "slug-format-id",
  "name": "Human Readable Demo Name",
  "description": "One sentence description of what this demo shows",
  "accounts": [
    {
      "address": "@category:entity:subtype",
      "name": "Human-readable name",
      "description": "What this account represents",
      "color": "blue"
    }
  ],
  "variables": {
    "CUSTOMER_ID": "001",
    "ORDER_ID": "ORD001"
  },
  "transactionSteps": [
    {
      "txType": "unique-step-id",
      "label": "Step Label",
      "description": "What happens in this step and why",
      "numscript": "send [USD/2 10000] (\\n  source = @world\\n  destination = @customers:{CUSTOMER_ID}:available\\n)\\n\\nset_tx_meta(\\"type\\", \\"DEPOSIT\\")"
    }
  ],
  "usefulQueries": [
    {
      "title": "Query Title",
      "description": "What this query shows",
      "queryType": "balance",
      "addressFilter": "@customers:"
    }
  ]
}

### Account Colors
Use: slate, gray, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose

Conventions:
- Customer accounts: blue, sky, cyan
- Platform accounts: emerald, green
- External/bank accounts: slate, gray
- Exchange accounts: purple, violet
- Treasury accounts: amber, yellow

### Query Types
- "balance" with addressFilter (pattern like "@customers:" or "@platform:revenue")
- "transactions" with transactionFilter: { account?: string, metadata?: Record<string, string> }
- "accounts" with accountAddress (pattern to list accounts)
`;
