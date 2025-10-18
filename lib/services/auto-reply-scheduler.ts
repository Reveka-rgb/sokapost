import cron from 'node-cron'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import { fetchThreadsConversation, sendThreadsReply } from '@/lib/api/threads'
import { generateAIReply } from '@/lib/auto-reply/ai-generator'
import { findMatchingKeyword, shouldExcludeMessage } from '@/lib/auto-reply/keyword-matcher'

let isSchedulerRunning = false

// Configurable interval (default: 5 minutes, or 1 minute for testing)
const CRON_INTERVAL = process.env.AUTO_REPLY_CRON_INTERVAL || '*/5 * * * *'
const INTERVAL_DESCRIPTION = process.env.AUTO_REPLY_CRON_INTERVAL === '* * * * *' 
  ? '1 minute (TESTING MODE)' 
  : '5 minutes'

// Track reply counts per hour for rate limiting
const replyCountsPerHour: Map<string, { count: number; resetTime: number }> = new Map()

function getReplyCount(userId: string): number {
  const now = Date.now()
  const data = replyCountsPerHour.get(userId)
  
  if (!data || now > data.resetTime) {
    // Reset if expired (older than 1 hour)
    replyCountsPerHour.set(userId, { count: 0, resetTime: now + 3600000 })
    return 0
  }
  
  return data.count
}

function incrementReplyCount(userId: string) {
  const now = Date.now()
  const data = replyCountsPerHour.get(userId)
  
  if (!data || now > data.resetTime) {
    replyCountsPerHour.set(userId, { count: 1, resetTime: now + 3600000 })
  } else {
    data.count++
  }
}

export function startAutoReplyScheduler() {
  if (isSchedulerRunning) {
    console.log('⚠️ Auto-reply scheduler already running')
    return
  }

  // Run based on configured interval
  const task = cron.schedule(CRON_INTERVAL, async () => {
    try {
      const now = new Date().toLocaleTimeString('id-ID')
      console.log(`🤖 [Auto-Reply] Starting job at ${now}...`)
      await processAutoReplies()
      console.log(`✅ [Auto-Reply] Job completed at ${now}`)
    } catch (error) {
      console.error('❌ [Auto-Reply] Job failed:', error)
    }
  })

  isSchedulerRunning = true
  const startTime = new Date().toLocaleTimeString('id-ID')
  console.log(`🤖 [Auto-Reply] Scheduler started at ${startTime}`)
  console.log(`🤖 [Auto-Reply] Interval: ${INTERVAL_DESCRIPTION} (${CRON_INTERVAL})`)
  console.log(`🤖 [Auto-Reply] Watch console for: "🤖 [Auto-Reply] Starting job at..." messages`)
}

async function processAutoReplies() {
  // Get all users with auto-reply enabled
  const users = await prisma.user.findMany({
    where: {
      autoReplySettings: {
        some: {
          enabled: true,
          platform: 'threads'
        }
      }
    },
    include: {
      autoReplySettings: {
        where: {
          platform: 'threads',
          enabled: true
        }
      },
      threadsAccounts: true
    }
  })

  if (users.length === 0) {
    console.log('ℹ️ [Scheduler] No users with auto-reply enabled')
    return
  }

  console.log(`👥 [Scheduler] Found ${users.length} users with auto-reply enabled`)

  for (const user of users) {
    try {
      await processUserReplies(user)
    } catch (error) {
      console.error(`❌ [Scheduler] Failed to process replies for user ${user.id}:`, error)
    }
  }
}

