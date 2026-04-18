'use client';

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui/client';
import { doculockConfig } from '@/lib/config';
import { ThemeProvider } from '@/lib/theme/context';
import { useState } from 'react';

// Configure QueryClient with aggressive caching for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes - prevent redundant blockchain calls
      staleTime: 5 * 60 * 1000,
      // Keep cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed queries once
      retry: 1,
      // Don't refetch on window focus (reduces unnecessary network calls)
      refetchOnWindowFocus: false,
      // Only refetch on mount if data is stale
      refetchOnMount: false,
      // Don't refetch on reconnect
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

  // Allow custom RPC URL override
  if (doculockConfig.rpcUrl && doculockConfig.rpcUrl !== getFullnodeUrl(network)) {
    (networks[network] as any) = {
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
          {/* Removed autoConnect to prevent blocking UI on refresh */}
          <WalletProvider autoConnect={true}>
            {children}
          </WalletProvider>
        </SuiClientProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
