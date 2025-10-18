import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import { fetchThreadsConversation, sendThreadsReply } from '@/lib/api/threads'
import { generateAIReply } from '@/lib/auto-reply/ai-generator'
import { findMatchingKeyword, shouldExcludeMessage } from '@/lib/auto-reply/keyword-matcher'

// POST - Manual trigger auto-reply untuk testing
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧪 [Manual Trigger] Starting auto-reply test...')

    // Get user with settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        autoReplySettings: true,
        threadsAccounts: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get Threads-specific settings
    const settings = user.autoReplySettings.find(s => s.platform === 'threads')
    if (!settings) {
      return NextResponse.json({ error: 'Auto-reply settings not configured for Threads' }, { status: 400 })
    }

    if (!settings.enabled) {
      return NextResponse.json({ error: 'Auto-reply is not enabled for Threads' }, { status: 400 })
    }

    const threadsAccount = user.threadsAccounts[0]
    if (!threadsAccount) {
      return NextResponse.json({ error: 'Threads account not connected' }, { status: 400 })
    }

    // Decrypt token
    const accessToken = decryptToken(threadsAccount.accessToken)

    // Get posts to monitor
    let postIds: string[] = []
    
    console.log(`🔧 [Trigger] monitorAllPosts=${settings.monitorAllPosts}, selectedPostIds=${settings.selectedPostIds ? 'SET' : 'NULL'}`)
    
    if (settings.monitorAllPosts) {
      // Fetch recent posts from Threads API
      console.log(`📡 [Trigger] Fetching ALL posts from Threads API...`)
      const axios = require('axios')
      try {
        const response = await axios.get(`https://graph.threads.net/v1.0/${threadsAccount.threadsUserId}/threads`, {
          params: {
            fields: 'id',
            limit: 25,
            access_token: accessToken
          }
        })
        postIds = response.data.data.map((p: any) => p.id)
        console.log(`📡 [Trigger] Fetched ${postIds.length} posts from API`)
      } catch (error: any) {
        console.error(`❌ [Trigger] Failed to fetch posts:`, error.message)
        return NextResponse.json({
          error: 'Failed to fetch posts from Threads API'
        }, { status: 500 })
      }
    } else if (settings.selectedPostIds) {
      // Use selected posts
      console.log(`📋 [Trigger] Using selected posts from database...`)
      try {
        const parsed = JSON.parse(settings.selectedPostIds)
        if (Array.isArray(parsed) && parsed.length > 0) {
          postIds = parsed
          console.log(`📋 [Trigger] Parsed ${postIds.length} selected posts: ${postIds.join(', ')}`)
        } else {
          console.error(`❌ [Trigger] selectedPostIds is not a valid array`)
        }
      } catch (e: any) {
        console.error(`❌ [Trigger] Failed to parse selectedPostIds: ${e.message}`)
        console.error(`❌ [Trigger] Raw value: ${settings.selectedPostIds}`)
      }
    } else {
      console.log(`⚠️ [Trigger] monitorAllPosts=false but no selectedPostIds`)
    }

    if (postIds.length === 0) {
      return NextResponse.json({
        error: 'No posts to monitor. Either enable "Monitor All Posts" OR select specific posts in settings.',
        debug: {
          monitorAllPosts: settings.monitorAllPosts,
          hasSelectedPostIds: !!settings.selectedPostIds,
          selectedPostIdsRaw: settings.selectedPostIds
        }
      }, { status: 400 })
    }

    console.log(`📝 Processing ${postIds.length} posts...`)

    let processedCount = 0
    let repliedCount = 0
    let skippedCount = 0

    // Process each post
    for (const postId of postIds) {
      try {
        // Fetch replies
        const conversation = await fetchThreadsConversation({
          accessToken,
          mediaId: postId,
          reverse: false
        })

        if (!conversation.data || conversation.data.length === 0) {
          continue
        }

        console.log(`💬 Found ${conversation.data.length} replies on post ${postId}`)

        // Process each reply
        for (const reply of conversation.data) {
          processedCount++

          console.log(`🔍 Checking reply ${reply.id} from @${reply.username}`)

          // 🎯 KEY: Check if comment is AFTER enabledAt checkpoint
          if (settings.enabledAt && reply.timestamp) {
            const replyTime = new Date(reply.timestamp)
            const checkpointTime = new Date(settings.enabledAt)
            
            if (replyTime < checkpointTime) {
              console.log(`⏭️ SKIPPING - Comment is OLD (${replyTime.toISOString()} < ${checkpointTime.toISOString()})`)
              console.log(`📅 Comment posted BEFORE auto-reply was enabled`)
              skippedCount++
              continue
            } else {
              console.log(`✅ Comment is NEW (${replyTime.toISOString()} >= ${checkpointTime.toISOString()})`)
            }
          }

          // Skip if already processed or being processed
          const existing = await prisma.replyHistory.findUnique({
            where: { 
              platform_replyId: {
                platform: 'threads',
                replyId: reply.id
              }
            }
          })

          if (existing) {
            console.log(`📋 Found existing record: status=${existing.status}, ourReplyId=${existing.ourReplyId}`)
            // Skip if already replied, processing, or skipped
            if (['replied', 'processing', 'skipped'].includes(existing.status)) {
              console.log(`⏭️ SKIPPING - Reply ${reply.id} already ${existing.status}`)
              skippedCount++
              continue
            }
            // If status is 'failed' or 'pending', we can retry
            console.log(`🔄 Retrying reply ${reply.id} with status: ${existing.status}`)
          } else {
            console.log(`✨ New reply - never processed before`)
          }

          // Skip own replies
          if (reply.username === threadsAccount.username) {
            console.log(`⏭️ SKIPPING - This is our own reply`)
            skippedCount++
            continue
          }

          // DOUBLE CHECK: Fetch this specific reply's conversation to see if we already replied
          // This is an extra safety check in case database is out of sync
          try {
            const replyConversation = await fetchThreadsConversation({
              accessToken,
              mediaId: reply.id,
              reverse: false
            })
            
            // Check if any of the replies are from us
            const hasOurReply = replyConversation.data?.some(
              (r: any) => r.username === threadsAccount.username
            )
            
            if (hasOurReply) {
              console.log(`⏭️ SKIPPING - Already replied (found in Threads conversation)`)
              // Update database if out of sync
              if (!existing) {
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
                console.log(`📝 Database updated with existing reply`)
              }
              skippedCount++
              continue
            }
          } catch (error) {
            console.warn(`⚠️ Could not check reply conversation for ${reply.id}:`, error)
            // Continue anyway - don't block on this check
          }

          // Check exclude keywords
          if (shouldExcludeMessage(reply.text, settings.excludeKeywords)) {
            console.log(`🚫 Skipping - exclude keyword matched`)
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
            skippedCount++
            continue
          }

          // Generate reply based on mode
          let replyText = ''
          let matchedKeyword: string | null = null

          if (settings.mode === 'keyword') {
            const match = await findMatchingKeyword(user.id, reply.text)
            if (match) {
              replyText = match.replyText
              matchedKeyword = match.keyword
              console.log(`🔑 Keyword matched: "${match.keyword}"`)
            } else {
              console.log(`ℹ️ No keyword match`)
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
              skippedCount++
              continue
            }
          } else if (settings.mode === 'ai') {
            console.log(`🤖 Generating AI reply...`)
            replyText = await generateAIReply({
              messageText: reply.text,
              fromUsername: reply.username,
              customPrompt: settings.customPrompt
            })
            // Log already done in generateAIReply function
          }

          if (!replyText) {
            skippedCount++
            continue
          }

          // 🔒 CRITICAL: Save to history FIRST with "processing" status
          // This prevents race condition with cron scheduler
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
              replyMode: settings.mode,
              matchedKeyword
            }
          })

          console.log(`🔒 Locked reply ${reply.id} for processing`)

          // Send reply (no delay for manual trigger)
          console.log(`📤 Sending reply...`)
          const ourReplyId = await sendThreadsReply({
            accessToken,
            userId: threadsAccount.threadsUserId,
            replyToId: reply.id,
            text: replyText
          })

          // Update history to "replied"
          await prisma.replyHistory.update({
            where: { id: historyRecord.id },
            data: {
              ourReplyId,
              status: 'replied',
              repliedAt: new Date()
            }
          })

          repliedCount++
          console.log(`✅ Reply sent: ${ourReplyId}`)

          // Check rate limit
          if (repliedCount >= settings.maxRepliesPerHour) {
            console.log(`⏸️ Rate limit reached (${repliedCount}/${settings.maxRepliesPerHour})`)
            break
          }
        }

        // Break outer loop if rate limit hit
        if (repliedCount >= settings.maxRepliesPerHour) {
          break
        }

      } catch (error: any) {
        console.error(`❌ Error processing post ${postId}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-reply triggered successfully',
      stats: {
        processed: processedCount,
        replied: repliedCount,
        skipped: skippedCount
      }
    })

  } catch (error: any) {
    console.error('Manual trigger error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger auto-reply' },
      { status: 500 }
    )
  }
}
