import { DemoConfig } from './types';

/**
 * Sportsbet Demo Configuration
 *
 * Demonstrates a sports betting platform with:
 * - Customer wallet lifecycle (deposit, available, pending, withdrawable)
 * - Platform float for payouts
 * - Wager placement and settlement
 * - Withdrawal flow
 */
export const sportsbetConfig: DemoConfig = {
  id: 'sportsbet',
  name: 'Sportsbet Wagering Flow',
  description:
    'Sports betting platform with customer wallets, deposit flows, wagering, and withdrawals',

  accounts: [
    {
      address: '@world',
      name: 'External World',
      description: 'Money entering/leaving the system',
      color: 'slate',
    },
    {
      address: '@platform:float',
      name: 'Platform Float',
      description: 'House bankroll for paying out winnings',
      color: 'amber',
    },
    {
      address: '@customers:{CUSTOMER_ID}:deposits:pending',
      name: 'Pending Deposits',
      description: 'Funds awaiting payment confirmation',
      color: 'orange',
    },
    {
      address: '@customers:{CUSTOMER_ID}:available',
      name: 'Available Balance',
      description: 'Funds available for wagering',
      color: 'green',
    },
    {
      address: '@customers:{CUSTOMER_ID}:pending:wager',
      name: 'Pending Wagers',
      description: 'Funds locked in active bets',
      color: 'blue',
    },
    {
      address: '@customers:{CUSTOMER_ID}:withdrawable',
      name: 'Withdrawable Balance',
      description: 'Funds ready for withdrawal',
      color: 'purple',
    },
    {
      address: '@banks:chase:withdrawal',
      name: 'Bank Withdrawal',
      description: 'Outgoing bank transfers',
      color: 'gray',
    },
  ],

  variables: {
    CUSTOMER_ID: 'cust-12345',
    DEPOSIT_AMOUNT: '10000', // $100.00
    WAGER_AMOUNT: '2500', // $25.00
    WINNINGS_AMOUNT: '5000', // $50.00 (stake + profit)
    WITHDRAWAL_AMOUNT: '7500', // $75.00
    WAGER_ID: 'wager-001',
    EVENT: 'Lakers vs Celtics',
    ODDS: '2.0',
  },

  transactionSteps: [
    {
      txType: 'SEED_FLOAT',
      label: 'Seed Platform Float',
      description: 'Initialize house bankroll for paying out winnings',
      numscript: `send [USD/2 100000000] (
  source = @world
  destination = @platform:float
)

set_tx_meta("type", "SEED_FLOAT")`,
      queries: [
        {
          title: 'Platform Float Balance',
          description: 'House bankroll available for payouts',
          queryType: 'balance',
          addressFilter: 'platform:float',
        },
      ],
    },
    {
      txType: 'DEPOSIT_INITIATED',
      label: 'Deposit Initiated',
      description: 'Customer initiates a $100 deposit - funds are pending confirmation',
      numscript: `send [USD/2 {DEPOSIT_AMOUNT}] (
  source = @world
  destination = @customers:{CUSTOMER_ID}:deposits:pending
)

set_tx_meta("type", "DEPOSIT_INITIATED")
set_tx_meta("customer_id", "{CUSTOMER_ID}")`,
      queries: [
        {
          title: 'Pending Deposit',
          description: 'Funds awaiting payment confirmation',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_ID}:deposits:pending',
        },
      ],
    },
    {
      txType: 'DEPOSIT_CONFIRMED',
      label: 'Deposit Confirmed',
      description: 'Payment confirmed - funds move to available balance',
      numscript: `send [USD/2 {DEPOSIT_AMOUNT}] (
  source = @customers:{CUSTOMER_ID}:deposits:pending
  destination = @customers:{CUSTOMER_ID}:available
)

set_tx_meta("type", "DEPOSIT_CONFIRMED")
set_tx_meta("customer_id", "{CUSTOMER_ID}")`,
      queries: [
        {
          title: 'Available Balance',
          description: 'Funds now available for wagering',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_ID}:available',
        },
        {
          title: 'Customer Total Value',
          description: 'All funds across customer accounts',
          queryType: 'balance',
          addressFilters: [
            'customers:{CUSTOMER_ID}:available',
            'customers:{CUSTOMER_ID}:pending:wager',
            'customers:{CUSTOMER_ID}:withdrawable',
          ],
        },
      ],
    },
    {
      txType: 'WAGER_PLACED',
      label: 'Place Wager',
      description: 'Customer places a $25 bet - funds locked in pending wager',
      numscript: `send [USD/2 {WAGER_AMOUNT}] (
  source = @customers:{CUSTOMER_ID}:available
  destination = @customers:{CUSTOMER_ID}:pending:wager
)

set_tx_meta("type", "WAGER_PLACED")
set_tx_meta("customer_id", "{CUSTOMER_ID}")
set_tx_meta("wager_id", "{WAGER_ID}")
set_tx_meta("event", "{EVENT}")
set_tx_meta("odds", "{ODDS}")`,
      queries: [
        {
          title: 'Locked in Wager',
          description: 'Funds locked while bet is active',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_ID}:pending:wager',
        },
        {
          title: 'Remaining Available',
          description: 'Balance still available for betting',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_ID}:available',
        },
      ],
    },
    {
      txType: 'WAGER_WON',
      label: 'Wager Won',
      description: 'Customer wins! Stake returned + winnings from platform float',
      numscript: `send [USD/2 {WAGER_AMOUNT}] (
  source = @customers:{CUSTOMER_ID}:pending:wager
  destination = @customers:{CUSTOMER_ID}:available
)

send [USD/2 {WAGER_AMOUNT}] (
  source = @platform:float
  destination = @customers:{CUSTOMER_ID}:available
)

set_tx_meta("type", "WAGER_WON")
set_tx_meta("customer_id", "{CUSTOMER_ID}")
set_tx_meta("wager_id", "{WAGER_ID}")
set_tx_meta("winnings", "{WINNINGS_AMOUNT}")`,
      queries: [
        {
          title: 'Updated Balance',
          description: 'Balance after winning (stake + winnings)',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_ID}:available',
        },
        {
          title: 'Platform Float After Payout',
          description: 'Remaining house bankroll',
          queryType: 'balance',
          addressFilter: 'platform:float',
        },
      ],
    },
    {
      txType: 'WITHDRAWAL_INITIATED',
      label: 'Withdrawal Initiated',
      description: 'Customer requests withdrawal - funds move to withdrawable',
      numscript: `send [USD/2 {WITHDRAWAL_AMOUNT}] (
  source = @customers:{CUSTOMER_ID}:available
  destination = @customers:{CUSTOMER_ID}:withdrawable
)

set_tx_meta("type", "WITHDRAWAL_INITIATED")
set_tx_meta("customer_id", "{CUSTOMER_ID}")`,
      queries: [
        {
          title: 'Withdrawable Balance',
          description: 'Funds ready for withdrawal',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_ID}:withdrawable',
        },
      ],
    },
    {
      txType: 'WITHDRAWAL_SETTLED',
      label: 'Withdrawal Settled',
      description: 'Funds sent to customer bank account',
      numscript: `send [USD/2 {WITHDRAWAL_AMOUNT}] (
  source = @customers:{CUSTOMER_ID}:withdrawable
  destination = @banks:chase:withdrawal
)

set_tx_meta("type", "WITHDRAWAL_SETTLED")
set_tx_meta("customer_id", "{CUSTOMER_ID}")`,
      queries: [
        {
          title: 'Final Customer Balance',
          description: 'Remaining funds in all accounts',
          queryType: 'balance',
          addressFilters: [
            'customers:{CUSTOMER_ID}:available',
            'customers:{CUSTOMER_ID}:pending:wager',
            'customers:{CUSTOMER_ID}:withdrawable',
          ],
        },
      ],
    },
  ],

  usefulQueries: [
    {
      title: 'Customer Total Value',
      description: 'All funds across this customer\'s accounts',
      queryType: 'balance',
      addressFilters: [
        'customers:{CUSTOMER_ID}:available',
        'customers:{CUSTOMER_ID}:deposits:pending',
        'customers:{CUSTOMER_ID}:pending:wager',
        'customers:{CUSTOMER_ID}:withdrawable',
      ],
    },
    {
      title: 'Total Customer Liabilities',
      description: 'Platform-wide: all funds held for ALL customers',
      queryType: 'balance',
      addressFilter: 'customers:',
    },
    {
      title: 'All Locked Wagers',
      description: 'Platform-wide: funds locked in active bets',
      queryType: 'balance',
      addressFilter: 'customers::pending:wager',
    },
    {
      title: 'Customer Journey',
      description: 'All transactions for this customer (using metadata)',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { customer_id: '{CUSTOMER_ID}' },
      },
    },
    {
      title: 'All Winning Wagers',
      description: 'Filter by transaction type',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { type: 'WAGER_WON' },
      },
    },
    {
      title: 'Customer Accounts',
      description: 'List all accounts for this customer',
      queryType: 'accounts',
      accountAddress: 'customers:{CUSTOMER_ID}:',
    },
  ],
};
