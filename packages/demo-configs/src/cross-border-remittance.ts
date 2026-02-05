import { DemoConfig } from './types';

/**
 * Cross-Border Remittance Demo Configuration
 *
 * Cross-border B2B remittance (Philippines → Brazil):
 * - USD received in Philippines
 * - Convert USD → USDT (with spread revenue)
 * - Intercompany USDT transfer to Brazil
 * - Convert USDT → BRL (OTC)
 * - Wire to Brazilian supplier
 *
 * 7 steps showing the complete remittance journey
 */
export const crossBorderRemittanceConfig: DemoConfig = {
  id: 'cross-border-remittance',
  name: 'Cross-Border Remittance',
  description:
    'B2B remittance from Philippines to Brazil using USDT rails with full intercompany tracking',

  accounts: [
    {
      address: '@world',
      name: 'External World',
      description: 'Money entering/leaving the system',
      color: 'slate',
    },
    {
      address: '@clients:{CLIENT_ID}:ph:bank',
      name: 'Client USD (Philippines)',
      description: 'USD held at Philippines bank for client',
      color: 'blue',
    },
    {
      address: '@clients:{CLIENT_ID}:ph:fireblocks',
      name: 'Client USDT (Philippines)',
      description: 'USDT held at Philippines Fireblocks',
      color: 'purple',
    },
    {
      address: '@clients:{CLIENT_ID}:br:fireblocks:pending',
      name: 'Client USDT Pending (Brazil)',
      description: 'USDT in transit to Brazil - pending settlement',
      color: 'orange',
    },
    {
      address: '@clients:{CLIENT_ID}:br:fireblocks',
      name: 'Client USDT (Brazil)',
      description: 'USDT settled at Brazil Fireblocks',
      color: 'purple',
    },
    {
      address: '@clients:{CLIENT_ID}:br:bank',
      name: 'Client BRL (Brazil)',
      description: 'BRL at Brazil bank for client',
      color: 'green',
    },
    {
      address: '@exchanges:{EXCHANGE_ID}',
      name: 'Exchange Account (PH)',
      description: 'USD→USDT conversion tracking',
      color: 'slate',
    },
    {
      address: '@exchanges:{EXCHANGE_ID}:br',
      name: 'Exchange Account (BR)',
      description: 'USDT→BRL conversion tracking',
      color: 'slate',
    },
    {
      address: '@platform:ph:revenue',
      name: 'Platform Revenue (Philippines)',
      description: 'Spread from USD→USDT conversion',
      color: 'green',
    },
    {
      address: '@platform:br:revenue',
      name: 'Platform Revenue (Brazil)',
      description: 'Wire fees collected',
      color: 'green',
    },
    {
      address: '@clients:{CLIENT_ID}:remittances:{REMITTANCE_ID}:pending',
      name: 'Pending Wire',
      description: 'BRL awaiting wire delivery',
      color: 'orange',
    },
  ],

  variables: {
    REMITTANCE_ID: 'rem:001',
    CLIENT_ID: 'manilamfg',
    EXCHANGE_ID: '001',
  },

  transactionSteps: [
    {
      txType: 'USD_RECEIVED',
      label: 'Client Sends USD',
      description: 'Manila Manufacturing sends $10,000 USD to Philippines bank account',
      numscript: `send [USD/2 1000000] (
  source = @world
  destination = @clients:{CLIENT_ID}:ph:bank
)

set_tx_meta("type", "USD_RECEIVED")
set_tx_meta("remittance_id", "{REMITTANCE_ID}")
set_tx_meta("client_id", "{CLIENT_ID}")
set_tx_meta("client_name", "Manila Manufacturing")
set_tx_meta("recipient", "Supplier ABC Ltda")
set_tx_meta("amount", "$10,000 USD")`,
      queries: [
        {
          title: 'Client Funds at PH Bank',
          description: 'USD received - tracked to specific client',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:ph:bank',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this remittance',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { remittance_id: '{REMITTANCE_ID}' },
          },
        },
      ],
    },
    {
      txType: 'USD_TO_USDT',
      label: 'Convert USD → USDT',
      description: 'Convert client USD to USDT at 0.998 rate, keeping $20 spread',
      numscript: `send [USD/2 1000000] (
  source = @clients:{CLIENT_ID}:ph:bank
  destination = @exchanges:{EXCHANGE_ID}
)

send [USD/2 998000] (
  source = @exchanges:{EXCHANGE_ID}
  destination = @world
)

send [USDT/6 9980000000] (
  source = @world
  destination = @exchanges:{EXCHANGE_ID}
)

send [USDT/6 9980000000] (
  source = @exchanges:{EXCHANGE_ID}
  destination = @clients:{CLIENT_ID}:ph:fireblocks
)

send [USD/2 2000] (
  source = @exchanges:{EXCHANGE_ID}
  destination = @platform:ph:revenue
)

set_account_meta(@exchanges:{EXCHANGE_ID}, "type", "USD_USDT")
set_account_meta(@exchanges:{EXCHANGE_ID}, "rate", "0.998")
set_account_meta(@exchanges:{EXCHANGE_ID}, "usd_in", "10000")
set_account_meta(@exchanges:{EXCHANGE_ID}, "usdt_out", "9980")
set_account_meta(@exchanges:{EXCHANGE_ID}, "spread", "20")

set_tx_meta("type", "USD_TO_USDT")
set_tx_meta("exchange_id", "{EXCHANGE_ID}")
set_tx_meta("remittance_id", "{REMITTANCE_ID}")
set_tx_meta("rate", "0.998")`,
      queries: [
        {
          title: 'Client USDT at Philippines',
          description: 'Client now has USDT in custody',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:ph:fireblocks',
        },
        {
          title: 'Philippines Revenue',
          description: 'Spread earned on conversion',
          queryType: 'balance',
          addressFilter: 'platform:ph:revenue',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this remittance',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { remittance_id: '{REMITTANCE_ID}' },
          },
        },
      ],
    },
    {
      txType: 'INTERCO_INITIATED',
      label: 'Send USDT to Brazil',
      description: 'Philippines sends client USDT to Brazil Fireblocks - enters pending state',
      numscript: `send [USDT/6 9980000000] (
  source = @clients:{CLIENT_ID}:ph:fireblocks
  destination = @world
)

send [USDT/6 9980000000] (
  source = @world
  destination = @clients:{CLIENT_ID}:br:fireblocks:pending
)

set_tx_meta("type", "INTERCO_INITIATED")
set_tx_meta("remittance_id", "{REMITTANCE_ID}")
set_tx_meta("client_id", "{CLIENT_ID}")
set_tx_meta("from_entity", "entity_ph")
set_tx_meta("to_entity", "entity_br")
set_tx_meta("status", "PENDING")`,
      queries: [
        {
          title: 'USDT Pending at Brazil',
          description: 'USDT in transit - not yet settled',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:br:fireblocks:pending',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this remittance',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { remittance_id: '{REMITTANCE_ID}' },
          },
        },
      ],
    },
    {
      txType: 'INTERCO_SETTLED',
      label: 'Brazil Settles Receipt',
      description: 'Brazil confirms USDT receipt - funds available for conversion',
      numscript: `send [USDT/6 9980000000] (
  source = @clients:{CLIENT_ID}:br:fireblocks:pending
  destination = @clients:{CLIENT_ID}:br:fireblocks
)

set_tx_meta("type", "INTERCO_SETTLED")
set_tx_meta("remittance_id", "{REMITTANCE_ID}")
set_tx_meta("client_id", "{CLIENT_ID}")
set_tx_meta("status", "SETTLED")`,
      queries: [
        {
          title: 'Client USDT at Brazil',
          description: 'USDT settled and ready for conversion',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:br:fireblocks',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this remittance',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { remittance_id: '{REMITTANCE_ID}' },
          },
        },
      ],
    },
    {
      txType: 'USDT_TO_BRL',
      label: 'Convert USDT → BRL',
      description: 'Sell client USDT via OTC at 5.45 BRL rate',
      numscript: `send [USDT/6 9980000000] (
  source = @clients:{CLIENT_ID}:br:fireblocks
  destination = @exchanges:{EXCHANGE_ID}:br
)

send [USDT/6 9980000000] (
  source = @exchanges:{EXCHANGE_ID}:br
  destination = @world
)

send [BRL/2 5439100] (
  source = @world
  destination = @exchanges:{EXCHANGE_ID}:br
)

send [BRL/2 5439100] (
  source = @exchanges:{EXCHANGE_ID}:br
  destination = @clients:{CLIENT_ID}:br:bank
)

set_account_meta(@exchanges:{EXCHANGE_ID}:br, "type", "USDT_BRL")
set_account_meta(@exchanges:{EXCHANGE_ID}:br, "rate", "5.45")
set_account_meta(@exchanges:{EXCHANGE_ID}:br, "usdt_in", "9980")
set_account_meta(@exchanges:{EXCHANGE_ID}:br, "brl_out", "54391")

set_tx_meta("type", "USDT_TO_BRL")
set_tx_meta("exchange_id", "{EXCHANGE_ID}:br")
set_tx_meta("remittance_id", "{REMITTANCE_ID}")
set_tx_meta("rate", "5.45")`,
      queries: [
        {
          title: 'Client BRL at Brazil',
          description: 'BRL ready for wire transfer',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:br:bank',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this remittance',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { remittance_id: '{REMITTANCE_ID}' },
          },
        },
      ],
    },
    {
      txType: 'WIRE_INITIATED',
      label: 'Wire to Recipient',
      description: 'Initiate BRL wire to Supplier ABC Ltda, R$150 fee deducted',
      numscript: `send [BRL/2 5424100] (
  source = @clients:{CLIENT_ID}:br:bank
  destination = @clients:{CLIENT_ID}:remittances:{REMITTANCE_ID}:pending
)

send [BRL/2 15000] (
  source = @clients:{CLIENT_ID}:br:bank
  destination = @platform:br:revenue
)

set_tx_meta("type", "WIRE_INITIATED")
set_tx_meta("remittance_id", "{REMITTANCE_ID}")
set_tx_meta("client_id", "{CLIENT_ID}")
set_tx_meta("recipient", "Supplier ABC Ltda")
set_tx_meta("recipient_bank", "Banco do Brasil")
set_tx_meta("amount", "R$54,241")
set_tx_meta("fee", "R$150")`,
      queries: [
        {
          title: 'Pending Wire',
          description: 'BRL awaiting delivery',
          queryType: 'balance',
          addressFilter: 'clients:{CLIENT_ID}:remittances:{REMITTANCE_ID}:pending',
        },
        {
          title: 'Brazil Revenue',
          description: 'Wire fees collected',
          queryType: 'balance',
          addressFilter: 'platform:br:revenue',
        },
        {
          title: 'Customer Journey',
          description: 'All transactions for this remittance',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { remittance_id: '{REMITTANCE_ID}' },
          },
        },
      ],
    },
    {
      txType: 'WIRE_SETTLED',
      label: 'Wire Delivered',
      description: 'Recipient receives BRL - remittance complete',
      numscript: `send [BRL/2 5424100] (
  source = @clients:{CLIENT_ID}:remittances:{REMITTANCE_ID}:pending
  destination = @world
)

set_tx_meta("type", "WIRE_SETTLED")
set_tx_meta("remittance_id", "{REMITTANCE_ID}")
set_tx_meta("client_id", "{CLIENT_ID}")
set_tx_meta("bank_ref", "TED-789012")
set_tx_meta("status", "DELIVERED")`,
      queries: [
        {
          title: 'Complete Remittance Journey',
          description: 'Full audit trail: USD→USDT→BRL→delivered',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { remittance_id: '{REMITTANCE_ID}' },
          },
        },
      ],
    },
  ],

  usefulQueries: [
    {
      title: 'Complete Remittance Journey',
      description: 'All 7 transactions for this remittance',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { remittance_id: '{REMITTANCE_ID}' },
      },
    },
    {
      title: 'All Client Funds (Philippines)',
      description: 'USD + USDT held for all clients at PH',
      queryType: 'balance',
      addressFilter: 'clients::ph:',
    },
    {
      title: 'All Client Funds (Brazil)',
      description: 'USDT + BRL held for all clients at BR',
      queryType: 'balance',
      addressFilter: 'clients::br:',
    },
    {
      title: 'Total Platform Revenue',
      description: 'Combined PH spread + BR fees',
      queryType: 'balance',
      addressFilters: ['platform:ph:revenue', 'platform:br:revenue'],
    },
    {
      title: 'All Exchange Accounts',
      description: 'FX conversion accounts with metadata',
      queryType: 'accounts',
      accountAddress: 'exchanges:',
    },
  ],
};
