import { NextRequest, NextResponse } from 'next/server';

/**
 * Config Generator Agent API Route
 *
 * Assembles all previous outputs into a complete demo configuration.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, previousOutput } = body;

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Extract company name from research or use default
    const companyName = previousOutput?.companyName ?? 'Demo Company';
    const id = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-demo';

    const output = {
      id,
      name: `${companyName} Wallet Demo`,
      description: `Customer wallet platform with deposits, transfers, and withdrawals`,
      accounts: [
        {
          address: '@world',
          name: 'External World',
          description: 'Money entering/leaving the system',
          color: 'slate',
        },
        {
          address: '@customers:{CUSTOMER_ID}:available',
          name: 'Customer Available Balance',
          description: 'Funds available for use',
          color: 'green',
        },
        {
          address: '@customers:{CUSTOMER_ID}:pending',
          name: 'Customer Pending Balance',
          description: 'Funds awaiting confirmation',
          color: 'orange',
        },
        {
          address: '@customers:{RECIPIENT_ID}:available',
          name: 'Recipient Available Balance',
          description: 'Transfer recipient funds',
          color: 'blue',
        },
        {
          address: '@platform:revenue',
          name: 'Platform Revenue',
          description: 'Fees collected by the platform',
          color: 'emerald',
        },
        {
          address: '@banks:operating',
          name: 'Operating Bank Account',
          description: 'Bank account for withdrawals',
          color: 'gray',
        },
      ],
      variables: {
        CUSTOMER_ID: 'cust-alice',
        RECIPIENT_ID: 'cust-bob',
        AMOUNT: '10000',
        TRANSFER_AMOUNT: '5000',
        FEE_AMOUNT: '100',
        WITHDRAWAL_AMOUNT: '4900',
      },
      transactionSteps: [
        {
          txType: 'DEPOSIT_INITIATED',
          label: 'Deposit Initiated',
          description: 'Customer initiates a $100 deposit - funds are pending confirmation',
          numscript: `send [USD/2 {AMOUNT}] (
  source = @world
  destination = @customers:{CUSTOMER_ID}:pending
)

set_tx_meta("type", "DEPOSIT_INITIATED")
set_tx_meta("customer_id", "{CUSTOMER_ID}")`,
          queries: [
            {
              title: 'Pending Balance',
              description: 'Funds awaiting confirmation',
              queryType: 'balance' as const,
              addressFilter: 'customers:{CUSTOMER_ID}:pending',
            },
          ],
        },
        {
          txType: 'DEPOSIT_CONFIRMED',
          label: 'Deposit Confirmed',
          description: 'Payment confirmed - funds move to available balance',
          numscript: `send [USD/2 {AMOUNT}] (
  source = @customers:{CUSTOMER_ID}:pending
  destination = @customers:{CUSTOMER_ID}:available
)

set_tx_meta("type", "DEPOSIT_CONFIRMED")
set_tx_meta("customer_id", "{CUSTOMER_ID}")`,
          queries: [
            {
              title: 'Available Balance',
              description: 'Funds now available for use',
              queryType: 'balance' as const,
              addressFilter: 'customers:{CUSTOMER_ID}:available',
            },
          ],
        },
        {
          txType: 'TRANSFER',
          label: 'Internal Transfer',
          description: 'Customer transfers $50 with a $1 fee',
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
          queries: [
            {
              title: 'Sender Balance',
              description: 'Remaining after transfer and fee',
              queryType: 'balance' as const,
              addressFilter: 'customers:{CUSTOMER_ID}:available',
            },
            {
              title: 'Recipient Balance',
              description: 'Funds received',
              queryType: 'balance' as const,
              addressFilter: 'customers:{RECIPIENT_ID}:available',
            },
            {
              title: 'Platform Revenue',
              description: 'Fee collected',
              queryType: 'balance' as const,
              addressFilter: 'platform:revenue',
            },
          ],
        },
        {
          txType: 'WITHDRAWAL',
          label: 'Withdrawal',
          description: 'Recipient withdraws $49 to bank account',
          numscript: `send [USD/2 {WITHDRAWAL_AMOUNT}] (
  source = @customers:{RECIPIENT_ID}:available
  destination = @banks:operating
)

set_tx_meta("type", "WITHDRAWAL")
set_tx_meta("customer_id", "{RECIPIENT_ID}")`,
          queries: [
            {
              title: 'Final Recipient Balance',
              description: 'Remaining after withdrawal',
              queryType: 'balance' as const,
              addressFilter: 'customers:{RECIPIENT_ID}:available',
            },
          ],
        },
      ],
      usefulQueries: [
        {
          title: 'All Customer Balances',
          description: 'Platform-wide customer liabilities',
          queryType: 'balance' as const,
          addressFilter: 'customers:',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for the customer',
          queryType: 'transactions' as const,
          transactionFilter: {
            metadata: { customer_id: '{CUSTOMER_ID}' },
          },
        },
        {
          title: 'All Transfers',
          description: 'Filter by transaction type',
          queryType: 'transactions' as const,
          transactionFilter: {
            metadata: { type: 'TRANSFER' },
          },
        },
        {
          title: 'Customer Accounts',
          description: 'List all accounts for the customer',
          queryType: 'accounts' as const,
          accountAddress: 'customers:{CUSTOMER_ID}:',
        },
      ],
    };

    return NextResponse.json(output);
  } catch (error) {
    console.error('Config generator agent error:', error);
    return NextResponse.json(
      { error: 'Config generator agent failed' },
      { status: 500 }
    );
  }
}
