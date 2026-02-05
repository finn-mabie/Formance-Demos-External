import { DemoConfig } from './types';

/**
 * Stablecoin Issuance Demo Configuration
 *
 * Inspired by Bastion, Bridge, and enterprise stablecoin platforms:
 * - Mint flow: Fiat deposit → Reserve → Mint tokens
 * - Burn/Redemption: Tokens → Burn → Fiat release
 * - Reserve management with Treasury securities
 * - Yield capture from reserves (T-bills, RRP)
 * - Yield distribution to token holders (optional)
 * - Full reserve backing with audit trail
 *
 * References:
 * - https://www.bastion.com/
 * - https://www.moderntreasury.com/learn/what-is-stablecoin-mint-and-burn
 */
export const stablecoinIssuanceConfig: DemoConfig = {
  id: 'stablecoin-issuance',
  name: 'Stablecoin Issuance',
  description:
    'White-label stablecoin platform with mint/burn flows, reserve management, and yield distribution',

  accounts: [
    {
      address: '@world',
      name: 'External World',
      description: 'Fiat rails (banks) and blockchain (on-chain tokens)',
      color: 'slate',
    },
    // Customer accounts
    {
      address: '@customers:{CUSTOMER_NAME}:fiat:pending',
      name: 'Customer Fiat Pending',
      description: 'Wire in transit - awaiting settlement',
      color: 'orange',
    },
    {
      address: '@customers:{CUSTOMER_NAME}:fiat:available',
      name: 'Customer Fiat Available',
      description: 'Settled USD ready for minting',
      color: 'blue',
    },
    {
      address: '@customers:{CUSTOMER_NAME}:tokens',
      name: 'Customer Token Balance',
      description: 'AUSD stablecoin holdings',
      color: 'purple',
    },
    // Issuer reserve accounts
    {
      address: '@issuer:reserve:cash',
      name: 'Reserve - Cash',
      description: 'USD held at custodian bank',
      color: 'green',
    },
    {
      address: '@issuer:reserve:tbills',
      name: 'Reserve - T-Bills',
      description: 'Short-duration Treasury securities',
      color: 'emerald',
    },
    {
      address: '@issuer:reserve:rrp',
      name: 'Reserve - Overnight RRP',
      description: 'Fed reverse repo agreements',
      color: 'teal',
    },
    // Token supply tracking
    {
      address: '@issuer:tokens:circulating',
      name: 'Circulating Supply',
      description: 'Total AUSD tokens in circulation',
      color: 'violet',
    },
    // Yield and revenue
    {
      address: '@issuer:yield:accrued',
      name: 'Accrued Yield',
      description: 'Interest earned from reserves',
      color: 'amber',
    },
    {
      address: '@platform:revenue',
      name: 'Platform Revenue',
      description: 'Platform fees and yield share',
      color: 'green',
    },
    // Exchange for conversions
    {
      address: '@exchanges:{MINT_ID}',
      name: 'Mint/Burn Exchange',
      description: 'Tracks individual mint/burn operations',
      color: 'slate',
    },
  ],

  variables: {
    CUSTOMER_NAME: 'acme',
    MINT_ID: 'mint:001',
    BURN_ID: 'burn:001',
    STABLECOIN: 'AUSD',
  },

  transactionSteps: [
    {
      txType: 'WIRE_RECEIVED',
      label: 'Customer Wires USD',
      description: 'Acme Corp initiates $1M wire - enters pending state until bank settles',
      numscript: `send [USD/2 100000000] (
  source = @world
  destination = @customers:{CUSTOMER_NAME}:fiat:pending
)

set_tx_meta("type", "WIRE_RECEIVED")
set_tx_meta("customer", "{CUSTOMER_NAME}")
set_tx_meta("amount", "1000000")
set_tx_meta("bank_ref", "FED-2024-001")
set_tx_meta("status", "PENDING")`,
      queries: [
        {
          title: 'Pending Wires',
          description: 'USD awaiting bank settlement',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_NAME}:fiat:pending',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this customer',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { customer: '{CUSTOMER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'WIRE_SETTLED',
      label: 'Wire Settles',
      description: 'Bank confirms receipt - funds available for minting',
      numscript: `send [USD/2 100000000] (
  source = @customers:{CUSTOMER_NAME}:fiat:pending
  destination = @customers:{CUSTOMER_NAME}:fiat:available
)

set_tx_meta("type", "WIRE_SETTLED")
set_tx_meta("customer", "{CUSTOMER_NAME}")
set_tx_meta("status", "SETTLED")`,
      queries: [
        {
          title: 'Available for Minting',
          description: 'Settled USD ready to mint',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_NAME}:fiat:available',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this customer',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { customer: '{CUSTOMER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'MINT_TOKENS',
      label: 'Mint AUSD Tokens',
      description:
        'Customer mints ~999K AUSD - 0.1% mint fee ($1,000) goes to platform',
      numscript: `send [USD/2 100000000] (
  source = @customers:{CUSTOMER_NAME}:fiat:available
  destination = @exchanges:{MINT_ID}
)

send [USD/2 99900000] (
  source = @exchanges:{MINT_ID}
  destination = @world
)

send [AUSD/6 999000000000] (
  source = @world
  destination = @exchanges:{MINT_ID}
)

send [AUSD/6 999000000000] (
  source = @exchanges:{MINT_ID}
  destination = @customers:{CUSTOMER_NAME}:tokens
)

send [USD/2 100000] (
  source = @exchanges:{MINT_ID}
  destination = @platform:revenue
)

send [USD/2 99900000] (
  source = @world
  destination = @issuer:reserve:cash
)

send [AUSD/6 999000000000] (
  source = @world
  destination = @issuer:tokens:circulating
)

set_account_meta(@exchanges:{MINT_ID}, "type", "MINT")
set_account_meta(@exchanges:{MINT_ID}, "rate", "0.999")
set_account_meta(@exchanges:{MINT_ID}, "usd_in", "1000000")
set_account_meta(@exchanges:{MINT_ID}, "ausd_out", "999000")
set_account_meta(@exchanges:{MINT_ID}, "fee", "1000")

set_tx_meta("type", "MINT")
set_tx_meta("customer", "{CUSTOMER_NAME}")
set_tx_meta("mint_id", "{MINT_ID}")
set_tx_meta("usd_amount", "1000000")
set_tx_meta("token_amount", "999000")
set_tx_meta("fee_amount", "1000")
set_tx_meta("fee_pct", "0.1")`,
      queries: [
        {
          title: 'Customer Token Balance',
          description: 'AUSD tokens minted',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_NAME}:tokens',
        },
        {
          title: 'Total Reserve',
          description: 'Cash backing tokens',
          queryType: 'balance',
          addressFilter: 'issuer:reserve:cash',
        },
        {
          title: 'Platform Revenue',
          description: 'Mint fee collected',
          queryType: 'balance',
          addressFilter: 'platform:revenue',
        },
        {
          title: 'Circulating Supply',
          description: 'Total AUSD in circulation',
          queryType: 'balance',
          addressFilter: 'issuer:tokens:circulating',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this customer',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { customer: '{CUSTOMER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'RESERVE_INVEST',
      label: 'Invest Reserve in T-Bills',
      description: 'Treasury team moves 80% of reserve into short-duration T-Bills for yield',
      numscript: `send [USD/2 80000000] (
  source = @issuer:reserve:cash
  destination = @issuer:reserve:tbills
)

set_tx_meta("type", "RESERVE_INVEST")
set_tx_meta("asset_class", "TBILLS")
set_tx_meta("amount", "800000")
set_tx_meta("maturity", "30D")
set_tx_meta("yield_estimate", "5.25%")`,
      queries: [
        {
          title: 'Reserve Composition',
          description: 'Cash + T-Bills breakdown',
          queryType: 'balance',
          addressFilter: 'issuer:reserve:',
        },
      ],
    },
    {
      txType: 'YIELD_ACCRUAL',
      label: 'Reserve Earns Yield',
      description: 'T-Bill interest accrual: $3,500 earned (5.25% APY on $800K for 30 days)',
      numscript: `send [USD/2 350000] (
  source = @world
  destination = @issuer:yield:accrued
)

set_tx_meta("type", "YIELD_ACCRUAL")
set_tx_meta("source", "TBILLS")
set_tx_meta("principal", "800000")
set_tx_meta("yield", "3500")
set_tx_meta("apy", "5.25%")
set_tx_meta("period", "30D")`,
      queries: [
        {
          title: 'Accrued Yield',
          description: 'Interest earned from reserves',
          queryType: 'balance',
          addressFilter: 'issuer:yield:accrued',
        },
      ],
    },
    {
      txType: 'YIELD_DISTRIBUTE',
      label: 'Distribute Yield',
      description: 'Share yield with token holders: 50% to customer, 50% retained by issuer',
      numscript: `send [USD/2 175000] (
  source = @issuer:yield:accrued
  destination = @customers:{CUSTOMER_NAME}:fiat:available
)

send [USD/2 175000] (
  source = @issuer:yield:accrued
  destination = @platform:revenue
)

set_tx_meta("type", "YIELD_DISTRIBUTE")
set_tx_meta("customer", "{CUSTOMER_NAME}")
set_tx_meta("customer_share", "1750")
set_tx_meta("issuer_share", "1750")
set_tx_meta("split", "50/50")`,
      queries: [
        {
          title: 'Customer Yield Received',
          description: 'USD yield credited to customer',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_NAME}:fiat:available',
        },
        {
          title: 'Platform Revenue',
          description: 'Platform revenue from yield',
          queryType: 'balance',
          addressFilter: 'platform:revenue',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this customer',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { customer: '{CUSTOMER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'REDEEM_TOKENS',
      label: 'Redeem AUSD for USD',
      description: 'Customer redeems 500K AUSD - 0.1% redemption fee ($500), receives $499,500',
      numscript: `send [AUSD/6 500000000000] (
  source = @customers:{CUSTOMER_NAME}:tokens
  destination = @exchanges:burn:001
)

send [AUSD/6 500000000000] (
  source = @exchanges:burn:001
  destination = @world
)

send [USD/2 50000000] (
  source = @world
  destination = @exchanges:burn:001
)

send [USD/2 49950000] (
  source = @exchanges:burn:001
  destination = @customers:{CUSTOMER_NAME}:fiat:available
)

send [USD/2 50000] (
  source = @exchanges:burn:001
  destination = @platform:revenue
)

set_account_meta(@exchanges:burn:001, "type", "BURN")
set_account_meta(@exchanges:burn:001, "rate", "0.999")
set_account_meta(@exchanges:burn:001, "ausd_in", "500000")
set_account_meta(@exchanges:burn:001, "usd_out", "499500")
set_account_meta(@exchanges:burn:001, "fee", "500")

set_tx_meta("type", "BURN")
set_tx_meta("customer", "{CUSTOMER_NAME}")
set_tx_meta("burn_id", "burn:001")
set_tx_meta("token_amount", "500000")
set_tx_meta("usd_amount", "499500")
set_tx_meta("fee_amount", "500")
set_tx_meta("fee_pct", "0.1")`,
      queries: [
        {
          title: 'Updated Token Balance',
          description: 'AUSD remaining after redemption',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_NAME}:tokens',
        },
        {
          title: 'Customer USD Available',
          description: 'USD ready for wire out',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_NAME}:fiat:available',
        },
        {
          title: 'Platform Revenue',
          description: 'Total fees collected',
          queryType: 'balance',
          addressFilter: 'platform:revenue',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this customer',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { customer: '{CUSTOMER_NAME}' },
          },
        },
      ],
    },
    {
      txType: 'WIRE_OUT',
      label: 'Wire USD to Customer',
      description: 'Customer withdraws $501,250 USD (redemption + yield) via wire transfer',
      numscript: `send [USD/2 50125000] (
  source = @customers:{CUSTOMER_NAME}:fiat:available
  destination = @world
)

set_tx_meta("type", "WIRE_OUT")
set_tx_meta("customer", "{CUSTOMER_NAME}")
set_tx_meta("amount", "501250")
set_tx_meta("bank", "JPMorgan")
set_tx_meta("account", "****4521")`,
      queries: [
        {
          title: 'Final Token Balance',
          description: 'Remaining AUSD holdings',
          queryType: 'balance',
          addressFilter: 'customers:{CUSTOMER_NAME}:tokens',
        },
        {
          title: 'Final Reserve Status',
          description: 'Reserve backing remaining tokens',
          queryType: 'balance',
          addressFilter: 'issuer:reserve:',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this customer',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { customer: '{CUSTOMER_NAME}' },
          },
        },
      ],
    },
  ],

  usefulQueries: [
    {
      title: 'Total Circulating Supply',
      description: 'All AUSD tokens in circulation',
      queryType: 'balance',
      addressFilter: 'issuer:tokens:circulating',
    },
    {
      title: 'Total Reserves',
      description: 'All reserve assets backing tokens',
      queryType: 'balance',
      addressFilter: 'issuer:reserve:',
    },
    {
      title: 'Reserve Ratio',
      description: 'Cash + T-Bills + RRP breakdown',
      queryType: 'accounts',
      accountAddress: 'issuer:reserve:',
    },
    {
      title: 'All Mint Operations',
      description: 'History of token minting',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { type: 'MINT' },
      },
    },
    {
      title: 'All Burn Operations',
      description: 'History of token redemptions',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { type: 'BURN' },
      },
    },
    {
      title: 'Platform Revenue',
      description: 'Total platform revenue',
      queryType: 'balance',
      addressFilter: 'platform:revenue',
    },
    {
      title: 'All Customer Balances',
      description: 'Fiat + token holdings',
      queryType: 'balance',
      addressFilter: 'customers:',
    },
  ],
};
