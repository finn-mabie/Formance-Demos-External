import { NextRequest, NextResponse } from 'next/server';

/**
 * Flow Designer Agent API Route
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { previousOutput } = body;

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1300));

    const output = {
      steps: [
        {
          txType: 'DEPOSIT_INITIATED',
          label: 'Deposit Initiated',
          description: 'Customer initiates a deposit - funds are pending confirmation',
          postings: [
            {
              from: '@world',
              to: '@customers:{CUSTOMER_ID}:pending',
              amount: '{AMOUNT}',
              asset: 'USD/2',
            },
          ],
          metadata: {
            type: 'DEPOSIT_INITIATED',
            customer_id: '{CUSTOMER_ID}',
          },
        },
        {
          txType: 'DEPOSIT_CONFIRMED',
          label: 'Deposit Confirmed',
          description: 'Payment confirmed - funds move to available balance',
          postings: [
            {
              from: '@customers:{CUSTOMER_ID}:pending',
              to: '@customers:{CUSTOMER_ID}:available',
              amount: '{AMOUNT}',
              asset: 'USD/2',
            },
          ],
          metadata: {
            type: 'DEPOSIT_CONFIRMED',
            customer_id: '{CUSTOMER_ID}',
          },
        },
        {
          txType: 'TRANSFER',
          label: 'Internal Transfer',
          description: 'Customer transfers funds with a small fee',
          postings: [
            {
              from: '@customers:{CUSTOMER_ID}:available',
              to: '@customers:{RECIPIENT_ID}:available',
              amount: '{TRANSFER_AMOUNT}',
              asset: 'USD/2',
            },
            {
              from: '@customers:{CUSTOMER_ID}:available',
              to: '@platform:revenue',
              amount: '{FEE_AMOUNT}',
              asset: 'USD/2',
            },
          ],
          metadata: {
            type: 'TRANSFER',
            customer_id: '{CUSTOMER_ID}',
            recipient_id: '{RECIPIENT_ID}',
            fee: '{FEE_AMOUNT}',
          },
        },
        {
          txType: 'WITHDRAWAL',
          label: 'Withdrawal',
          description: 'Customer withdraws funds to bank account',
          postings: [
            {
              from: '@customers:{RECIPIENT_ID}:available',
              to: '@banks:operating',
              amount: '{WITHDRAWAL_AMOUNT}',
              asset: 'USD/2',
            },
          ],
          metadata: {
            type: 'WITHDRAWAL',
            customer_id: '{RECIPIENT_ID}',
          },
        },
      ],
      rationale: 'Designed a complete customer journey: deposit → confirmation → transfer → withdrawal, demonstrating pending states and fee collection.',
    };

    return NextResponse.json(output);
  } catch (error) {
    console.error('Flow designer agent error:', error);
    return NextResponse.json(
      { error: 'Flow designer agent failed' },
      { status: 500 }
    );
  }
}
