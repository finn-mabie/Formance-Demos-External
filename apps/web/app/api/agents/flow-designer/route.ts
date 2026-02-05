import { NextRequest, NextResponse } from 'next/server';
import { callGemini, extractJSON, FORMANCE_CONTEXT } from '@/lib/gemini';

const FLOW_PROMPT = `You are a financial flow designer specializing in Formance transaction flows.

${FORMANCE_CONTEXT}

## Your Task

Design the transaction steps for a demo. Each step represents a business event that triggers ledger postings.

## CRITICAL RULES

### Rule 1: ONE EVENT = ONE STEP
Each distinct business event MUST be a SEPARATE step. Never combine multiple events.

WRONG ❌: "Fund deposits 500 ETH and 10M USDC" as ONE step
RIGHT ✓:
- Step 1: "Fund Deposits ETH" (500 ETH)
- Step 2: "Fund Deposits USDC" (10M USDC)

Different assets = different blockchain transactions = SEPARATE STEPS.

### Rule 2: ATOMIC FEES IN SAME STEP
When a platform takes a fee WITH another action (like staking), those are MULTIPLE postings in ONE step.

Example: "Trader Stakes ETH with Platform Fee"
- Posting 1: ETH moves from available to staking
- Posting 2: Fee moves from available to platform fees
Both happen atomically in ONE step.

### Rule 3: USE REALISTIC AMOUNTS
Use realistic dollar/crypto amounts that make sense for the use case:
- Retail: $100, $500, $1,000
- Institutional: $100,000, $1M, $10M
- Crypto: 1 ETH, 10 ETH, 500 ETH, 10,000 USDC

### Rule 4: EXCHANGE PATTERN FOR CONVERSIONS
For any currency conversion, token mint/burn, or asset swap, the flow MUST use an exchange account with BIDIRECTIONAL @world flows:
- Source asset: Customer → Exchange → @world
- Target asset: @world → Exchange → Customer
- Fee: Exchange → @platform:revenue

This creates proper diagram visualization with horizontal arrows between exchange and @world.

## Guidelines

1. **Design 4-8 transaction steps** that tell a compelling story
2. **Each step = one business event** (deposit, transfer, stake, etc.)
3. **Steps should build on each other** logically
4. **Include realistic metadata** for each transaction
5. **Use the accounts provided** from the chart of accounts

## Output Format

Respond with a valid JSON object (no markdown, just raw JSON):

{
  "transactionSteps": [
    {
      "txType": "ETH_DEPOSIT",
      "label": "Trader Bob Deposits ETH",
      "description": "Trader Bob deposits 100 ETH into the custody platform, pending block confirmations",
      "accounts": ["@world", "@clients:genesis:trader:bob:pending"],
      "metadata": {
        "type": "DEPOSIT",
        "asset": "ETH",
        "trader": "bob"
      }
    }
  ],
  "flowRationale": "Explanation of why this sequence tells a good story"
}

## Good Step Sequences

For a **custody/fund** demo:
1. Fund deposits ETH (pending)
2. Fund deposits USDC (pending) - SEPARATE STEP for different asset
3. Deposits confirmed (pending → available)
4. Trader allocates to exchange
5. Trader stakes with fee (atomic - one step, two postings)
6. Staking rewards distributed

For a **wallet** demo:
1. Customer deposits
2. Customer makes purchase (with atomic fee)
3. Merchant receives funds
4. Merchant withdraws

For a **remittance** demo:
1. Sender initiates USD transfer
2. USD → USDC conversion
3. USDC transferred on-chain
4. USDC → MXN conversion (with FX spread)
5. MXN payout initiated
6. Payout confirmed
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, previousOutput } = body;

    // Build prompt from previous outputs
    let userPrompt = 'Design the transaction flow for this demo:\n\n';

    if (previousOutput?.companyName) {
      userPrompt += `Company: ${previousOutput.companyName}\n`;
    }
    if (previousOutput?.businessModel) {
      userPrompt += `Business Model: ${previousOutput.businessModel}\n`;
    }
    if (previousOutput?.accounts) {
      userPrompt += `\nAccounts available:\n`;
      for (const acc of previousOutput.accounts) {
        userPrompt += `- ${acc.address}: ${acc.description}\n`;
      }
    }
    if (previousOutput?.variables) {
      userPrompt += `\nVariables: ${JSON.stringify(previousOutput.variables)}\n`;
    }
    if (previousOutput?.keyFlows) {
      userPrompt += `\nKey business flows:\n${previousOutput.keyFlows.map((f: string) => `- ${f}`).join('\n')}\n`;
    }
    if (previousOutput?.currencies) {
      userPrompt += `Currencies: ${previousOutput.currencies.join(', ')}\n`;
    }

    if (input?.description) {
      userPrompt += `\nOriginal Description: ${input.description}\n`;
    }

    userPrompt += '\nDesign 4-8 transaction steps that tell a compelling story for this use case.';

    const response = await callGemini(FLOW_PROMPT, userPrompt);
    const output = extractJSON<Record<string, unknown>>(response);

    // Pass through previous data
    return NextResponse.json({
      ...(previousOutput || {}),
      ...output,
    });
  } catch (error) {
    console.error('Flow designer agent error:', error);
    return NextResponse.json(
      { error: 'Flow designer agent failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
