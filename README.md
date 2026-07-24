# Telegraph Miner Registry

Register your inference node on the [Telegraph Protocol](https://telegraphprotocol.com/). Configure a YAML descriptor, pin it to IPFS, and submit your registration to the Telegraph Diamond contract on Base Sepolia — all from one interface.

---

## What You Can Do

- **Create a YAML config** from scratch using a guided step-by-step wizard
- **Import an existing YAML** file, review the parsed values, and upload to IPFS
- **Register on-chain** using either an IPFS URL from the upload step, or a hash you already have

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```bash
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
NEXT_PUBLIC_REGISTRY_CONTRACT=0xac683bFa8F1C892E23e8300d14c20678C6FC0CA3
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

| Variable | Where to get it |
|---|---|
| `PINATA_API_KEY` / `PINATA_API_SECRET` | [app.pinata.cloud](https://app.pinata.cloud) → API Keys |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `NEXT_PUBLIC_REGISTRY_CONTRACT` | Telegraph Diamond contract — pre-filled above |

### 3. Run

```bash
npm run dev       # development
npm run build && npm start   # production
```

---

## How Registration Works

The app presents three paths on the landing screen. Choose the one that fits your situation:

---

### Option 1 — Create YAML from scratch

Use this if you are setting up a new miner and don't have a config file yet.

1. Click **Start building** on the landing screen.
2. Work through each wizard section — Basics, Connection, Endpoints, Semantics, On-Chain, and Advanced. Required fields are marked with `*`.
3. A live YAML preview updates as you fill in values. Once all required sections are complete, click **Next: Upload to IPFS**.
4. On the upload step, click **Pin to IPFS**. The app sends your YAML to Pinata server-side and returns an IPFS URL and CID.
5. Click **Next: Register On-Chain** to proceed to the transaction step (see [Submitting the transaction](#submitting-the-transaction) below).

---

### Option 2 — Import an existing YAML

Use this if you already have a YAML file and want to upload it to IPFS and register it.

1. Click **Import YAML** on the landing screen.
2. Either paste your YAML directly or drag and drop a `.yaml` / `.yml` file.
3. Click **Import & Edit** — the wizard opens pre-filled with all parsed values so you can review or adjust anything before uploading.
4. Continue from step 4 in Option 1.

---

### Option 3 — Register with an existing hash

Use this if your YAML is already hosted somewhere and you just need to submit the on-chain transaction.

1. Click **Register now** on the landing screen.
2. Select the **Enter hash manually** tab.
3. Fill in your YAML URL, YAML hash, and supported intents. If you need to generate the hash from a local file, click **Generate from file** next to the hash field — the hash is computed client-side and never uploaded.
4. Continue to [Submitting the transaction](#submitting-the-transaction) below.

---

### Submitting the transaction

Applies to all three paths once you reach the Register On-Chain screen.

1. **Connect your wallet** using the button in the Wallet card. Make sure you are on **Base Sepolia** — the app will prompt you to switch if needed.
2. Set your **Fee Address** (defaults to your connected wallet) and **Floor Price** (minimum $0.01 USDC).
3. The pre-flight checklist confirms all five required values are valid before the button becomes active.
4. Click **Register Miner** and approve the transaction in your wallet.
5. Once the transaction hash is returned, the confirmation screen shows your tx hash with a link to BaseScan.

> **Note:** There is no update function. To change your YAML, fee address, or floor price, deregister and re-register. The floor price is immutable per registration.

### Registration fields

| Field | Notes |
|---|---|
| YAML URL | Public HTTPS or IPFS URL pointing to your YAML file |
| YAML Hash | SHA-256 of raw file bytes, `0x`-prefixed |
| Fee Address | EVM address where payouts are sent |
| Floor Price | Minimum $0.01 in USDC (immutable after registration) |
| Supported Intents | At least one canonical intent, e.g. `chat_completion` |

---

## Contract

| | |
|---|---|
| Network | Base Sepolia (chain ID 84532) |
| Address | `0xac683bFa8F1C892E23e8300d14c20678C6FC0CA3` |
| Explorer | [sepolia.basescan.org](https://sepolia.basescan.org/address/0xac683bFa8F1C892E23e8300d14c20678C6FC0CA3) |

---

## Links

- [Telegraph Protocol](https://telegraphprotocol.com/)
- [Documentation](https://docs.telegraphprotocol.com)
