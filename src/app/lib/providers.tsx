// app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <div id="toast-container">
        <Toaster
          containerStyle={{
            top: 20,
            right: 20
          }}
          toastOptions={{
            className: '',
            duration: 5000
          }}
        />
      </div>
    </SessionProvider>
  );
}
