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
  destination = @platform:fees
)
set_tx_meta("type", "STAKING_LOCK")
\`\`\`

This creates ONE transaction with TWO postings (two arrows in diagram), executed atomically.

### Rule 4: EXCHANGE PATTERN FOR CURRENCY CONVERSION (CRITICAL FOR DIAGRAMS)
When converting between currencies/assets (FX, mint/burn tokens, buy/sell crypto), you MUST use the exchange pattern with BIDIRECTIONAL @world flows. This ensures proper diagram visualization with horizontal parallel arrows.

**THE PATTERN:**
1. Source asset flows: Customer → Exchange → @world
2. Target asset flows: @world → Exchange → Customer
3. Fee flows: Exchange → Platform Revenue

**CORRECT EXCHANGE PATTERN ✓:**
\`\`\`numscript
// 1. Customer sends source asset to exchange
send [USD/2 100000000] (
  source = @customers:{CUSTOMER_ID}:available
  destination = @exchanges:{EXCHANGE_ID}
)

// 2. Source asset exits system via @world (REQUIRED for diagram)
send [USD/2 99900000] (
  source = @exchanges:{EXCHANGE_ID}
  destination = @world
)

// 3. Target asset enters system via @world (REQUIRED for diagram)
send [USDC/6 999000000000] (
  source = @world
  destination = @exchanges:{EXCHANGE_ID}
)

// 4. Target asset goes to customer
send [USDC/6 999000000000] (
  source = @exchanges:{EXCHANGE_ID}
  destination = @customers:{CUSTOMER_ID}:crypto
)

// 5. Fee goes to platform
send [USD/2 100000] (
  source = @exchanges:{EXCHANGE_ID}
  destination = @platform:revenue
)
\`\`\`

**WHY THIS MATTERS:**
- The diagram shows @world as a "sidecar" to the right of the exchange
- Two horizontal arrows show what goes OUT to @world and what comes IN from @world
- This visually represents the conversion/swap happening
- Without bidirectional @world flows, the diagram will look broken

**WRONG - Missing @world flows ❌:**
\`\`\`numscript
// DON'T DO THIS - breaks diagram visualization
send [USD/2 100000000] (
  source = @customers:{CUSTOMER_ID}:available
  destination = @exchanges:{EXCHANGE_ID}
)
send [USD/2 100000000] (
  source = @exchanges:{EXCHANGE_ID}
  destination = @issuer:reserve  // Wrong! Should go to @world
)
send [USDC/6 1000000000000] (
  source = @world
  destination = @customers:{CUSTOMER_ID}:crypto  // Wrong! Should go through exchange
)
\`\`\`

**USE FOR:**
- Currency exchange (USD → USDT, EUR → GBP)
- Token minting (USD in → Tokens out)
- Token burning/redemption (Tokens in → USD out)
- Crypto buy/sell (Fiat → Crypto, Crypto → Fiat)

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

---

## INDUSTRY-SPECIFIC DOMAIN KNOWLEDGE

### CRYPTO REMITTANCE (from real customer implementations)

**Business Model**: "Stablecoin sandwich" - USD deposits on one end, stablecoins in the middle for cross-border, local fiat payout at destination.

**Key Pain Points**:
- VASP (Virtual Asset Service Provider) regulation compliance
- Audit requirements - spreadsheet tracking is common but insufficient
- Multi-entity structures (e.g., Philippines entity receives USD, converts to stablecoin, Brazil entity receives and converts to local currency)
- Cannot receive USD directly in some jurisdictions (Brazil), so stablecoins become the bridge

**Typical Flow**:
1. Sending entity receives fiat (e.g., USD from client)
2. Convert to stablecoin (USDT/USDC) on the sending side
3. Transfer stablecoin on-chain to receiving entity
4. Receiving entity sells stablecoin for local currency
5. Local currency payout via local rails (SPEI in Mexico, PIX in Brazil)

**Entities to Model**:
- Treasury accounts at exchanges (Binance, Coins.ph, local exchanges)
- Bank accounts (operating, pending, holding)
- Platform fee accounts (transaction fees, FX spread)
- Compliance hold accounts
- Liquidity provider tracking

**Real Example Variables**:
- SENDER_NAME: "carlos" (not "sender001")
- RECIPIENT_NAME: "maria" (not "recipient001")
- EXCHANGE: "bitso", "binance", "coinbase"
- BANK: "banorte", "santander", "bpi"

---

### SPORTS BETTING / GAMING (from real customer implementations)

**Business Model**: Wallet-based wagering platform with deposit/withdrawal flows and wager lifecycle.

**Key Pain Points**:
- Legacy monolith platforms being unbundled
- Need internal ledger between PSP/orchestrator and betting engine
- Eligibility checks (safer gambling, fraud, suspensions) before payment processing
- Want customers to re-spend winnings rather than withdraw

**Typical Flow**:
1. Customer deposits $100 via card/bank/wallet
2. Funds become available in customer wallet
3. Customer places $10 wager (funds move to wager hold)
4. Wager resolves (win/lose)
5. Winnings credited back to wallet OR funds forfeited
6. Customer can withdraw or re-wager

**Key Accounts**:
- \`@customers:{NAME}:available\` - Spendable balance
- \`@customers:{NAME}:held:wager:{WAGER_ID}\` - Funds locked for active bets
- \`@platform:revenue\` - House winnings
- \`@platform:payouts\` - Payout pool for winners
- \`@psp:{PROVIDER}\` - Payment processor integration

**Critical Design Points**:
- Wager hold is temporary - returns to customer (win) or goes to platform (loss)
- Single currency usually (AUD for Australian sportsbooks)
- PSP orchestrator pattern common (Bridge, Primer, Gr4vy)
- Direct PSP fallback needed for orchestrator downtime
- Auth rates and cost optimization drive PSP selection

**Real Example Variables**:
- CUSTOMER_NAME: "dave", "mel", "neil" (not "user001")
- WAGER_ID: "wager001"
- PROVIDER: "bridge", "stripe", "afterpay"

---

### CRYPTO EXCHANGE (from real customer implementations)

**Business Model**: Centralized exchange with trading, custody, and fiat rails.

**Key Pain Points**:
- Home-built ledgers are common but fragile ("it works, don't touch it")
- Audit difficulties - can track money but no dashboards
- Immutability concerns - internal threats can modify ledgers
- No true double-entry between accounts
- Connectivity gap between ledger and external systems (Fireblocks, banks)

**Typical Flow**:
1. Customer deposits fiat via bank
2. Customer buys crypto (fiat debited, crypto credited)
3. Customer trades (atomic swap between assets)
4. Customer withdraws crypto (internal debit, on-chain send)

**Key Accounts**:
- \`@users:{NAME}:fiat:available\` - Fiat balance
- \`@users:{NAME}:crypto:available\` - Crypto balance (multi-asset)
- \`@exchange:orderbook:{PAIR}\` - Trading pair liquidity
- \`@custody:hot\` - Hot wallet
- \`@custody:cold\` - Cold storage
- \`@platform:fees\` - Trading fees

**Integration Points**:
- Custody providers: Fireblocks, BitGo, Copper
- Banking: Various regional banks
- On-chain: Direct node or custody API

**Real Example Variables**:
- USER_NAME: "simon", "julian" (not "user001")
- PAIR: "btcusd", "ethusdc"

---

### WEALTH MANAGEMENT / WEALTHTECH (from real customer implementations)

**Business Model**: Investment platform where users buy/sell securities, platform executes through brokers.

**Key Pain Points**:
- Cash pending vs available states during trade settlement
- Investment portfolio tracking (multiple asset types)
- Trade execution creates intermediate states
- ETF/stock/bond holdings in same account

**Typical Flow**:
1. User deposits cash (available for investing)
2. User places sell order (shares move to exchange account)
3. Broker executes trade
4. Cash received but pending (T+2 settlement)
5. Cash becomes available for withdrawal

**Key Accounts**:
- \`@users:{NAME}:cash:available\` - Spendable cash
- \`@users:{NAME}:cash:pending\` - Cash from unsettled trades (can re-invest, cannot withdraw)
- \`@users:{NAME}:investments\` - Securities holdings (multi-asset: stocks, ETFs, bonds)
- \`@exchange:{TRADE_ID}\` - Trade execution tracking
- \`@broker:settlement\` - Broker integration account

**Critical Design Points**:
- One account per trade ID allows metadata attachment (price, time, etc.)
- High volume may use common exchange account with transaction metadata instead
- Users can reinvest pending cash but cannot withdraw until settled
- All trades go through broker (platform doesn't hold liquidity pools)

**Real Example Variables**:
- USER_NAME: "marco", "guido", "ale" (not "user001")
- TRADE_ID: "trade001"
- ASSET: "TSLA/0" (0 decimals for shares), "AAPL/0"

---

### HOSPITALITY PAYMENTS / HIGH-THROUGHPUT (from real customer implementations)

**Business Model**: Payment gateway/processor handling high transaction volumes across multiple acquirers.

**Key Pain Points**:
- Contention on heavily-used accounts (acquirer receivables)
- Single-threaded queue processing creates bottlenecks
- Hash log writes slow down transaction commits
- Need bucket/ledger segregation for scale

**Performance Patterns**:
- Bucket per acquirer (isolate workloads)
- Account sharding for hot accounts (split receivables across N accounts)
- Async hash log writes
- Bulk transaction endpoints (100 txns in 1 request vs 100 requests)
- Worker parallelism based on sharded accounts

**Key Accounts**:
- \`@acquirer:{NAME}:receivable:{SHARD}\` - Sharded for throughput
- \`@merchants:{NAME}:balance\` - Merchant settlement account
- \`@platform:float\` - Working capital

**Critical Design Points**:
- Contention happens when many transactions hit same source account
- Solution: Shard the hot account (e.g., 5 receivable accounts, round-robin)
- Bulk endpoint: Send multiple transactions in single HTTP request
- Monitoring: Trace IDs correlation between systems

**Real Example Variables**:
- ACQUIRER: "adyen", "worldpay", "checkout"
- MERCHANT_NAME: "hilton", "marriott", "booking"
- SHARD: "01", "02", "03"

---

### CARD ISSUING / PROCESSOR (from real customer implementations)

**Business Model**: Card issuing processor handling authorization and settlement for credit/debit cards.

**Key Pain Points**:
- Authorization latency critical (must respond in hundreds of milliseconds)
- Two-phase commit: Authorization → Settlement/Posting (can be different amounts!)
- Partial confirmations, reversals, chargebacks
- Account hierarchy for corporate cards (company → departments → employees → cards)

**Performance Considerations**:
- ~100 TPS per account due to linearization (balance locking)
- Multi-thousand TPS at ledger level with parallel transactions
- Async hash log writes improve performance significantly
- Account hierarchy creates linearization chains (contention risk)

**Typical Flow**:
1. Card swipe → Authorization request
2. Check balance/credit limit (must be fast!)
3. Create hold on available balance
4. Later: Settlement/Posting (may differ from auth amount)
5. Handle edge cases: partial settlement, higher amount, reversals

**Key Accounts**:
- \`@cardholders:{NAME}:available\` - Spendable balance
- \`@cardholders:{NAME}:held:{AUTH_ID}\` - Authorization holds
- \`@cardholders:{NAME}:credit:limit\` - Credit limit tracking
- \`@issuer:settlement\` - Settlement pool
- \`@issuer:fees\` - Interchange/fees

**Multi-benefit Card Complexity**:
Some cards have multiple budgets (e.g., company mobility budget + personal meal vouchers):
- Same card, different accounts
- Employee leaves company → disable company budget but keep personal budget
- Requires careful account separation

**Real Example Variables**:
- CARDHOLDER_NAME: "gordon", "leo", "thierry"
- AUTH_ID: "auth001"
- FORM_FACTOR: "physical", "apple", "google"

---

### DIGITAL ASSETS / COLOR OF MONEY (from real customer implementations)

**Business Model**: Tracking the provenance of assets (e.g., USDT from different blockchains).

**Key Concept - Color of Money**:
When the same asset (e.g., USDT) comes from different sources (Ethereum vs Tron), you may need to track them separately for compliance while treating them as fungible for spending.

**Use Cases**:
- Track stablecoin by originating blockchain
- Track funds by compliance status (KYC'd vs not)
- Track promotional credits vs real money

**Implementation Pattern**:
Instead of a single "USDT" asset, use asset variants:
- \`USDT:ETH/6\` - USDT from Ethereum
- \`USDT:TRX/6\` - USDT from Tron

Or use metadata to track origin while keeping asset fungible.

---

### FX / TREASURY MANAGEMENT (from real customer implementations)

**Business Model**: Managing foreign exchange conversions and treasury operations.

**Key Concepts**:
- Conversion accounts to track FX trades
- Spread capture as revenue
- Intercompany debt tracking (denominated in stable currency like USD)
- Multi-currency customer accounts

**Typical Flow**:
1. Customer initiates conversion (EUR to USD)
2. Create conversion account for trade tracking
3. Debit EUR from customer
4. Credit USD to customer
5. Record FX rate and spread in metadata

**Key Accounts**:
- \`@customers:{NAME}:available\` - Multi-currency balance
- \`@conversions:{TRADE_ID}\` - Individual trade tracking
- \`@treasury:working\` - Working capital
- \`@platform:fx:spread\` - FX revenue
- \`@interco:{ENTITY}:debt\` - Intercompany tracking

**Important Notes**:
- Intercompany debt should be in stable reference currency (USD)
- One account per trade allows metadata storage (rate, time, counterparty)
- High-volume may use shared conversion account with transaction metadata
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
