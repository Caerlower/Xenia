'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';

const xeniaTheme = {
  ...lightTheme({
    accentColor: '#0a0a0a',
    accentColorForeground: '#edf0ed',
    borderRadius: 'none',
    fontStack: 'system',
    overlayBlur: 'none',
  }),
  colors: {
    ...lightTheme({
      accentColor: '#0a0a0a',
      accentColorForeground: '#edf0ed',
      borderRadius: 'none',
      fontStack: 'system',
      overlayBlur: 'none',
    }).colors,
    // Overlay must be translucent — never solid paper
    modalBackdrop: 'rgba(10, 10, 10, 0.4)',
    modalBackground: '#edf0ed',
    modalBorder: '#0a0a0a',
    modalText: '#0a0a0a',
    modalTextSecondary: '#6b6f6b',
    profileForeground: '#edf0ed',
    profileAction: '#f7f8f7',
    profileActionHover: '#e4e6e4',
    closeButton: '#0a0a0a',
    closeButtonBackground: '#d5d8d5',
    connectButtonBackground: '#0a0a0a',
    connectButtonBackgroundError: '#c43c2c',
    connectButtonInnerBackground: '#0a0a0a',
    connectButtonText: '#edf0ed',
    actionButtonBorder: '#d5d8d5',
    actionButtonBorderMobile: '#d5d8d5',
    actionButtonSecondaryBackground: '#f7f8f7',
    generalBorder: '#d5d8d5',
    generalBorderDim: '#e4e6e4',
    menuItemBackground: '#f7f8f7',
  },
  blurs: {
    modalOverlay: 'blur(0px)',
  },
  fonts: {
    body: 'var(--font-sans), system-ui, -apple-system, sans-serif',
  },
  radii: {
    actionButton: '0',
    connectButton: '0',
    menuButton: '0',
    modal: '0',
    modalMobile: '0',
  },
  shadows: {
    connectButton: 'none',
    dialog: '0 24px 64px rgba(10, 10, 10, 0.28)',
    profileDetailsAction: 'none',
    selectedOption: 'none',
    selectedWallet: 'none',
    walletLogo: 'none',
  },
};

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={xeniaTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
