import { NextRequest, NextResponse } from 'next/server';
import { callGemini, extractJSON, FORMANCE_CONTEXT } from '@/lib/gemini';

const FLOW_PROMPT = `You are a financial flow designer specializing in Formance transaction flows.

${FORMANCE_CONTEXT}

## Your Task

Design the transaction steps for a demo. Each step represents a business event that triggers ledger postings.

## Guidelines

1. **Design 4-8 transaction steps** that tell a compelling story
2. **Each step should be a distinct business event** (deposit, transfer, payout, etc.)
3. **Steps should build on each other** to show a complete flow
4. **Include realistic metadata** for each transaction
5. **Use the accounts provided** from the chart of accounts

## Output Format

Respond with a valid JSON object (no markdown, just raw JSON):

{
  "transactionSteps": [
    {
      "txType": "DEPOSIT",
      "label": "Customer Deposits Funds",
      "description": "Customer deposits $100 into their wallet via bank transfer",
      "accounts": ["@world", "@customers:{CUSTOMER_ID}:available"],
      "metadata": {
        "type": "DEPOSIT",
        "customer_id": "{CUSTOMER_ID}",
        "method": "bank_transfer"
      }
    }
  ],
  "flowRationale": "Explanation of why this sequence tells a good story"
}

## Good Step Sequences

For a **wallet** demo:
1. Customer deposits
2. Customer makes a purchase (with fee)
3. Merchant receives funds
4. Merchant withdraws to bank

For a **marketplace** demo:
1. Buyer funds escrow
2. Order fulfilled, funds released to seller (minus commission)
3. Seller withdraws to bank

For a **remittance** demo:
1. Sender initiates transfer
2. Currency conversion
3. Funds sent to recipient country
4. Recipient receives local currency
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
