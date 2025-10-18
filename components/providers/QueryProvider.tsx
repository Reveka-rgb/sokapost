'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data dianggap fresh selama 5 menit (tidak refetch)
            staleTime: 5 * 60 * 1000, // 5 minutes
            
            // Cache disimpan selama 10 menit
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            
            // Auto refetch ketika user balik ke window/tab
            refetchOnWindowFocus: true,
            
            // Retry 1x aja kalau gagal (jangan terlalu aggressive)
            retry: 1,
            
            // Jangan refetch on mount kalau data masih fresh
            refetchOnMount: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools hanya muncul di development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
