import { NextRequest, NextResponse } from 'next/server';
import { callGemini, extractJSON, FORMANCE_CONTEXT } from '@/lib/gemini';

const RESEARCH_PROMPT = `You are a financial technology analyst specializing in understanding fintech business models and payment flows.

Your task is to analyze the provided company information and describe their business in terms that will help design a Formance Ledger demo.

${FORMANCE_CONTEXT}

## DOMAIN DETECTION

First, identify which domain(s) this company operates in. This determines the account patterns and flows to use.

### CRYPTO REMITTANCE
Keywords: remittance, cross-border, stablecoin, USDT, USDC, emerging markets, Philippines, Brazil, Mexico, SPEI, PIX
Pattern: "Stablecoin sandwich" - fiat → stablecoin → on-chain → stablecoin → local fiat
Key entities: Treasury at exchanges, compliance holds, FX spread accounts, correspondent banks
Example pattern: Cross-border remittance platforms using crypto rails

### SPORTS BETTING / GAMING
Keywords: sportsbook, wager, betting, gaming, wallet, deposits, withdrawals, winnings
Pattern: Customer wallet → wager hold → resolution (win/lose) → payout or forfeit
Key entities: Customer wallets, wager holds, platform revenue, PSP integration
Example pattern: Sports betting and gaming platforms

### CRYPTO EXCHANGE
Keywords: exchange, trading, buy/sell, custody, hot wallet, cold wallet, order book
Pattern: Fiat deposit → trade → crypto credit → withdrawal
Key entities: User fiat/crypto balances, custody wallets, trading fees
Example pattern: Cryptocurrency exchange platforms

### WEALTH MANAGEMENT / WEALTHTECH
Keywords: investments, portfolio, ETF, stocks, bonds, broker, settlement, T+2
Pattern: Cash deposit → trade execution → pending settlement → available
Key entities: Cash accounts, investment accounts, broker integration, trade execution
Example pattern: Wealth management and investment platforms

### HOSPITALITY / HIGH-THROUGHPUT PAYMENTS
Keywords: hotel, hospitality, acquirer, high volume, throughput, payment gateway
Pattern: Authorization → capture → settlement → merchant payout
Key entities: Acquirer receivables (sharded), merchant accounts, float
Example pattern: Hospitality and high-throughput payment platforms

### DIGITAL WALLET / NEOBANK
Keywords: wallet, neobank, P2P, payments, send money, balance
Pattern: Deposit → internal transfer → withdrawal
Key entities: Customer wallets, pending/available states, platform fees

### MARKETPLACE / ESCROW
Keywords: marketplace, escrow, buyer, seller, commission, payout
Pattern: Buyer funds escrow → fulfillment → seller payout (minus commission)
Key entities: Buyer wallets, seller wallets, escrow accounts, commission

### CRYPTO CUSTODY
Keywords: custody, institutional, fund, prime brokerage, staking, allocation
Pattern: Deposit pending → confirmed → allocated to exchange → staking
Key entities: Fund master accounts, trader sub-accounts, exchange allocations, staking pools
Example pattern: Institutional crypto custody platforms

### CARD ISSUING / PROCESSING
Keywords: card issuing, authorization, settlement, credit card, debit card, processor, acquirer
Pattern: Authorization (hold) → Settlement/Posting (may differ from auth)
Key entities: Cardholder accounts, auth holds, credit limits, issuer settlement
Example companies: Enfuce, Marqeta, Stripe Issuing, Galileo
Key considerations: Latency critical (~100ms), two-phase commit, corporate card hierarchies

## Your Task

Based on the provided company website and/or description:

1. **Identify the Domain(s)**: Which category above best fits?
2. **Company Overview**: What the company does in 1-2 sentences
3. **Business Model**: How they make money
4. **Key Entities**: Who are the participants (use domain-specific naming)
5. **Money Flows**: What are the main financial transactions (use domain-specific patterns)
6. **Currencies/Assets**: What currencies or assets are involved
7. **Pain Points**: What ledger/tracking challenges do they likely face

## Output Format

Respond with a valid JSON object (no markdown, just raw JSON):

{
  "domain": "crypto_remittance | sports_betting | crypto_exchange | wealth_management | hospitality_payments | digital_wallet | marketplace | crypto_custody | card_issuing",
  "companyName": "Company Name",
  "businessModel": "Detailed description of what they do and how they make money",
  "keyEntities": ["Customers", "Merchants", "Banks", "Payment Processors"],
  "keyFlows": [
    "Customer deposits funds via bank transfer",
    "Customer purchases from merchant",
    "Platform collects commission",
    "Merchant receives payout"
  ],
  "currencies": ["USD", "EUR"],
  "painPoints": [
    "Need to track balances across multiple systems",
    "Reconciliation with payment providers",
    "Audit trail for compliance"
  ],
  "suggestedDemoType": "marketplace",
  "suggestedDemoName": "Suggested Demo Name",
  "suggestedDescription": "One-line description of what the demo will show",
  "domainSpecificNotes": "Additional context from domain knowledge that should influence account design"
}
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    // Build user prompt from input
    let userPrompt = 'Analyze this company for a Formance Ledger demo:\n\n';

    if (input.companyUrl) {
      userPrompt += `Company Website: ${input.companyUrl}\n\n`;
    }

    if (input.description) {
      userPrompt += `Description of what they're building:\n${input.description}\n\n`;
    }

    userPrompt += 'Please analyze this and provide the structured output.';

    const response = await callGemini(RESEARCH_PROMPT, userPrompt);
    const output = extractJSON(response);

    return NextResponse.json(output);
  } catch (error) {
    console.error('Research agent error:', error);
    return NextResponse.json(
      { error: 'Research agent failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
