import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://base-sepolia.g.alchemy.com/v2/aKrIQPvnY5pM8AkdVNDM7';

export const wagmiConfig = getDefaultConfig({
  appName: 'Telegraph Miner Registry',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'ffffffffffffffffffffffffffffffff',
  chains: [baseSepolia],
  transports: { [baseSepolia.id]: http(RPC_URL) },
  ssr: true,
});
