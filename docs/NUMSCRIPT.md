# Numscript Reference

Numscript is the domain-specific language for creating transactions in Formance Ledger.

## Basic Syntax

### Send Statement

```numscript
send [ASSET/PRECISION AMOUNT] (
  source = @account
  destination = @account
)
```

### Asset Notation

| Notation | Meaning |
|----------|---------|
| `[USD/2 1000]` | $10.00 (1000 cents) |
| `[EUR/2 500]` | €5.00 |
| `[USDT/6 10000000000]` | 10,000 USDT |
| `[BTC/8 100000000]` | 1 BTC |

The number after `/` is the decimal precision (number of decimal places).

### Accounts

Accounts are prefixed with `@`:

```numscript
source = @users:alice:wallet
destination = @platform:revenue
```

### @world Account

`@world` is a special account representing external money:
- Always allows overdraft
- Use for deposits (money entering system)
- Use for withdrawals (money leaving system)

```numscript
// Deposit
send [USD/2 10000] (
  source = @world
  destination = @users:alice:wallet
)

// Withdrawal
send [USD/2 10000] (
  source = @users:alice:wallet
  destination = @world
)
```

## Overdraft

### Unbounded Overdraft

For external entities (PSPs, exchanges, banks):

```numscript
send [USD/2 1000] (
  source = @psp:stripe allowing unbounded overdraft
  destination = @users:alice:wallet
)
```

### Bounded Overdraft

Allow overdraft up to a limit:

```numscript
send [USD/2 1000] (
  source = @users:alice allowing overdraft up to [USD/2 500]
  destination = @merchants:shop
)
```

## Metadata

### Transaction Metadata

```numscript
set_tx_meta("type", "DEPOSIT")
set_tx_meta("customer_id", "alice-123")
set_tx_meta("reference", "TXN-001")
```

### Account Metadata

```numscript
set_account_meta(@exchanges:001, "rate", "5.45")
set_account_meta(@exchanges:001, "type", "USDT_BRL")
set_account_meta(@users:alice, "tier", "gold")
```

## Variables

Use `{VARIABLE_NAME}` placeholders that get substituted at execution:

```numscript
send [USD/2 {AMOUNT}] (
  source = @world
  destination = @customers:{CUSTOMER_ID}:available
)

set_tx_meta("customer_id", "{CUSTOMER_ID}")
```

## Multiple Sends

Multiple sends in one transaction:

```numscript
// FX conversion example
send [USDT/6 10000000000] (
  source = @treasury:hot
  destination = @exchanges:001
)

send [BRL/2 5450000] (
  source = @exchanges:001 allowing unbounded overdraft
  destination = @banks:operating
)

set_tx_meta("type", "FX_CONVERSION")
set_account_meta(@exchanges:001, "rate", "5.45")
```

## Common Patterns

### Simple Transfer
```numscript
send [USD/2 1000] (
  source = @users:alice
  destination = @users:bob
)
```

### Transfer with Fee
```numscript
send [USD/2 1000] (
  source = @users:alice
  destination = @merchants:shop
)

send [USD/2 25] (
  source = @users:alice
  destination = @platform:fees
)
```

### Currency Conversion
```numscript
send [USD/2 10000] (
  source = @treasury:usd
  destination = @exchanges:usd:eur:001
)

send [EUR/2 9200] (
  source = @exchanges:usd:eur:001 allowing unbounded overdraft
  destination = @treasury:eur
)

set_account_meta(@exchanges:usd:eur:001, "rate", "0.92")
```

### PSP Authorization
```numscript
send [USD/2 1000] (
  source = @psp:stripe allowing unbounded overdraft
  destination = @users:alice:wallet
)

set_tx_meta("type", "AUTHORIZATION")
set_tx_meta("psp_reference", "ch_xxx")
```

## Notes

- Numscript does not support inline comments
- All amounts are integers (no decimal points)
- Account addresses use colon-delimited segments
- Multiple metadata statements can be combined
