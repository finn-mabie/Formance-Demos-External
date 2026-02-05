import { NextRequest, NextResponse } from 'next/server';
import { callGemini, extractJSON, FORMANCE_CONTEXT } from '@/lib/gemini';

const NUMSCRIPT_PROMPT = `You are a Numscript expert who writes correct, idiomatic Formance transaction code.

${FORMANCE_CONTEXT}

## Your Task

Write Numscript code for each transaction step in the flow.

## Critical Numscript Rules

1. **ALWAYS use @world for money entering/leaving the system** - never make up external accounts
2. **Variables use {NAME} syntax** - NOT $name
3. **Asset format: [ASSET/PRECISION AMOUNT]** - e.g., [USD/2 10000] for $100.00
4. **Use realistic amounts** - pick sensible numbers that work mathematically
5. **NEVER use "allowing unbounded overdraft" on @world** - it already allows overdraft
6. **Use "allowing unbounded overdraft" on PSP accounts** - when they credit before settlement
7. **Include set_tx_meta for tracking** - type, IDs, relevant context

## Numscript Syntax Reference

\`\`\`numscript
// Basic send
send [USD/2 10000] (
  source = @world
  destination = @customers:{CUSTOMER_ID}:available
)

// Send with fee split
send [USD/2 10000] (
  source = @customers:{CUSTOMER_ID}:available
  destination = {
    2.5% to @platform:fees
    remaining to @merchants:{MERCHANT_ID}:available
  }
)

// Send entire balance
send [USD/2 *] (
  source = @escrow:{ORDER_ID}
  destination = @merchants:{MERCHANT_ID}:available
)

// PSP crediting (allows overdraft)
send [USD/2 10000] (
  source = @psp:stripe allowing unbounded overdraft
  destination = @customers:{CUSTOMER_ID}:available
)

// Metadata
set_tx_meta("type", "DEPOSIT")
set_tx_meta("order_id", "{ORDER_ID}")
\`\`\`

## Output Format

Respond with a valid JSON object (no markdown, just raw JSON):

{
  "stepsWithNumscript": [
    {
      "txType": "DEPOSIT",
      "label": "Customer Deposits Funds",
      "description": "Customer deposits $100 into their wallet",
      "numscript": "send [USD/2 10000] (\\n  source = @world\\n  destination = @customers:{CUSTOMER_ID}:available\\n)\\n\\nset_tx_meta(\\"type\\", \\"DEPOSIT\\")\\nset_tx_meta(\\"customer_id\\", \\"{CUSTOMER_ID}\\")"
    }
  ]
}

IMPORTANT: The numscript field must be a valid string with escaped newlines (\\n) and escaped quotes (\\").
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, previousOutput } = body;

    // Build prompt from previous outputs
    let userPrompt = 'Write Numscript for each transaction step:\n\n';

    if (previousOutput?.accounts) {
      userPrompt += `Accounts:\n`;
      for (const acc of previousOutput.accounts) {
        userPrompt += `- ${acc.address}: ${acc.description}\n`;
      }
    }
    if (previousOutput?.variables) {
      userPrompt += `\nVariables: ${JSON.stringify(previousOutput.variables)}\n`;
    }
    if (previousOutput?.currencies) {
      userPrompt += `\nCurrencies: ${previousOutput.currencies.join(', ')}\n`;
    }
    if (previousOutput?.transactionSteps) {
      userPrompt += `\nTransaction Steps to implement:\n`;
      for (const step of previousOutput.transactionSteps) {
        userPrompt += `\n${step.txType}: ${step.label}\n`;
        userPrompt += `Description: ${step.description}\n`;
        if (step.accounts) {
          userPrompt += `Accounts involved: ${step.accounts.join(', ')}\n`;
        }
        if (step.metadata) {
          userPrompt += `Metadata: ${JSON.stringify(step.metadata)}\n`;
        }
      }
    }

    if (input?.description) {
      userPrompt += `\nOriginal business description: ${input.description}\n`;
    }

    userPrompt += '\nWrite correct Numscript for each step. Use realistic amounts.';

    const response = await callGemini(NUMSCRIPT_PROMPT, userPrompt);
    const output = extractJSON<{ stepsWithNumscript: Array<{ txType: string; label: string; description: string; numscript: string }> }>(response);

    return NextResponse.json({
      ...(previousOutput || {}),
      transactionSteps: output.stepsWithNumscript,
    });
  } catch (error) {
    console.error('Numscript writer agent error:', error);
    return NextResponse.json(
      { error: 'Numscript writer agent failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
