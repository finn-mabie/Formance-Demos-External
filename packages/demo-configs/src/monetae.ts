import { DemoConfig } from './types';

/**
 * Monetae Demo Configuration
 *
 * Demonstrates fiat custody + wealth tech:
 * - Client onboarding with KYC
 * - Multi-currency deposits (USD, EUR)
 * - Investment allocations
 * - Fee collection (management + performance)
 * - Dividend distribution
 */
export const monetaeConfig: DemoConfig = {
  id: 'monetae',
  name: 'Fiat Custody + Wealth Management',
  description:
    'Wealth tech platform with multi-currency custody, investment allocations, and fee management',

  accounts: [
    {
      address: '@world',
      name: 'External World',
      description: 'Money entering/leaving the system',
      color: 'slate',
    },
    {
      address: '@clients:{CLIENT_ID}:cash:usd',
      name: 'Client USD Cash',
      description: 'Client\'s USD cash holdings',
      color: 'green',
    },
    {
      address: '@clients:{CLIENT_ID}:cash:eur',
      name: 'Client EUR Cash',
      description: 'Client\'s EUR cash holdings',
      color: 'blue',
    },
    {
      address: '@clients:{CLIENT_ID}:investments:equity',
      name: 'Client Equity Investments',
      description: 'Allocated to equity fund',
      color: 'purple',
    },
    {
      address: '@clients:{CLIENT_ID}:investments:bonds',
      name: 'Client Bond Investments',
      description: 'Allocated to bond fund',
      color: 'indigo',
    },
    {
      address: '@platform:fees:management',
      name: 'Management Fees',
      description: 'AUM-based management fees collected',
      color: 'amber',
    },
    {
      address: '@platform:fees:performance',
      name: 'Performance Fees',
      description: 'Performance-based fees collected',
      color: 'orange',
    },
    {
      address: '@omnibus:custody:usd',
      name: 'USD Omnibus Account',
      description: 'Pooled custody for all client USD',
      color: 'teal',
    },
  ],

  variables: {
    CLIENT_ID: 'acme-corp',
    USD_DEPOSIT: '50000000', // $500,000
    EUR_DEPOSIT: '25000000', // €250,000
    EQUITY_ALLOCATION: '30000000', // $300,000 to equity
    BOND_ALLOCATION: '20000000', // $200,000 to bonds
    MGMT_FEE: '125000', // $1,250 (0.25% quarterly)
    PERF_FEE: '500000', // $5,000 (20% of $25k gain)
    DIVIDEND: '1000000', // $10,000 dividend
  },

  transactionSteps: [
    {
      txType: 'CLIENT_DEPOSIT_USD',
      label: 'USD Deposit',
      description: 'Client deposits $500,000 USD into custody',
      numscript: `send [USD/2 {USD_DEPOSIT}] (
  source = @world
  destination = @clients:{CLIENT_ID}:cash:usd
)

set_tx_meta("type", "CLIENT_DEPOSIT")
set_tx_meta("client", "{CLIENT_ID}")
set_tx_meta("currency", "USD")`,
      queries: [
        {
          title: 'Client USD Balance',
          description: 'Cash available for investment',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:cash:usd',
        },
      ],
    },
    {
      txType: 'CLIENT_DEPOSIT_EUR',
      label: 'EUR Deposit',
      description: 'Client deposits €250,000 EUR into custody',
      numscript: `send [EUR/2 {EUR_DEPOSIT}] (
  source = @world
  destination = @clients:{CLIENT_ID}:cash:eur
)

set_tx_meta("type", "CLIENT_DEPOSIT")
set_tx_meta("client", "{CLIENT_ID}")
set_tx_meta("currency", "EUR")`,
      queries: [
        {
          title: 'Client EUR Balance',
          description: 'EUR cash holdings',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:cash:eur',
        },
        {
          title: 'Total Client Cash',
          description: 'All cash holdings (multi-currency)',
          queryType: 'balance',
          addressFilters: [
            'clients:{CLIENT_ID}:cash:usd',
            'clients:{CLIENT_ID}:cash:eur',
          ],
        },
      ],
    },
    {
      txType: 'EQUITY_ALLOCATION',
      label: 'Equity Fund Allocation',
      description: 'Allocate $300,000 to equity fund',
      numscript: `send [USD/2 {EQUITY_ALLOCATION}] (
  source = @clients:{CLIENT_ID}:cash:usd
  destination = @clients:{CLIENT_ID}:investments:equity
)

set_tx_meta("type", "INVESTMENT_ALLOCATION")
set_tx_meta("client", "{CLIENT_ID}")
set_tx_meta("fund", "equity")
set_tx_meta("strategy", "growth")`,
      queries: [
        {
          title: 'Equity Investment Balance',
          description: 'Allocated to equity fund',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:investments:equity',
        },
        {
          title: 'Remaining Cash',
          description: 'Available for further allocation',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:cash:usd',
        },
      ],
    },
    {
      txType: 'BOND_ALLOCATION',
      label: 'Bond Fund Allocation',
      description: 'Allocate $200,000 to bond fund',
      numscript: `send [USD/2 {BOND_ALLOCATION}] (
  source = @clients:{CLIENT_ID}:cash:usd
  destination = @clients:{CLIENT_ID}:investments:bonds
)

set_tx_meta("type", "INVESTMENT_ALLOCATION")
set_tx_meta("client", "{CLIENT_ID}")
set_tx_meta("fund", "bonds")
set_tx_meta("strategy", "income")`,
      queries: [
        {
          title: 'Bond Investment Balance',
          description: 'Allocated to bond fund',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:investments:bonds',
        },
        {
          title: 'Total Investments',
          description: 'All investment allocations',
          queryType: 'balance',
          addressFilters: [
            'clients:{CLIENT_ID}:investments:equity',
            'clients:{CLIENT_ID}:investments:bonds',
          ],
        },
      ],
    },
    {
      txType: 'MANAGEMENT_FEE',
      label: 'Quarterly Management Fee',
      description: 'Collect 0.25% quarterly management fee ($1,250)',
      numscript: `send [USD/2 {MGMT_FEE}] (
  source = @clients:{CLIENT_ID}:cash:usd
  destination = @platform:fees:management
)

set_tx_meta("type", "MANAGEMENT_FEE")
set_tx_meta("client", "{CLIENT_ID}")
set_tx_meta("period", "Q1-2024")
set_tx_meta("rate", "0.25%")`,
      queries: [
        {
          title: 'Management Fees Collected',
          description: 'Total AUM-based fees',
          queryType: 'balance',
          addressFilter: 'platform:fees:management',
        },
      ],
    },
    {
      txType: 'PERFORMANCE_FEE',
      label: 'Performance Fee',
      description: 'Collect 20% performance fee on gains ($5,000)',
      numscript: `send [USD/2 {PERF_FEE}] (
  source = @clients:{CLIENT_ID}:investments:equity
  destination = @platform:fees:performance
)

set_tx_meta("type", "PERFORMANCE_FEE")
set_tx_meta("client", "{CLIENT_ID}")
set_tx_meta("rate", "20%")
set_tx_meta("gain_amount", "2500000")`,
      queries: [
        {
          title: 'Performance Fees Collected',
          description: 'Total performance-based fees',
          queryType: 'balance',
          addressFilter: 'platform:fees:performance',
        },
        {
          title: 'Total Platform Revenue',
          description: 'All fees collected',
          queryType: 'balance',
          addressFilters: [
            'platform:fees:management',
            'platform:fees:performance',
          ],
        },
      ],
    },
    {
      txType: 'DIVIDEND_DISTRIBUTION',
      label: 'Dividend Distribution',
      description: 'Distribute $10,000 equity dividend to client cash',
      numscript: `send [USD/2 {DIVIDEND}] (
  source = @world
  destination = @clients:{CLIENT_ID}:cash:usd
)

set_tx_meta("type", "DIVIDEND_DISTRIBUTION")
set_tx_meta("client", "{CLIENT_ID}")
set_tx_meta("source_fund", "equity")`,
      queries: [
        {
          title: 'Updated Cash Balance',
          description: 'Cash after dividend',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:cash:usd',
        },
      ],
    },
  ],

  usefulQueries: [
    {
      title: 'Client Portfolio Summary',
      description: 'All client assets (cash + investments)',
      queryType: 'balance',
      addressFilters: [
        'clients:{CLIENT_ID}:cash:usd',
        'clients:{CLIENT_ID}:cash:eur',
        'clients:{CLIENT_ID}:investments:equity',
        'clients:{CLIENT_ID}:investments:bonds',
      ],
    },
    {
      title: 'All Client Accounts',
      description: 'List all accounts for this client',
      queryType: 'accounts',
      accountAddress: 'clients:{CLIENT_ID}:',
    },
    {
      title: 'Client Transaction History',
      description: 'All movements for this client',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { client: '{CLIENT_ID}' },
      },
    },
    {
      title: 'All Investment Allocations',
      description: 'Filter by transaction type',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { type: 'INVESTMENT_ALLOCATION' },
      },
    },
    {
      title: 'Platform Total AUM',
      description: 'All client funds under management',
      queryType: 'balance',
      addressFilter: 'clients:',
    },
    {
      title: 'All Fee Collections',
      description: 'Management + performance fees',
      queryType: 'balance',
      addressFilter: 'platform:fees:',
    },
  ],
};
