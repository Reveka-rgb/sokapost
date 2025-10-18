import { auth } from '@/lib/better-auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import DisconnectButton from '@/components/features/DisconnectButton'

export default async function ConnectionsPage() {
  const result = await auth.api.getSession({
    headers: await headers()
  })
  
  if (!result?.user) {
    redirect('/login')
  }
  
  const session = { user: result.user }

  // Fetch connected accounts
  const threadsAccount = await prisma.threadsAccount.findUnique({
    where: { userId: session.user.id }
  })

  const instagramAccounts = await prisma.instagramAccount.findMany({
    where: { userId: session.user.id }
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">Connections</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage your social media accounts
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl space-y-3">
          
          {/* Threads */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              {/* Platform Icon/Avatar */}
              <div className="flex-shrink-0">
                {threadsAccount?.profilePictureUrl ? (
                  <Image
                    src={threadsAccount.profilePictureUrl}
                    alt={threadsAccount.username}
                    width={48}
                    height={48}
                    unoptimized
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">@</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-gray-900">Threads</h3>
                  {threadsAccount ? (
                    <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
                      Connected
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-400 text-white px-2 py-0.5 rounded-full font-medium">
                      Not Connected
                    </span>
                  )}
                </div>
                {threadsAccount ? (
                  <p className="text-xs text-gray-600">
                    @{threadsAccount.username}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Connect to start scheduling
                  </p>
                )}
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0">
                {threadsAccount ? (
                  <DisconnectButton platform="threads" />
                ) : (
                  <Link
                    href="/api/threads/connect"
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                  >
                    Connect
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Instagram */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              {/* Platform Icon/Avatar */}
              <div className="flex-shrink-0">
                {instagramAccounts.length > 0 && instagramAccounts[0].profilePictureUrl ? (
                  <Image
                    src={instagramAccounts[0].profilePictureUrl}
                    alt={instagramAccounts[0].username}
                    width={48}
                    height={48}
                    unoptimized
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">IG</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-gray-900">Instagram</h3>
                  {instagramAccounts.length > 0 ? (
                    <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
                      {instagramAccounts.length} Connected
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-400 text-white px-2 py-0.5 rounded-full font-medium">
                      Not Connected
                    </span>
                  )}
                </div>
                {instagramAccounts.length > 0 ? (
                  <p className="text-xs text-gray-600">
                    {instagramAccounts.map((acc, idx) => (
                      <span key={acc.id}>
                        @{acc.username}
                        {idx < instagramAccounts.length - 1 && ', '}
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Connect Business account
                  </p>
                )}
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0">
                {instagramAccounts.length > 0 ? (
                  <DisconnectButton platform="instagram" label="Disconnect" />
                ) : (
                  <Link
                    href="/api/instagram/connect"
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                  >
                    Connect
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-900 mb-1.5">Connection Info</h4>
            <ul className="text-[11px] text-gray-600 space-y-0.5 list-disc list-inside">
              <li>Threads required for posting and auto-reply</li>
              <li>Instagram optional for cross-posting</li>
              <li>Disconnect and reconnect anytime</li>
              <li>Scheduled posts preserved when reconnecting</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}
