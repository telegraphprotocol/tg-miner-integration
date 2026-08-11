const REPO_BASE = 'https://github.com/telegraphprotocol/telegraph-truthwire/tree/main';

export interface UseCase {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  githubHref: string;
  liveHref?: string;
}

/**
 * Real apps built on Telegraph — mirrored from Alexandria's /apps page so this hub can
 * point developers at working boilerplate instead of just documentation.
 */
export const USE_CASES: UseCase[] = [
  {
    id: '01',
    name: 'TruthWire',
    subtitle: 'X-Post AI Detection',
    description: 'Paste an X post URL — fetches the post and runs AI-content detection on the text and any attached images. Verdicts ship with on-chain payment proof.',
    githubHref: `${REPO_BASE}/telegraph-truthwire`,
    liveHref: 'https://truthwire.telegraphprotocol.com',
  },
  {
    id: '02',
    name: 'TrustFilter',
    subtitle: 'Scam & Phishing Analysis',
    description: 'Submit a phone number or message — OpenAI returns scam / suspicious / likely_safe with plain-English reasoning, metered per call on-chain.',
    githubHref: `${REPO_BASE}/telegraph-trustfilter`,
    liveHref: 'https://trustfilter.telegraphprotocol.com',
  },
  {
    id: '03',
    name: 'ScholarGuard',
    subtitle: 'Academic Document Integrity',
    description: 'Upload a PDF or DOCX — extracted text runs through ItsAI for AI-writing detection while embedded images flow to Bitmind. Every call returns its own tx hash.',
    githubHref: `${REPO_BASE}/telegraph-scholarguard`,
    liveHref: 'https://scholarguard.telegraphprotocol.com',
  },
  {
    id: '04',
    name: 'ReviewReward',
    subtitle: 'Amazon Review Authenticity',
    description: 'Paste a product URL — pulls recent reviews, scores each through ItsAI, and surfaces an AI-vs-human signal summary with per-review transaction proofs.',
    githubHref: `${REPO_BASE}/telegraph-reviewreward`,
    liveHref: 'https://reviewradar.telegraphprotocol.com',
  },
  {
    id: '05',
    name: 'SuperSignal',
    subtitle: 'Autonomous Prediction Trading',
    description: 'Connect a wallet — every two hours the bot pulls Polymarket positions and asks an LLM to decide YES / NO / HOLD.',
    githubHref: `${REPO_BASE}/telegraph-polymarket-bot`,
    liveHref: 'https://supersignal.telegraphprotocol.com',
  },
  {
    id: '06',
    name: 'AdGuard',
    subtitle: 'Brand-Safe Ad Pausing',
    description: 'Score articles for deepfakes via Bitmind and AI-written copy via ItsAI. If the weighted threat score crosses your threshold, AdGuard pauses the matching Google Ads campaigns automatically.',
    githubHref: `${REPO_BASE}/telegraph-adguard`,
  },
];
