import { NextRequest, NextResponse } from 'next/server';
import { callGemini, extractJSON, FORMANCE_CONTEXT } from '@/lib/gemini';

const ACCOUNTS_PROMPT = `You are a ledger architect specializing in Formance account structures.

${FORMANCE_CONTEXT}

## Your Task

Design a chart of accounts for a Formance Ledger demo based on the research analysis provided.

## ABSOLUTE REQUIREMENTS (VIOLATIONS WILL CAUSE ERRORS)

1. **NEVER USE UNDERSCORES** - Use colons for ALL separation. This is critical.
   - WRONG: @platform:fx_spread ❌
   - WRONG: @platform:premium_services ❌
   - RIGHT: @platform:fx:spread ✓
   - RIGHT: @platform:premium ✓

2. **IDs must be separate segments** - Numbers/IDs get their own colon-separated segment
   - WRONG: @customers:user001:available ❌
   - WRONG: @banks:bank001:operating ❌
   - RIGHT: @customers:{CUSTOMER_ID}:available ✓
   - RIGHT: @banks:{BANK_ID}:operating ✓

3. **Use {VARIABLE_NAME} placeholders** - For any dynamic ID
   - Use: {CUSTOMER_ID}, {MERCHANT_ID}, {ORDER_ID}, {BANK_ID}, etc.

4. **Keep segment names short and simple** - Single words, no concatenation
   - WRONG: @platform:transactionfees ❌
   - RIGHT: @platform:fees ✓

5. **Accounts are multi-asset** - NEVER put currency in account name
6. **DO NOT include @world** - it's implicit in the system

## Output Format

Respond with a valid JSON object (no markdown, just raw JSON):

{
  "accounts": [
    {
      "address": "@customers:{CUSTOMER_ID}:available",
      "name": "Customer Available Balance",
      "description": "Funds available for the customer to spend",
      "color": "blue",
      "purpose": "customer"
    },
    {
      "address": "@merchants:{MERCHANT_ID}:available",
      "name": "Merchant Balance",
      "description": "Funds available for the merchant",
      "color": "orange",
      "purpose": "merchant"
    },
    {
      "address": "@platform:fees",
      "name": "Platform Fees",
      "description": "Transaction fees earned by the platform",
      "color": "emerald",
      "purpose": "platform"
    },
    {
      "address": "@psp:stripe",
      "name": "Stripe PSP",
      "description": "Payment processor integration account",
      "color": "slate",
      "purpose": "external"
    }
  ],
  "variables": {
    "CUSTOMER_ID": "001",
    "MERCHANT_ID": "001",
    "ORDER_ID": "001"
  },
  "rationale": "Brief explanation of why accounts are structured this way"
}

## VALIDATION CHECKLIST (check your output against this):
- [ ] No underscores anywhere in account addresses
- [ ] All IDs use {VARIABLE_NAME} format
- [ ] Each segment is a single word (no concatenated words)
- [ ] No currency in account names

## Account Colors
- Customer accounts: blue, sky, cyan
- Platform accounts: emerald, green
- External/bank accounts: slate, gray
- Exchange accounts: purple, violet
- Treasury accounts: amber, yellow
- Merchant accounts: orange, rose

## Purpose Values
- "customer" - End-user accounts
- "merchant" - Seller/vendor accounts
- "platform" - Company operational accounts
- "external" - Banks, PSPs, external systems
- "exchange" - FX conversion tracking
- "interco" - Intercompany accounts
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, previousOutput } = body;

    // Build prompt from research
    let userPrompt = 'Design the account structure for this demo:\n\n';

    if (previousOutput?.companyName) {
      userPrompt += `Company: ${previousOutput.companyName}\n`;
    }
    if (previousOutput?.businessModel) {
      userPrompt += `Business Model: ${previousOutput.businessModel}\n`;
    }
    if (previousOutput?.keyEntities) {
      userPrompt += `Key Entities: ${previousOutput.keyEntities.join(', ')}\n`;
    }
    if (previousOutput?.keyFlows) {
      userPrompt += `Key Flows:\n${previousOutput.keyFlows.map((f: string) => `- ${f}`).join('\n')}\n`;
    }
    if (previousOutput?.currencies) {
      userPrompt += `Currencies: ${previousOutput.currencies.join(', ')}\n`;
    }
    if (previousOutput?.suggestedDemoType) {
      userPrompt += `Demo Type: ${previousOutput.suggestedDemoType}\n`;
    }

    if (input?.description) {
      userPrompt += `\nOriginal Description: ${input.description}\n`;
    }

    userPrompt += '\nDesign the chart of accounts for this use case.';

    const response = await callGemini(ACCOUNTS_PROMPT, userPrompt);
    const output = extractJSON<Record<string, unknown>>(response);

    // Pass through research data
    return NextResponse.json({
      ...(previousOutput || {}),
      ...output,
    });
  } catch (error) {
    console.error('Chart of accounts agent error:', error);
    return NextResponse.json(
      { error: 'Chart of accounts agent failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
