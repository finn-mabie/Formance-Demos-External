import { NextRequest, NextResponse } from 'next/server';
import { callGemini, extractJSON, FORMANCE_CONTEXT, DEMO_OUTPUT_FORMAT } from '@/lib/gemini';

const CONFIG_PROMPT = `You are assembling a complete Formance demo configuration from the components provided.

${FORMANCE_CONTEXT}

${DEMO_OUTPUT_FORMAT}

## Your Task

Take all the pieces from the previous agents (accounts, transaction steps with numscript) and assemble them into a complete, valid demo configuration.

## Requirements

1. **Generate a unique ID** - lowercase, hyphen-separated, e.g., "acme-wallet-demo"
2. **Create a descriptive name** - e.g., "Acme Digital Wallet Demo"
3. **Write a one-line description** - summarizes what the demo shows
4. **Include all accounts** - with proper colors
5. **Include all transaction steps** - with their numscript
6. **Add 3-5 useful queries** - balance checks, transaction history, account listings
7. **DO NOT include @world in accounts** - it's implicit

## CRITICAL: Validate Account Addresses

Before outputting, verify EVERY account address follows these rules:
- NO underscores anywhere (use colons instead)
- IDs use {VARIABLE_NAME} format like {CUSTOMER_ID}
- Each segment is a single short word
- No currency/asset in account names

WRONG examples to avoid:
- @platform:fx_spread ❌ → use @platform:fx:spread
- @customers:user001:available ❌ → use @customers:{CUSTOMER_ID}:available
- @banks:us:bank001:operating ❌ → use @banks:{BANK_ID}:operating

## Query Types

Balance query:
{
  "title": "Customer Balances",
  "description": "All customer account balances",
  "queryType": "balance",
  "addressFilter": "@customers:"
}

Transaction query:
{
  "title": "All Deposits",
  "description": "Filter transactions by type",
  "queryType": "transactions",
  "transactionFilter": {
    "metadata": { "type": "DEPOSIT" }
  }
}

Account query:
{
  "title": "Customer Accounts",
  "description": "List accounts for a customer",
  "queryType": "accounts",
  "accountAddress": "@customers:{CUSTOMER_ID}:"
}
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, previousOutput } = body;

    // Build prompt with all assembled data
    let userPrompt = 'Assemble the final demo configuration:\n\n';

    if (previousOutput?.companyName) {
      userPrompt += `Company: ${previousOutput.companyName}\n`;
    }
    if (previousOutput?.businessModel) {
      userPrompt += `Business Model: ${previousOutput.businessModel}\n`;
    }
    if (previousOutput?.suggestedDemoName) {
      userPrompt += `Suggested Demo Name: ${previousOutput.suggestedDemoName}\n`;
    }
    if (previousOutput?.suggestedDescription) {
      userPrompt += `Suggested Description: ${previousOutput.suggestedDescription}\n`;
    }
    if (previousOutput?.accounts) {
      userPrompt += `\nAccounts:\n${JSON.stringify(previousOutput.accounts, null, 2)}\n`;
    }
    if (previousOutput?.variables) {
      userPrompt += `\nVariables: ${JSON.stringify(previousOutput.variables)}\n`;
    }
    if (previousOutput?.transactionSteps) {
      userPrompt += `\nTransaction Steps:\n${JSON.stringify(previousOutput.transactionSteps, null, 2)}\n`;
    }
    if (previousOutput?.currencies) {
      userPrompt += `\nCurrencies: ${previousOutput.currencies.join(', ')}\n`;
    }

    if (input?.description) {
      userPrompt += `\nOriginal business description: ${input.description}\n`;
    }

    userPrompt += '\nAssemble these into a complete demo configuration. Output valid JSON only.';

    const response = await callGemini(CONFIG_PROMPT, userPrompt);
    const output = extractJSON(response);

    return NextResponse.json(output);
  } catch (error) {
    console.error('Config generator agent error:', error);
    return NextResponse.json(
      { error: 'Config generator agent failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
