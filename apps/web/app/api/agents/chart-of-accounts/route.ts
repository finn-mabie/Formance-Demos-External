import { NextRequest, NextResponse } from 'next/server';
import { callGemini, extractJSON, FORMANCE_CONTEXT } from '@/lib/gemini';

const ACCOUNTS_PROMPT = `You are a ledger architect specializing in Formance account structures.

${FORMANCE_CONTEXT}

## Your Task

Design a chart of accounts for a Formance Ledger demo based on the research analysis provided.

## Critical Rules (MUST FOLLOW)

1. **Use colons for ALL separation** - NEVER use underscores in account names
2. **Use {VARIABLE_NAME} for dynamic IDs** - like {CUSTOMER_ID}, {ORDER_ID}
3. **Accounts are multi-asset** - NEVER put currency/asset in account name
4. **Per-entity accounts** - NOT shared pools
5. **Clear naming** - Anyone should understand what the account is for
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
      "address": "@platform:revenue",
      "name": "Platform Revenue",
      "description": "Fees and commissions earned by the platform",
      "color": "emerald",
      "purpose": "platform"
    }
  ],
  "variables": {
    "CUSTOMER_ID": "001",
    "MERCHANT_ID": "acme",
    "ORDER_ID": "ORD001"
  },
  "rationale": "Brief explanation of why accounts are structured this way"
}

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
    const output = extractJSON(response);

    // Pass through research data
    return NextResponse.json({
      ...previousOutput,
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
