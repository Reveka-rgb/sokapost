'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data fresh selama 5 menit (tidak auto-refetch)
        staleTime: 5 * 60 * 1000, // 5 minutes
        
        // Cache bertahan 10 menit setelah tidak dipakai
        gcTime: 10 * 60 * 1000, // 10 minutes
        
        // Auto refetch kalau user kembali ke window (biar data selalu update)
        refetchOnWindowFocus: true,
        
        // Jangan refetch on mount kalau data masih fresh
        refetchOnMount: false,
        
        // Retry 1x saja kalau error (jangan aggressive)
        retry: 1,
        
        // Refetch di background kalau data stale
        refetchOnReconnect: true,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" />
      
      {/* React Query DevTools - hanya di development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
