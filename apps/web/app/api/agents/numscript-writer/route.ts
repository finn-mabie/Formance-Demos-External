import { NextRequest, NextResponse } from 'next/server';

/**
 * Numscript Writer Agent API Route
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { previousOutput } = body;

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const output = {
      steps: [
        {
          txType: 'DEPOSIT_INITIATED',
          numscript: `send [USD/2 {AMOUNT}] (
  source = @world
  destination = @customers:{CUSTOMER_ID}:pending
)

set_tx_meta("type", "DEPOSIT_INITIATED")
set_tx_meta("customer_id", "{CUSTOMER_ID}")`,
        },
        {
          txType: 'DEPOSIT_CONFIRMED',
          numscript: `send [USD/2 {AMOUNT}] (
  source = @customers:{CUSTOMER_ID}:pending
  destination = @customers:{CUSTOMER_ID}:available
)

set_tx_meta("type", "DEPOSIT_CONFIRMED")
set_tx_meta("customer_id", "{CUSTOMER_ID}")`,
        },
        {
          txType: 'TRANSFER',
          numscript: `send [USD/2 {TRANSFER_AMOUNT}] (
  source = @customers:{CUSTOMER_ID}:available
  destination = @customers:{RECIPIENT_ID}:available
)

send [USD/2 {FEE_AMOUNT}] (
  source = @customers:{CUSTOMER_ID}:available
  destination = @platform:revenue
)

set_tx_meta("type", "TRANSFER")
set_tx_meta("customer_id", "{CUSTOMER_ID}")
set_tx_meta("recipient_id", "{RECIPIENT_ID}")
set_tx_meta("fee", "{FEE_AMOUNT}")`,
        },
        {
          txType: 'WITHDRAWAL',
          numscript: `send [USD/2 {WITHDRAWAL_AMOUNT}] (
  source = @customers:{RECIPIENT_ID}:available
  destination = @banks:operating
)

set_tx_meta("type", "WITHDRAWAL")
set_tx_meta("customer_id", "{RECIPIENT_ID}")`,
        },
      ],
    };

    return NextResponse.json(output);
  } catch (error) {
    console.error('Numscript writer agent error:', error);
    return NextResponse.json(
      { error: 'Numscript writer agent failed' },
      { status: 500 }
    );
  }
}
