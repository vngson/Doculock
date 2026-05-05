'use client';

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui/client';
import { doculockConfig } from '@/lib/config';
import { IntroOverlay } from './components/IntroOverlay';
import { useState } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

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

  if (doculockConfig.rpcUrl && doculockConfig.rpcUrl !== getFullnodeUrl(network)) {
    (networks[network] as any) = {
      url: doculockConfig.rpcUrl,
    };
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networks}
        defaultNetwork={network}
      >
        <WalletProvider autoConnect={true}>
          <IntroOverlay />
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
