'use client';

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui/client';
import { doculockConfig } from '@/lib/config';
import { ThemeProvider } from '@/lib/theme/context';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const network = doculockConfig.network === 'mainnet' ? 'mainnet' : 'testnet';

  const networks = {
    mainnet: {
      url: getFullnodeUrl('mainnet'),
    },
    testnet: {
      url: getFullnodeUrl('testnet'),
    },
  };

  // Allow custom RPC URL override
  if (doculockConfig.rpcUrl && doculockConfig.rpcUrl !== getFullnodeUrl(network)) {
    networks[network] = {
      url: doculockConfig.rpcUrl,
    };
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SuiClientProvider
          networks={networks}
          defaultNetwork={network}
        >
          <WalletProvider autoConnect={true}>
            {children}
          </WalletProvider>
        </SuiClientProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
