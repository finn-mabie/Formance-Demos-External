import { NextRequest, NextResponse } from 'next/server';

/**
 * Chart of Accounts Agent API Route
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { previousOutput } = body;

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const companyName = previousOutput?.companyName ?? 'Acme';
    const id = companyName.toLowerCase().replace(/\s+/g, '-');

    const output = {
      accounts: [
        {
          address: '@world',
          name: 'External World',
          description: 'Money entering/leaving the system',
          color: 'slate',
          purpose: 'external',
        },
        {
          address: `@customers:{CUSTOMER_ID}:available`,
          name: 'Customer Available Balance',
          description: 'Funds available for use',
          color: 'green',
          purpose: 'customer',
        },
        {
          address: `@customers:{CUSTOMER_ID}:pending`,
          name: 'Customer Pending Balance',
          description: 'Funds awaiting confirmation',
          color: 'orange',
          purpose: 'customer',
        },
        {
          address: '@platform:revenue',
          name: 'Platform Revenue',
          description: 'Fees collected by the platform',
          color: 'emerald',
          purpose: 'platform',
        },
        {
          address: '@banks:operating',
          name: 'Operating Bank Account',
          description: 'Bank account for withdrawals',
          color: 'gray',
          purpose: 'external',
        },
      ],
      rationale: `Account structure designed for ${companyName}'s wallet platform, supporting customer balances with pending/available states and platform fee collection.`,
    };

    return NextResponse.json(output);
  } catch (error) {
    console.error('Chart of accounts agent error:', error);
    return NextResponse.json(
      { error: 'Chart of accounts agent failed' },
      { status: 500 }
    );
  }
}
