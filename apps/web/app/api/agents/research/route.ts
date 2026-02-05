import { NextRequest, NextResponse } from 'next/server';

/**
 * Research Agent API Route
 *
 * In production, this would use the Anthropic API with the research prompt.
 * For now, returns mock data based on input.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate mock research output based on input
    const companyName = extractCompanyName(input.companyUrl, input.useCase);

    const output = {
      companyName,
      businessModel: `${companyName} is a fintech company that processes payments and manages customer funds. They handle deposits, transfers, and withdrawals for their users.`,
      keyFlows: [
        'Customer deposits via bank transfer',
        'Internal transfers between users',
        'Withdrawal to bank account',
        'Fee collection on transactions',
        'Refund processing',
      ],
      painPoints: [
        'Manual reconciliation of transactions',
        'Lack of real-time balance visibility',
        'Difficulty tracking multi-step flows',
        'Audit trail gaps',
      ],
      stakeholders: ['Customers', 'Platform', 'Partner Banks', 'Payment Processors'],
      currencies: ['USD'],
      suggestedDemoType: 'wallet',
    };

    return NextResponse.json(output);
  } catch (error) {
    console.error('Research agent error:', error);
    return NextResponse.json(
      { error: 'Research agent failed' },
      { status: 500 }
    );
  }
}

function extractCompanyName(url?: string, useCase?: string): string {
  if (url) {
    try {
      const hostname = new URL(url).hostname;
      const name = hostname.replace('www.', '').split('.')[0];
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Acme';
    } catch {
      return 'Acme';
    }
  }

  if (useCase) {
    // Extract first word as potential company name
    const words = useCase.split(' ');
    const firstWord = words[0];
    if (firstWord && firstWord.length > 2 && firstWord[0]?.toUpperCase() === firstWord[0]) {
      return firstWord;
    }
  }

  return 'Acme';
}
