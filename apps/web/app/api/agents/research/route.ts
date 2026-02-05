import { NextRequest, NextResponse } from 'next/server';
import { callGemini, extractJSON, FORMANCE_CONTEXT } from '@/lib/gemini';

const RESEARCH_PROMPT = `You are a financial technology analyst specializing in understanding fintech business models and payment flows.

Your task is to analyze the provided company information and describe their business in terms that will help design a Formance Ledger demo.

${FORMANCE_CONTEXT}

## Your Task

Based on the provided company website and/or description, identify:

1. **Company Overview**: What the company does in 1-2 sentences
2. **Business Model**: How they make money
3. **Key Entities**: Who are the participants (customers, merchants, banks, etc.)
4. **Money Flows**: What are the main financial transactions that occur
5. **Currencies/Assets**: What currencies or assets are involved
6. **Demo Type Suggestion**: What type of demo would best showcase this (wallet, remittance, marketplace, custody, etc.)

## Output Format

Respond with a valid JSON object (no markdown, just raw JSON):

{
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
  "suggestedDescription": "One-line description of what the demo will show"
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