async function processUserReplies(user: any) {
  const settings = user.autoReplySettings[0] // Get first (threads) settings
  
  if (!settings) {
    console.log(`⚠️ [Scheduler] User ${user.id} has no auto-reply settings`)
    return
  }
  
  console.log(`🔧 [Scheduler] User ${user.id} settings:`, {
    enabled: settings.enabled,
    mode: settings.mode,
    monitorAllPosts: settings.monitorAllPosts,
    hasSelectedPostIds: !!settings.selectedPostIds,
    hasEnabledAt: !!settings.enabledAt,
    enabledAt: settings.enabledAt ? new Date(settings.enabledAt).toISOString() : null,
    platform: settings.platform
  })
  
  const threadsAccount = user.threadsAccounts[0]

  if (!threadsAccount) {
    console.log(`⚠️ [Scheduler] User ${user.id} has no Threads account connected`)
    return
  }

  // Check rate limit
  const currentCount = getReplyCount(user.id)
  if (currentCount >= settings.maxRepliesPerHour) {
    console.log(`⏸️ [Scheduler] User ${user.id} reached rate limit (${currentCount}/${settings.maxRepliesPerHour})`)
    return
  }

  // Decrypt token
  const accessToken = decryptToken(threadsAccount.accessToken)

  // Get posts to monitor
  let postIds: string[] = []
  
  console.log(`🔧 [Scheduler] monitorAllPosts=${settings.monitorAllPosts}, selectedPostIds=${settings.selectedPostIds ? 'SET' : 'NULL'}`)
  
  if (settings.monitorAllPosts) {
    // Fetch recent posts from Threads API
    console.log(`📡 [Scheduler] Fetching ALL posts from Threads API...`)
    const axios = require('axios')
    const response = await axios.get(`https://graph.threads.net/v1.0/${threadsAccount.threadsUserId}/threads`, {
      params: {
        fields: 'id',
        limit: 25,
        access_token: accessToken
      }
    })
    postIds = response.data.data.map((p: any) => p.id)
    console.log(`📡 [Scheduler] Fetched ${postIds.length} posts from API`)
  } else if (settings.selectedPostIds) {
    // Use selected posts
    console.log(`📋 [Scheduler] Using selected posts from database...`)
    try {
      const parsed = JSON.parse(settings.selectedPostIds)
      if (Array.isArray(parsed)) {
        postIds = parsed
        console.log(`📋 [Scheduler] Parsed ${postIds.length} selected posts: ${postIds.join(', ')}`)
      } else {
        console.error(`❌ [Scheduler] selectedPostIds is not an array: ${typeof parsed}`)
      }
    } catch (e: any) {
      console.error(`❌ [Scheduler] Failed to parse selectedPostIds: ${e.message}`)
      console.error(`❌ [Scheduler] Raw value: ${settings.selectedPostIds}`)
      return
    }
  } else {
    console.log(`⚠️ [Scheduler] monitorAllPosts=false but no selectedPostIds`)
  }

  if (postIds.length === 0) {
    console.log(`ℹ️ [Scheduler] User ${user.id} has no posts to monitor`)
    console.log(`💡 [Scheduler] Either enable monitorAllPosts=true OR select specific posts`)
    return
  }

  console.log(`📝 Monitoring ${postIds.length} posts for user ${user.id}`)

  // Process each post
  for (const postId of postIds) {
    try {
      await processPostReplies(user, settings, threadsAccount, postId, accessToken)
      
      // Check if we hit rate limit
      if (getReplyCount(user.id) >= settings.maxRepliesPerHour) {
        console.log(`⏸️ User ${user.id} reached rate limit, stopping`)
        break
      }
    } catch (error) {
      console.error(`❌ Failed to process post ${postId}:`, error)
    }
  }
}

