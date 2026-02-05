import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

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

Formance is a programmable financial ledger for fintechs, neobanks, crypto companies, and payment platforms. It uses double-entry bookkeeping with a domain-specific language called Numscript. The ledger provides a single source of truth that unifies fragmented systems (banks, blockchains, exchanges, PSPs) into one timeline.

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
- \`[MXN/2 850000]\` = 8,500 MXN
- \`[USD/2 *]\` = entire balance

### Special Accounts
- \`@world\` = external money (always allows overdraft, represents money entering/leaving system)
- NEVER use "allowing unbounded overdraft" on @world - it already has unlimited overdraft

### Sources & Destinations
\`\`\`numscript
// Single source
source = @users:{USER_ID}:available

// Ordered sources (waterfall) - drains first before moving to second
source = {
  @users:{USER_ID}:bonus
  @users:{USER_ID}:available
}

// With limits
source = {
  max [USD/2 500] from @users:{USER_ID}:bonus
  @users:{USER_ID}:available
}

// Split destination with percentages
destination = {
  2.5% to @platform:fees
  remaining to @merchants:{MERCHANT_ID}:available
}
\`\`\`

### Overdraft (for non-@world accounts)
\`\`\`numscript
// PSPs and exchanges often need overdraft because they credit before settlement
source = @psp:stripe allowing unbounded overdraft
source = @exchanges:{CONVERSION_ID} allowing unbounded overdraft
\`\`\`

### Metadata
\`\`\`numscript
set_tx_meta("type", "DEPOSIT")
set_tx_meta("reference", "{REFERENCE_ID}")
set_tx_meta("customer", "{CUSTOMER_ID}")
\`\`\`

---

## DEMO DESIGN RULES (CRITICAL)

### Rule 1: USE REALISTIC NAMES
Use real-sounding names for entities, not generic IDs. This makes demos relatable and professional.

WRONG ❌:
- Variables: "CUSTOMER_ID": "001", "FUND_ID": "fund01"
- Accounts: @clients:fund01:master, @customers:user001:available

RIGHT ✓:
- Variables: "FUND_NAME": "genesis", "TRADER_NAME": "bob", "CUSTOMER_NAME": "alice"
- Accounts: @clients:genesis:master, @clients:genesis:trader:bob:available

Example realistic variable values:
- Fund names: "genesis", "apex", "meridian", "vanguard"
- Trader names: "bob", "alice", "carlos", "sarah"
- Company names: "acme", "northstar", "summit"

### Rule 2: ONE EVENT = ONE STEP
Each distinct business event should be a SEPARATE transaction step. Do NOT combine multiple events.

WRONG ❌ (combining two events into one step):
- "Master Fund deposits 500 ETH and 10M USDC" as ONE step

RIGHT ✓ (separate steps for each event):
- Step 1: "Master Fund Deposits ETH" - 500 ETH deposit
- Step 2: "Master Fund Deposits USDC" - 10M USDC deposit

Different assets, different blockchain transactions, different settlement times = SEPARATE STEPS.

### Rule 3: ATOMIC FEES IN SAME STEP
When a platform takes a fee atomically WITH another action, those are multiple send statements in ONE step (one atomic transaction).

Example: Staking request with fee
\`\`\`numscript
// Both sends execute atomically - if one fails, both fail
send [USDC/6 500000000000] (
  source = @clients:genesis:trader:bob:available
  destination = @clients:genesis:trader:bob:held:staking:{BATCH_ID}
)
send [USDC/6 5000000000] (
  source = @clients:genesis:trader:bob:available
  destination = @zodia:fees
)
set_tx_meta("type", "STAKING_LOCK")
\`\`\`

This creates ONE transaction with TWO postings (two arrows in diagram), executed atomically.

---

## ACCOUNT NAMING RULES (CRITICAL - MUST FOLLOW)

### Rule 1: NEVER USE UNDERSCORES
Use colons for ALL word/segment separation. Underscores break wildcard queries.

WRONG ❌:
- \`@platform:fx_spread\`
- \`@treasury:working_capital\`
- \`@clients:fund_01:master\`

RIGHT ✓:
- \`@platform:fx:spread\`
- \`@treasury:float\`
- \`@clients:{FUND_ID}:master\`

### Rule 2: IDs MUST BE SEPARATE SEGMENTS
Numbers and IDs get their own colon-separated segment. Never concatenate words with numbers.

WRONG ❌:
- \`@customers:user001:available\` (user001 concatenates word+number)
- \`@banks:bank001:operating\` (bank001 concatenates)
- \`@clients:fund01:master\` (fund01 concatenates)
- \`@exchanges:xch001\` (xch001 concatenates)

RIGHT ✓:
- \`@customers:{CUSTOMER_ID}:available\`
- \`@banks:{BANK_ID}:operating\`
- \`@clients:{FUND_ID}:master\`
- \`@exchanges:{CONVERSION_ID}\`

### Rule 3: USE {VARIABLE_NAME} PLACEHOLDERS
All dynamic IDs should use curly brace placeholders, not hardcoded values.

WRONG ❌:
- \`@customers:001:available\`
- \`@orders:ORD123\`

RIGHT ✓:
- \`@customers:{CUSTOMER_ID}:available\`
- \`@orders:{ORDER_ID}\`

### Rule 4: SHORT, SIMPLE SEGMENT NAMES
Each segment should be a single short word. Don't concatenate words.

WRONG ❌:
- \`@platform:transactionfees\`
- \`@treasury:workingcapital\`

RIGHT ✓:
- \`@platform:fees\`
- \`@treasury:float\`

### Rule 5: ACCOUNTS ARE MULTI-ASSET
Never include currency/asset type in account names. One account holds multiple assets.

WRONG ❌:
- \`@users:{USER_ID}:usd:available\`
- \`@treasury:usdc:hot\`

RIGHT ✓:
- \`@users:{USER_ID}:available\` (holds USD, USDC, BTC, etc.)
- \`@treasury:hot\`

---

## Hierarchical Account Patterns

Structure accounts as: \`Category:Entity:Location:State\`

This enables powerful wildcard queries:
- \`@customers:*:available\` → all customer available balances
- \`@treasury:*:hot\` → all hot wallet balances
- \`@banks:*:pending:*\` → all pending bank transfers

### State-Based Account Patterns
Encode transaction state directly into account paths:

- \`:available\` - Funds ready to use
- \`:pending\` - Awaiting settlement/confirmation
- \`:pending:{REFERENCE}\` - Specific pending transaction
- \`:compliance\` - Under compliance review/hold
- \`:holding:{REFERENCE}\` - Stuck funds (failed payout, etc.)
- \`:frozen\` - Locked by compliance/legal
- \`:hot\` / \`:cold\` - Custody wallet temperature

---

## Real-World Use Case Patterns

### 1. STABLECOIN REMITTANCE (The "Stablecoin Sandwich")

A remittance touches multiple systems: bank, blockchain, exchange, local rails. Track everything in one ledger.

**Flow**: USD deposit → USDC conversion → On-chain transfer → USDC/MXN conversion → SPEI payout

**Accounts**:
- \`@customers:{SENDER_ID}:available\` - Sender's USD balance
- \`@customers:{RECIPIENT_ID}:available\` - Recipient's MXN balance
- \`@treasury:bitso:USDC:hot\` - USDC working capital at exchange
- \`@treasury:bitso:USDC:compliance\` - USDC under compliance hold
- \`@banks:banorte:operating\` - MXN operating account
- \`@banks:banorte:pending:{REFERENCE}\` - Payout in transit
- \`@banks:banorte:holding:{REFERENCE}\` - Stuck payout (wrong CLABE, etc.)
- \`@platform:fees\` - Transaction fees
- \`@platform:fx:spread\` - FX spread revenue
- \`@exchanges:{CONVERSION_ID}\` - FX conversion tracking (overdraft)

**Transaction Steps**:

1. **USDC Arrives** - Stablecoin received from US entity
\`\`\`numscript
send [USDC/6 500000000] (
  source = @world
  destination = @treasury:bitso:hot
)
set_tx_meta("type", "USDC_RECEIVED")
set_tx_meta("reference", "{REFERENCE}")
\`\`\`

2. **Compliance Hold** - Flagged for review
\`\`\`numscript
send [USDC/6 500000000] (
  source = @treasury:bitso:hot
  destination = @treasury:bitso:compliance
)
set_tx_meta("type", "COMPLIANCE_HOLD")
\`\`\`

3. **Compliance Clear** - Review passed
\`\`\`numscript
send [USDC/6 500000000] (
  source = @treasury:bitso:compliance
  destination = @treasury:bitso:hot
)
set_tx_meta("type", "COMPLIANCE_CLEAR")
\`\`\`

4. **Convert USDC to MXN** - Execute FX trade
\`\`\`numscript
send [USDC/6 500000000] (
  source = @treasury:bitso:hot
  destination = @world
)
send [MXN/2 851500] (
  source = @world
  destination = @banks:banorte:operating
)
send [MXN/2 8500] (
  source = @world
  destination = @platform:fx:spread
)
set_tx_meta("type", "FX_CONVERSION")
set_tx_meta("rate", "17.03")
\`\`\`

5. **Initiate Payout** - SPEI transfer started
\`\`\`numscript
send [MXN/2 851500] (
  source = @banks:banorte:operating
  destination = @banks:banorte:pending:{REFERENCE}
)
set_tx_meta("type", "PAYOUT_INITIATED")
\`\`\`

6. **Payout Complete** or **Payout Failed**
\`\`\`numscript
// Success:
send [MXN/2 851500] (
  source = @banks:banorte:pending:{REFERENCE}
  destination = @world
)
// OR Failure (wrong CLABE):
send [MXN/2 851500] (
  source = @banks:banorte:pending:{REFERENCE}
  destination = @banks:banorte:holding:{REFERENCE}
)
\`\`\`

---

### 2. CRYPTO CARD PROGRAM

**Critical Domain Knowledge**: 99% of crypto card programs convert to fiat at authorization time, NOT settlement. The 1-3 day gap between auth and settlement creates unmanageable slippage risk.

**Accounts**:
- \`@users:{USER_ID}:wallet\` - User's crypto balance
- \`@users:{USER_ID}:held\` - Fiat holds for card auths
- \`@platform:settlement\` - Settlement pool
- \`@platform:fees\` - Transaction fees
- \`@psp:visa\` - Card network (overdraft)

**Flow**:

1. **Card Swipe (Authorization)** - Convert crypto to fiat immediately
\`\`\`numscript
// User pays with BTC, immediately convert to USD
send [BTC/8 250000] (
  source = @users:{USER_ID}:wallet
  destination = @world
)
send [USD/2 10000] (
  source = @world
  destination = @users:{USER_ID}:held
)
set_tx_meta("type", "CARD_AUTH")
set_tx_meta("auth_id", "{AUTH_ID}")
\`\`\`

2. **Settlement (T+1 to T+3)** - Release held funds to network
\`\`\`numscript
send [USD/2 10000] (
  source = @users:{USER_ID}:held
  destination = @psp:visa allowing unbounded overdraft
)
set_tx_meta("type", "CARD_SETTLE")
\`\`\`

---

### 3. CEDEFI YIELD PLATFORM

Users deposit into platform, platform deploys to DeFi protocols. Track user ownership of omnibus pool.

**Accounts**:
- \`@users:{USER_ID}:idle\` - Uninvested, liquid capital
- \`@users:{USER_ID}:staked:{PROTOCOL}\` - Funds in specific protocol
- \`@platform:omnibus:{PROTOCOL}\` - Total deployed to protocol
- \`@platform:yield\` - Yield revenue pool
- \`@platform:fees\` - Management fees

**Flow**:

1. **User Deposits**
\`\`\`numscript
send [USDC/6 100000000000] (
  source = @world
  destination = @users:{USER_ID}:idle
)
\`\`\`

2. **Deploy to Protocol**
\`\`\`numscript
send [USDC/6 100000000000] (
  source = @users:{USER_ID}:idle
  destination = @users:{USER_ID}:staked:aave
)
\`\`\`

3. **Harvest Yield** (pro-rata distribution)
\`\`\`numscript
send [USDC/6 500000000] (
  source = @world
  destination = {
    20% to @platform:fees
    remaining to @platform:yield
  }
)
\`\`\`

---

### 4. FIAT-TO-CRYPTO ON-RAMP

Handle the gap between wire settlement and instant crypto delivery.

**Accounts**:
- \`@users:{USER_ID}:bank:pending\` - Wire in transit
- \`@users:{USER_ID}:bank:available\` - Wire settled
- \`@users:{USER_ID}:crypto:available\` - Crypto balance
- \`@platform:treasury\` - Platform working capital
- \`@users:{USER_ID}:frozen\` - Locked due to bounced wire
- \`@users:{USER_ID}:owed\` - Amount owed to platform

**Flow**:

1. **Wire Initiated** - User sends wire
\`\`\`numscript
send [USD/2 100000] (
  source = @world
  destination = @users:{USER_ID}:bank:pending
)
\`\`\`

2. **Platform Fronts Trade** - Credit crypto before wire settles
\`\`\`numscript
send [USDC/6 100000000000] (
  source = @platform:treasury
  destination = @users:{USER_ID}:crypto:available
)
\`\`\`

3. **Wire Settles** - Move to platform treasury
\`\`\`numscript
send [USD/2 100000] (
  source = @users:{USER_ID}:bank:pending
  destination = @platform:treasury
)
\`\`\`

4. **Wire Bounces** (unhappy path)
\`\`\`numscript
// Reverse the pending wire
send [USD/2 100000] (
  source = @users:{USER_ID}:bank:pending
  destination = @world
)
// Freeze remaining assets
send [USDC/6 *] (
  source = @users:{USER_ID}:crypto:available
  destination = @users:{USER_ID}:frozen
)
\`\`\`

---

### 5. CUSTODY / MULTI-MANAGER FUND (Zodia-style)

A hedge fund with multiple traders needs virtual account segregation within an omnibus custody wallet.

**Key Concepts**:
- Pending → Available flow (waiting for block confirmations)
- Trader-level allocation to exchanges (Deribit, Bybit)
- Real-time reallocation between exchanges
- Staking with atomic fee recognition

**Accounts** (using realistic names):
- \`@clients:{FUND_NAME}:master\` - Fund's master custody account
- \`@clients:{FUND_NAME}:trader:{TRADER_NAME}:pending\` - Pending deposits (awaiting confirmations)
- \`@clients:{FUND_NAME}:trader:{TRADER_NAME}:available\` - Confirmed, liquid balance
- \`@clients:{FUND_NAME}:trader:{TRADER_NAME}:allocated:{EXCHANGE}\` - Reserved for specific exchange
- \`@clients:{FUND_NAME}:trader:{TRADER_NAME}:held:staking:{BATCH_ID}\` - Locked for staking
- \`@{CUSTODIAN}:fees\` - Custody platform fees (e.g., @zodia:fees)
- \`@{CUSTODIAN}:staking:payout\` - Staking rewards pool

**Example Variables**:
\`\`\`json
{
  "FUND_NAME": "genesis",
  "TRADER_NAME": "bob",
  "CUSTODIAN": "zodia",
  "BATCH_ID": "batch001"
}
\`\`\`

**Flow**:

1. **ETH Deposit Received** (one asset = one step)
\`\`\`numscript
send [ETH/18 500000000000000000000] (
  source = @world
  destination = @clients:genesis:trader:bob:pending
)
set_tx_meta("type", "DEPOSIT")
set_tx_meta("asset", "ETH")
set_tx_meta("chain_tx_id", "0x...")
\`\`\`

2. **USDC Deposit Received** (separate step for different asset)
\`\`\`numscript
send [USDC/6 10000000000000] (
  source = @world
  destination = @clients:genesis:trader:bob:pending
)
set_tx_meta("type", "DEPOSIT")
set_tx_meta("asset", "USDC")
\`\`\`

3. **Deposits Confirmed** (block confirmations received)
\`\`\`numscript
send [ETH/18 *] (
  source = @clients:genesis:trader:bob:pending
  destination = @clients:genesis:trader:bob:available
)
send [USDC/6 *] (
  source = @clients:genesis:trader:bob:pending
  destination = @clients:genesis:trader:bob:available
)
set_tx_meta("type", "RISK_CLEARANCE")
\`\`\`

4. **Allocate to Exchange** (trader wants to trade on Deribit)
\`\`\`numscript
send [USDC/6 1000000000000] (
  source = @clients:genesis:trader:bob:available
  destination = @clients:genesis:trader:bob:allocated:deribit
)
set_tx_meta("type", "EXCHANGE_ALLOCATION")
set_tx_meta("exchange", "deribit")
\`\`\`

5. **Reallocate Between Exchanges** (instant, no blockchain wait)
\`\`\`numscript
send [USDC/6 500000000000] (
  source = @clients:genesis:trader:bob:allocated:deribit
  destination = @clients:genesis:trader:bob:allocated:bybit
)
set_tx_meta("type", "REALLOCATION")
\`\`\`

6. **Staking Lock with Fee** (atomic - both succeed or both fail)
\`\`\`numscript
send [ETH/18 100000000000000000000] (
  source = @clients:genesis:trader:bob:available
  destination = @clients:genesis:trader:bob:held:staking:batch001
)
send [ETH/18 1000000000000000000] (
  source = @clients:genesis:trader:bob:available
  destination = @zodia:fees
)
set_tx_meta("type", "STAKING_LOCK")
set_tx_meta("lock_period", "30d")
\`\`\`

---

### 6. DIGITAL WALLET / NEOBANK

Simple wallet with deposits, transfers, and payouts.

**Accounts**:
- \`@customers:{CUSTOMER_NAME}:available\` - Spendable balance
- \`@customers:{CUSTOMER_NAME}:pending\` - Pending transactions
- \`@merchants:{MERCHANT_NAME}:available\` - Merchant balance
- \`@platform:fees\` - Transaction fees
- \`@psp:stripe\` - Payment processor

---

### 7. MARKETPLACE WITH ESCROW

Buyer funds order, seller fulfills, platform takes commission.

**Accounts**:
- \`@buyers:{BUYER_NAME}:available\` - Buyer wallet
- \`@sellers:{SELLER_NAME}:available\` - Seller wallet
- \`@sellers:{SELLER_NAME}:pending\` - Pending payout
- \`@escrow:{ORDER_ID}\` - Order escrow
- \`@platform:commission\` - Platform take rate

---

## Domain Technical Knowledge

### Card Networks
- Authorization amounts often differ from settlement (gas stations, restaurants, hotels)
- Always design for partial releases

### Settlement Timing
- Card settlement: T+1 to T+3
- Wire transfer: Same day to T+1
- ACH: T+1 to T+2
- Blockchain: Minutes (but confirmation varies)

### Intercompany
- Intercompany debt typically denominated in stable reference currency (USD), not transfer currency
- Use \`@interco:{ENTITY}:debt\` and \`@interco:{ENTITY}:credit\`
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
    "CUSTOMER_NAME": "alice",
    "MERCHANT_NAME": "acme",
    "ORDER_ID": "order001"
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
