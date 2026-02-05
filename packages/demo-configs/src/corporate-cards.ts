import { DemoConfig } from './types';

/**
 * Corporate Cards Demo Configuration
 *
 * Demonstrates B2B on-ramp / corporate card funding:
 * - Company funding via wire transfer
 * - Employee card allocation
 * - Spend tracking with merchant categories
 * - Expense reconciliation
 * - Budget limits
 */
export const corporateCardsConfig: DemoConfig = {
  id: 'corporate-cards',
  name: 'B2B On-Ramp & Corporate Cards',
  description:
    'Corporate expense management with card funding, employee allocations, and spend tracking',

  accounts: [
    {
      address: '@world',
      name: 'External World',
      description: 'Money entering/leaving the system',
      color: 'slate',
    },
    {
      address: '@companies:{COMPANY_ID}:funding',
      name: 'Company Funding Account',
      description: 'Main company balance from wire transfers',
      color: 'emerald',
    },
    {
      address: '@companies:{COMPANY_ID}:cards:{EMPLOYEE_ID}',
      name: 'Employee Card Balance',
      description: 'Funds allocated to employee corporate card',
      color: 'blue',
    },
    {
      address: '@companies:{COMPANY_ID}:pending:reimbursement',
      name: 'Pending Reimbursements',
      description: 'Employee expenses awaiting approval',
      color: 'orange',
    },
    {
      address: '@merchants:{MERCHANT_CATEGORY}',
      name: 'Merchant Category',
      description: 'Spend tracking by category (travel, software, meals)',
      color: 'purple',
    },
    {
      address: '@platform:interchange',
      name: 'Interchange Revenue',
      description: 'Card transaction interchange fees',
      color: 'amber',
    },
    {
      address: '@psp:stripe',
      name: 'Stripe PSP',
      description: 'Payment processor for card authorizations',
      color: 'indigo',
    },
  ],

  variables: {
    COMPANY_ID: 'acme-inc',
    EMPLOYEE_ID: 'emp-sarah',
    FUNDING_AMOUNT: '10000000', // $100,000
    CARD_ALLOCATION: '500000', // $5,000
    TRAVEL_SPEND: '125000', // $1,250
    SOFTWARE_SPEND: '99900', // $999
    MEALS_SPEND: '7500', // $75
    INTERCHANGE_RATE: '0.015', // 1.5%
    INTERCHANGE_AMOUNT: '1875', // $18.75 (on $1,250)
  },

  transactionSteps: [
    {
      txType: 'COMPANY_FUNDING',
      label: 'Company Wire Transfer',
      description: 'ACME Inc funds $100,000 via wire transfer',
      numscript: `send [USD/2 {FUNDING_AMOUNT}] (
  source = @world
  destination = @companies:{COMPANY_ID}:funding
)

set_tx_meta("type", "COMPANY_FUNDING")
set_tx_meta("company", "{COMPANY_ID}")
set_tx_meta("method", "wire")
set_tx_meta("reference", "WIRE-2024-001")`,
      queries: [
        {
          title: 'Company Funding Balance',
          description: 'Available for card allocations',
          queryType: 'balance',
          addressFilter: 'companies:{COMPANY_ID}:funding',
        },
      ],
    },
    {
      txType: 'CARD_ALLOCATION',
      label: 'Employee Card Allocation',
      description: 'Allocate $5,000 to Sarah\'s corporate card',
      numscript: `send [USD/2 {CARD_ALLOCATION}] (
  source = @companies:{COMPANY_ID}:funding
  destination = @companies:{COMPANY_ID}:cards:{EMPLOYEE_ID}
)

set_tx_meta("type", "CARD_ALLOCATION")
set_tx_meta("company", "{COMPANY_ID}")
set_tx_meta("employee", "{EMPLOYEE_ID}")
set_tx_meta("budget_limit", "{CARD_ALLOCATION}")`,
      queries: [
        {
          title: 'Employee Card Balance',
          description: 'Available spending limit',
          queryType: 'balance',
          addressFilter: 'companies:{COMPANY_ID}:cards:{EMPLOYEE_ID}',
        },
        {
          title: 'Remaining Company Funds',
          description: 'Available for more allocations',
          queryType: 'balance',
          addressFilter: 'companies:{COMPANY_ID}:funding',
        },
      ],
    },
    {
      txType: 'TRAVEL_EXPENSE',
      label: 'Travel Expense',
      description: 'Sarah books $1,250 flight - card authorization + interchange',
      numscript: `send [USD/2 {TRAVEL_SPEND}] (
  source = @companies:{COMPANY_ID}:cards:{EMPLOYEE_ID}
  destination = @merchants:travel
)

send [USD/2 {INTERCHANGE_AMOUNT}] (
  source = @psp:stripe allowing unbounded overdraft
  destination = @platform:interchange
)

set_tx_meta("type", "CARD_AUTHORIZATION")
set_tx_meta("company", "{COMPANY_ID}")
set_tx_meta("employee", "{EMPLOYEE_ID}")
set_tx_meta("merchant_category", "travel")
set_tx_meta("merchant", "United Airlines")
set_tx_meta("description", "Flight to NYC")`,
      queries: [
        {
          title: 'Card Balance After Spend',
          description: 'Remaining spending limit',
          queryType: 'balance',
          addressFilter: 'companies:{COMPANY_ID}:cards:{EMPLOYEE_ID}',
        },
        {
          title: 'Travel Category Spend',
          description: 'All travel expenses',
          queryType: 'balance',
          addressFilter: 'merchants:travel',
        },
        {
          title: 'Interchange Revenue',
          description: 'Fees earned on transaction',
          queryType: 'balance',
          addressFilter: 'platform:interchange',
        },
      ],
    },
    {
      txType: 'SOFTWARE_EXPENSE',
      label: 'Software Subscription',
      description: 'Sarah pays $999 for software subscription',
      numscript: `send [USD/2 {SOFTWARE_SPEND}] (
  source = @companies:{COMPANY_ID}:cards:{EMPLOYEE_ID}
  destination = @merchants:software
)

set_tx_meta("type", "CARD_AUTHORIZATION")
set_tx_meta("company", "{COMPANY_ID}")
set_tx_meta("employee", "{EMPLOYEE_ID}")
set_tx_meta("merchant_category", "software")
set_tx_meta("merchant", "Notion")
set_tx_meta("description", "Annual subscription")`,
      queries: [
        {
          title: 'Software Category Spend',
          description: 'All software expenses',
          queryType: 'balance',
          addressFilter: 'merchants:software',
        },
      ],
    },
    {
      txType: 'MEALS_EXPENSE',
      label: 'Team Lunch',
      description: 'Sarah expenses $75 team lunch',
      numscript: `send [USD/2 {MEALS_SPEND}] (
  source = @companies:{COMPANY_ID}:cards:{EMPLOYEE_ID}
  destination = @merchants:meals
)

set_tx_meta("type", "CARD_AUTHORIZATION")
set_tx_meta("company", "{COMPANY_ID}")
set_tx_meta("employee", "{EMPLOYEE_ID}")
set_tx_meta("merchant_category", "meals")
set_tx_meta("merchant", "Sweetgreen")
set_tx_meta("description", "Team lunch")`,
      queries: [
        {
          title: 'All Employee Spend',
          description: 'Total spend by Sarah',
          queryType: 'transactions',
          transactionFilter: {
            metadata: { employee: '{EMPLOYEE_ID}' },
          },
        },
      ],
    },
    {
      txType: 'TOP_UP_CARD',
      label: 'Card Top-Up',
      description: 'Add another $2,000 to Sarah\'s card',
      numscript: `send [USD/2 200000] (
  source = @companies:{COMPANY_ID}:funding
  destination = @companies:{COMPANY_ID}:cards:{EMPLOYEE_ID}
)

set_tx_meta("type", "CARD_TOP_UP")
set_tx_meta("company", "{COMPANY_ID}")
set_tx_meta("employee", "{EMPLOYEE_ID}")`,
      queries: [
        {
          title: 'Updated Card Balance',
          description: 'New spending limit',
          queryType: 'balance',
          addressFilter: 'companies:{COMPANY_ID}:cards:{EMPLOYEE_ID}',
        },
      ],
    },
  ],

  usefulQueries: [
    {
      title: 'Company Total Spend',
      description: 'All card authorizations across categories',
      queryType: 'balance',
      addressFilter: 'merchants:',
    },
    {
      title: 'Spend by Category',
      description: 'Breakdown: travel, software, meals',
      queryType: 'accounts',
      accountAddress: 'merchants:',
    },
    {
      title: 'All Employee Cards',
      description: 'Card balances across all employees',
      queryType: 'balance',
      addressFilter: 'companies:{COMPANY_ID}:cards:',
    },
    {
      title: 'Company Transaction History',
      description: 'All movements for this company',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { company: '{COMPANY_ID}' },
      },
    },
    {
      title: 'All Card Authorizations',
      description: 'Filter by transaction type',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { type: 'CARD_AUTHORIZATION' },
      },
    },
    {
      title: 'Platform Interchange Revenue',
      description: 'Total fees earned',
      queryType: 'balance',
      addressFilter: 'platform:interchange',
    },
    {
      title: 'Employee Spend Summary',
      description: 'All transactions for specific employee',
      queryType: 'transactions',
      transactionFilter: {
        metadata: { employee: '{EMPLOYEE_ID}' },
      },
    },
  ],
};
