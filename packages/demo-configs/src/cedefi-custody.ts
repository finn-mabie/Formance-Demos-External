import { DemoConfig } from './types';

/**
 * CeDeFi Custody with Yield Demo Configuration
 *
 * Inspired by Zodia custody patterns and CeDeFi playbook:
 * - Multi-manager fund structure with trader sub-accounts
 * - Pending → Available deposit flow (block confirmations)
 * - Protocol deployment (idle → staked)
 * - Yield harvesting and pro-rata distribution
 * - Staking with atomic platform fees
 * - Exchange allocation for trading
 *
 * Reference: https://www.formance.com/blog/financial-operations/the-cedefi-ledger-playbook
 */
export const cedefiCustodyConfig: DemoConfig = {
  id: 'cedefi-custody',
  name: 'CeDeFi Custody & Yield',
  description:
    'Institutional crypto custody with DeFi yield deployment, staking, and pro-rata rewards distribution',

  accounts: [
    {
      address: '@world',
      name: 'External World',
      description: 'On-chain deposits and withdrawals',
      color: 'slate',
    },
    // Fund master account
    {
      address: '@clients:{FUND_NAME}:master',
      name: 'Fund Master',
      description: 'Genesis Capital master custody account',
      color: 'blue',
    },
    // Trader accounts - Ben
    {
      address: '@clients:{FUND_NAME}:trader:{TRADER_NAME}:pending',
      name: 'Trader Pending',
      description: 'Deposits awaiting block confirmations',
      color: 'orange',
    },
    {
      address: '@clients:{FUND_NAME}:trader:{TRADER_NAME}:idle',
      name: 'Trader Idle',
      description: 'Confirmed funds available for deployment or withdrawal',
      color: 'sky',
    },
    {
      address: '@clients:{FUND_NAME}:trader:{TRADER_NAME}:staked:{PROTOCOL}',
      name: 'Trader Staked (Aave)',
      description: 'Funds deployed to Aave protocol',
      color: 'purple',
    },
    {
      address: '@clients:{FUND_NAME}:trader:{TRADER_NAME}:allocated:{EXCHANGE}',
      name: 'Trader Exchange Allocation',
      description: 'Funds reserved for Deribit trading',
      color: 'indigo',
    },
    // Platform accounts
    {
      address: '@platform:omnibus:{PROTOCOL}',
      name: 'Omnibus Pool (Aave)',
      description: 'Total funds deployed to protocol across all users',
      color: 'violet',
    },
    {
      address: '@platform:omnibus:yield',
      name: 'Yield Pool',
      description: 'Accumulated rewards awaiting distribution',
      color: 'emerald',
    },
    {
      address: '@platform:fees',
      name: 'Platform Fees',
      description: 'Custody and staking fees',
      color: 'green',
    },
    {
      address: '@platform:gas',
      name: 'Gas Pool',
      description: 'On-chain transaction costs',
      color: 'amber',
    },
  ],

  variables: {
    FUND_NAME: 'genesis',
    TRADER_NAME: 'ben',
    PROTOCOL: 'aave',
    EXCHANGE: 'deribit',
  },

  transactionSteps: [
    {
      txType: 'ETH_DEPOSIT',
      label: 'Trader Deposits ETH',
      description:
        'Trader Ben deposits 10 ETH into Genesis Capital custody - awaiting 12 block confirmations',
      numscript: `send [ETH/18 10000000000000000000] (
  source = @world
  destination = @clients:{FUND_NAME}:trader:{TRADER_NAME}:pending
)

set_tx_meta("type", "DEPOSIT")
set_tx_meta("asset", "ETH")
set_tx_meta("trader", "{TRADER_NAME}")
set_tx_meta("fund", "{FUND_NAME}")
set_tx_meta("chain_tx", "0x8a3f...e721")
set_tx_meta("confirmations_required", "12")`,
      queries: [
        {
          title: 'Pending Deposits',
          description: 'ETH awaiting block confirmations',
          queryType: 'balance',
          addressFilter: 'clients:{FUND_NAME}:trader:{TRADER_NAME}:pending',
        },
        {
          title: 'Trader Journey',
          description: 'All transactions for this trader',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { trader: '{TRADER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'USDC_DEPOSIT',
      label: 'Trader Deposits USDC',
      description: 'Trader Ben deposits 50,000 USDC - separate transaction from ETH',
      numscript: `send [USDC/6 50000000000] (
  source = @world
  destination = @clients:{FUND_NAME}:trader:{TRADER_NAME}:pending
)

set_tx_meta("type", "DEPOSIT")
set_tx_meta("asset", "USDC")
set_tx_meta("trader", "{TRADER_NAME}")
set_tx_meta("fund", "{FUND_NAME}")
set_tx_meta("chain_tx", "0x7b2e...f943")`,
      queries: [
        {
          title: 'All Pending Deposits',
          description: 'ETH + USDC awaiting confirmations',
          queryType: 'balance',
          addressFilter: 'clients:{FUND_NAME}:trader:{TRADER_NAME}:pending',
        },
        {
          title: 'Trader Journey',
          description: 'All transactions for this trader',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { trader: '{TRADER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'DEPOSITS_CONFIRMED',
      label: 'Deposits Confirmed',
      description: 'Block confirmations received - funds now available for deployment',
      numscript: `send [ETH/18 10000000000000000000] (
  source = @clients:{FUND_NAME}:trader:{TRADER_NAME}:pending
  destination = @clients:{FUND_NAME}:trader:{TRADER_NAME}:idle
)

send [USDC/6 50000000000] (
  source = @clients:{FUND_NAME}:trader:{TRADER_NAME}:pending
  destination = @clients:{FUND_NAME}:trader:{TRADER_NAME}:idle
)

set_tx_meta("type", "RISK_CLEARANCE")
set_tx_meta("trader", "{TRADER_NAME}")
set_tx_meta("status", "CONFIRMED")`,
      queries: [
        {
          title: 'Available Balance',
          description: 'Funds ready for deployment or withdrawal',
          queryType: 'balance',
          addressFilter: 'clients:{FUND_NAME}:trader:{TRADER_NAME}:idle',
        },
        {
          title: 'Trader Journey',
          description: 'All transactions for this trader',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { trader: '{TRADER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'DEPLOY_TO_AAVE',
      label: 'Deploy USDC to Aave',
      description:
        'Deploy 40,000 USDC to Aave lending protocol for yield - platform takes 1% deployment fee',
      numscript: `send [USDC/6 40000000000] (
  source = @clients:{FUND_NAME}:trader:{TRADER_NAME}:idle
  destination = @clients:{FUND_NAME}:trader:{TRADER_NAME}:staked:{PROTOCOL}
)

send [USDC/6 400000000] (
  source = @clients:{FUND_NAME}:trader:{TRADER_NAME}:idle
  destination = @platform:fees
)

set_tx_meta("type", "PROTOCOL_DEPLOY")
set_tx_meta("protocol", "{PROTOCOL}")
set_tx_meta("trader", "{TRADER_NAME}")
set_tx_meta("amount", "40000")
set_tx_meta("fee_pct", "1")`,
      queries: [
        {
          title: 'Staked in Aave',
          description: "Ben's funds deployed to protocol",
          queryType: 'balance',
          addressFilter: 'clients:{FUND_NAME}:trader:{TRADER_NAME}:staked:{PROTOCOL}',
        },
        {
          title: 'Platform Fees',
          description: 'Deployment fees collected',
          queryType: 'balance',
          addressFilter: 'platform:fees',
        },
        {
          title: 'Trader Journey',
          description: 'All transactions for this trader',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { trader: '{TRADER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'ALLOCATE_EXCHANGE',
      label: 'Allocate ETH to Deribit',
      description: 'Reserve 5 ETH for trading on Deribit - instant internal allocation',
      numscript: `send [ETH/18 5000000000000000000] (
  source = @clients:{FUND_NAME}:trader:{TRADER_NAME}:idle
  destination = @clients:{FUND_NAME}:trader:{TRADER_NAME}:allocated:{EXCHANGE}
)

set_tx_meta("type", "EXCHANGE_ALLOCATION")
set_tx_meta("exchange", "{EXCHANGE}")
set_tx_meta("trader", "{TRADER_NAME}")
set_tx_meta("amount", "5 ETH")`,
      queries: [
        {
          title: 'Exchange Allocation',
          description: 'Funds reserved for Deribit trading',
          queryType: 'balance',
          addressFilter: 'clients:{FUND_NAME}:trader:{TRADER_NAME}:allocated:{EXCHANGE}',
        },
        {
          title: 'Remaining Idle',
          description: 'Undeployed funds',
          queryType: 'balance',
          addressFilter: 'clients:{FUND_NAME}:trader:{TRADER_NAME}:idle',
        },
        {
          title: 'Trader Journey',
          description: 'All transactions for this trader',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { trader: '{TRADER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'YIELD_HARVEST',
      label: 'Harvest Aave Yield',
      description:
        'State observer detects $500 USDC yield on-chain - capture into omnibus yield pool',
      numscript: `send [USDC/6 500000000] (
  source = @world
  destination = @platform:omnibus:yield
)

set_tx_meta("type", "YIELD_HARVEST")
set_tx_meta("protocol", "{PROTOCOL}")
set_tx_meta("yield_usd", "500")
set_tx_meta("source", "aave_lending_apr")`,
      queries: [
        {
          title: 'Yield Pool',
          description: 'Accumulated rewards awaiting distribution',
          queryType: 'balance',
          addressFilter: 'platform:omnibus:yield',
        },
      ],
    },
    {
      txType: 'YIELD_DISTRIBUTE',
      label: 'Distribute Yield to Trader',
      description:
        'Pro-rata distribution: Ben owns 100% of pool, receives $500 minus 20% platform fee',
      numscript: `send [USDC/6 400000000] (
  source = @platform:omnibus:yield
  destination = @clients:{FUND_NAME}:trader:{TRADER_NAME}:staked:{PROTOCOL}
)

send [USDC/6 100000000] (
  source = @platform:omnibus:yield
  destination = @platform:fees
)

set_tx_meta("type", "YIELD_DISTRIBUTE")
set_tx_meta("trader", "{TRADER_NAME}")
set_tx_meta("gross_yield", "500")
set_tx_meta("net_yield", "400")
set_tx_meta("fee_pct", "20")`,
      queries: [
        {
          title: 'Updated Staked Balance',
          description: "Ben's staked balance with yield",
          queryType: 'balance',
          addressFilter: 'clients:{FUND_NAME}:trader:{TRADER_NAME}:staked:{PROTOCOL}',
        },
        {
          title: 'Total Platform Revenue',
          description: 'All fees collected',
          queryType: 'balance',
          addressFilter: 'platform:fees',
        },
        {
          title: 'Trader Journey',
          description: 'All transactions for this trader',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { trader: '{TRADER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'WITHDRAW_FROM_PROTOCOL',
      label: 'Withdraw from Aave',
      description: 'Trader withdraws 20,000 USDC from Aave back to idle - gas fee charged',
      numscript: `send [USDC/6 20000000000] (
  source = @clients:{FUND_NAME}:trader:{TRADER_NAME}:staked:{PROTOCOL}
  destination = @clients:{FUND_NAME}:trader:{TRADER_NAME}:idle
)

send [ETH/18 5000000000000000] (
  source = @clients:{FUND_NAME}:trader:{TRADER_NAME}:idle
  destination = @platform:gas
)

set_tx_meta("type", "PROTOCOL_WITHDRAW")
set_tx_meta("protocol", "{PROTOCOL}")
set_tx_meta("trader", "{TRADER_NAME}")
set_tx_meta("amount", "20000 USDC")
set_tx_meta("gas_eth", "0.005")`,
      queries: [
        {
          title: 'Trader Portfolio',
          description: 'All positions for Ben',
          queryType: 'balance',
          addressFilter: 'clients:{FUND_NAME}:trader:{TRADER_NAME}:',
        },
        {
          title: 'Gas Costs',
          description: 'Total gas spent',
          queryType: 'balance',
          addressFilter: 'platform:gas',
        },
        {
          title: 'Trader Journey',
          description: 'All transactions for this trader',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { trader: '{TRADER_NAME}' },
          },
        },
      ],
    },
  ],

  usefulQueries: [
    {
      title: 'Trader Full Portfolio',
      description: 'All positions: idle, staked, allocated',
      queryType: 'balance',
      addressFilter: 'clients:{FUND_NAME}:trader:{TRADER_NAME}:',
    },
    {
      title: 'Total Staked in Aave',
      description: 'All funds deployed to Aave across traders',
      queryType: 'balance',
      addressFilter: 'clients::staked:aave',
    },
    {
      title: 'Platform Revenue',
      description: 'Fees + yield share',
      queryType: 'balance',
      addressFilter: 'platform:fees',
    },
    {
      title: 'All Fund Balances',
      description: 'Complete Genesis Capital holdings',
      queryType: 'balance',
      addressFilter: 'clients:{FUND_NAME}:',
    },
    {
      title: 'Yield Distribution History',
      description: 'All yield payouts',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { type: 'YIELD_DISTRIBUTE' },
      },
    },
  ],
};