async function processPostReplies(
  user: any,
  settings: any,
  threadsAccount: any,
  postId: string,
  accessToken: string
) {
  // Fetch all replies for this post
  const conversation = await fetchThreadsConversation({
    accessToken,
    mediaId: postId,
    reverse: false // Oldest first
  })

  if (!conversation.data || conversation.data.length === 0) {
    return
  }

  console.log(`💬 Found ${conversation.data.length} replies on post ${postId}`)

  // Filter replies that need response
  for (const reply of conversation.data) {
    console.log(`🔍 [Scheduler] Checking reply ${reply.id} from @${reply.username}`)
    
    // 🎯 KEY: Check if comment is AFTER enabledAt checkpoint
    console.log(`⏰ [Scheduler] Checkpoint check:`, {
      hasEnabledAt: !!settings.enabledAt,
      enabledAt: settings.enabledAt,
      hasReplyTimestamp: !!reply.timestamp,
      replyTimestamp: reply.timestamp
    })
    
    if (settings.enabledAt && reply.timestamp) {
      const replyTime = new Date(reply.timestamp)
      const checkpointTime = new Date(settings.enabledAt)
      
      console.log(`⏰ [Scheduler] Comparing: reply=${replyTime.toISOString()} vs checkpoint=${checkpointTime.toISOString()}`)
      
      if (replyTime < checkpointTime) {
        console.log(`⏭️ [Scheduler] SKIPPING - OLD comment (${replyTime.toISOString()} < ${checkpointTime.toISOString()})`)
        continue
      } else {
        console.log(`✅ [Scheduler] NEW comment (${replyTime.toISOString()} >= ${checkpointTime.toISOString()})`)
      }
    } else {
      if (!settings.enabledAt) {
        console.log(`⚠️ [Scheduler] No enabledAt checkpoint - will process all comments`)
      }
      if (!reply.timestamp) {
        console.log(`⚠️ [Scheduler] Reply has no timestamp - cannot check age`)
      }
    }
    
    // Skip if already processed or being processed
    const existingReply = await prisma.replyHistory.findUnique({
      where: { 
        platform_replyId: {
          platform: 'threads',
          replyId: reply.id
        }
      }
    })

    if (existingReply) {
      console.log(`📋 [Scheduler] Found existing: status=${existingReply.status}`)
      // Skip if already replied, processing, or skipped
      if (['replied', 'processing', 'skipped'].includes(existingReply.status)) {
        console.log(`⏭️ [Scheduler] SKIPPING - already ${existingReply.status}`)
        continue
      }
      // If status is 'failed' or 'pending', we can retry
      console.log(`🔄 [Scheduler] Retrying reply ${reply.id} with status: ${existingReply.status}`)
    } else {
      console.log(`✨ [Scheduler] New reply - never processed`)
    }

    // Skip our own replies
    if (reply.username === threadsAccount.username) {
      console.log(`⏭️ [Scheduler] SKIPPING - our own reply`)
      continue
    }

    // DOUBLE CHECK: Fetch reply conversation to see if we already replied
    try {
      const replyConversation = await fetchThreadsConversation({
        accessToken,
        mediaId: reply.id,
        reverse: false
      })
      
      const hasOurReply = replyConversation.data?.some(
        (r: any) => r.username === threadsAccount.username
      )
      
      if (hasOurReply) {
        console.log(`⏭️ [Scheduler] SKIPPING - already replied (Threads check)`)
        // Update database if out of sync
        if (!existingReply) {
          await prisma.replyHistory.create({
            data: {
              userId: user.id,
              postId,
              replyId: reply.id,
              conversationId: postId,
              fromUsername: reply.username,
              replyText: reply.text,
              status: 'replied',
              replyMode: settings.mode
            }
          })
          console.log(`📝 [Scheduler] Database synced`)
        }
        continue
      }
    } catch (error) {
      console.warn(`⚠️ [Scheduler] Reply conversation check failed for ${reply.id}`)
      // Continue anyway
    }

    // Check exclude keywords
    if (shouldExcludeMessage(reply.text, settings.excludeKeywords)) {
      console.log(`🚫 Skipping reply ${reply.id} - matches exclude keyword`)
      
      await prisma.replyHistory.create({
        data: {
          userId: user.id,
          postId,
          replyId: reply.id,
          conversationId: postId,
          fromUsername: reply.username,
          replyText: reply.text,
          status: 'skipped',
          replyMode: settings.mode
        }
      })
      continue
    }

    // Check rate limit again
    if (getReplyCount(user.id) >= settings.maxRepliesPerHour) {
      break
    }

    // Process based on mode
    if (settings.mode === 'off') {
      // Just monitor, don't reply
      await prisma.replyHistory.create({
        data: {
          userId: user.id,
          postId,
          replyId: reply.id,
          conversationId: postId,
          fromUsername: reply.username,
          replyText: reply.text,
          status: 'skipped',
          replyMode: 'off'
        }
      })
      continue
    }

    if (settings.mode === 'manual') {
      // Save for manual review
      await prisma.replyHistory.create({
        data: {
          userId: user.id,
          postId,
          replyId: reply.id,
          conversationId: postId,
          fromUsername: reply.username,
          replyText: reply.text,
          status: 'pending',
          replyMode: 'manual'
        }
      })
      console.log(`📥 Saved reply ${reply.id} for manual review`)
      continue
    }

    // Auto-reply modes (AI or Keyword)
    try {
      let replyText = ''
      let replyMode = settings.mode
      let matchedKeyword: string | null = null

      if (settings.mode === 'keyword') {
        // Try keyword match
        const match = await findMatchingKeyword(user.id, reply.text)
        if (match) {
          replyText = match.replyText
          matchedKeyword = match.keyword
          console.log(`🔑 Matched keyword "${match.keyword}" for reply ${reply.id}`)
        } else {
          // No keyword match, skip
          await prisma.replyHistory.create({
            data: {
              userId: user.id,
              postId,
              replyId: reply.id,
              conversationId: postId,
              fromUsername: reply.username,
              replyText: reply.text,
              status: 'skipped',
              replyMode: 'keyword'
            }
          })
          console.log(`ℹ️ No keyword match for reply ${reply.id}`)
          continue
        }
      } else if (settings.mode === 'ai') {
        // Generate AI reply
        console.log(`🤖 Generating AI reply for ${reply.id}...`)
        
        replyText = await generateAIReply({
          messageText: reply.text,
          fromUsername: reply.username,
          customPrompt: settings.customPrompt
        })
        
        // Log already done in generateAIReply function, no need to duplicate
      }

      if (!replyText) {
        continue
      }

      // 🔒 CRITICAL: Save to history FIRST with "processing" status
      // This prevents race condition where multiple cron jobs process the same reply
      const historyRecord = await prisma.replyHistory.create({
        data: {
          userId: user.id,
          postId,
          replyId: reply.id,
          conversationId: postId,
          fromUsername: reply.username,
          replyText: reply.text,
          ourReplyText: replyText,
          status: 'processing',
          replyMode,
          matchedKeyword
        }
      })

      console.log(`🔒 Locked reply ${reply.id} for processing`)

      // Apply delay (make it human-like)
      const delayMs = settings.aiDelay * 60 * 1000
      if (delayMs > 0) {
        console.log(`⏳ Waiting ${settings.aiDelay} minutes before replying...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      // Send reply
      console.log(`📤 Sending reply to ${reply.id}...`)
      const ourReplyId = await sendThreadsReply({
        accessToken,
        userId: threadsAccount.threadsUserId,
        replyToId: reply.id,
        text: replyText
      })

      // Increment rate limit counter
      incrementReplyCount(user.id)

      // Update history to "replied" with ourReplyId
      await prisma.replyHistory.update({
        where: { id: historyRecord.id },
        data: {
          ourReplyId,
          status: 'replied',
          repliedAt: new Date()
        }
      })

      console.log(`✅ Reply sent successfully: ${ourReplyId}`)

    } catch (error: any) {
      console.error(`❌ Failed to reply to ${reply.id}:`, error)
      
      // Check if we already created a "processing" record
      const existingRecord = await prisma.replyHistory.findUnique({
        where: { 
          platform_replyId: {
            platform: 'threads',
            replyId: reply.id
          }
        }
      })

      if (existingRecord && existingRecord.status === 'processing') {
        // Update to failed
        await prisma.replyHistory.update({
          where: { id: existingRecord.id },
          data: {
            status: 'failed'
          }
        })
      } else if (!existingRecord) {
        // Create failed record if doesn't exist yet
        await prisma.replyHistory.create({
          data: {
            userId: user.id,
            postId,
            replyId: reply.id,
            conversationId: postId,
            fromUsername: reply.username,
            replyText: reply.text,
            status: 'failed',
            replyMode: settings.mode
          }
        })
      }
    }
  }
}
