-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadsUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profilePictureUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threads_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instagramId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profilePictureUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3),
    "facebookPageId" TEXT,
    "facebookPageName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'threads',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "threadsPostId" TEXT,
    "instagramPostId" TEXT,
    "topic" TEXT,
    "location" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_reply_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'ai',
    "aiModel" TEXT NOT NULL DEFAULT 'gemini-2.0-flash-lite',
    "customPrompt" TEXT,
    "aiDelay" INTEGER NOT NULL DEFAULT 2,
    "onlyFromFollowers" BOOLEAN NOT NULL DEFAULT false,
    "excludeKeywords" TEXT,
    "maxRepliesPerHour" INTEGER NOT NULL DEFAULT 30,
    "monitorAllPosts" BOOLEAN NOT NULL DEFAULT true,
    "selectedPostIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_reply_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_replies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'threads',
    "keyword" TEXT NOT NULL,
    "replyText" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keyword_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'threads',
    "postId" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "conversationId" TEXT,
    "fromUsername" TEXT NOT NULL,
    "replyText" TEXT NOT NULL,
    "ourReplyId" TEXT,
    "ourReplyText" TEXT,
    "replyMode" TEXT,
    "aiPrompt" TEXT,
    "aiModel" TEXT,
    "matchedKeyword" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "repliedAt" TIMESTAMP(3),
    "hideStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "fromUsername" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "replyText" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_identifier_value_key" ON "verifications"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "threads_accounts_userId_key" ON "threads_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_accounts_userId_instagramId_key" ON "instagram_accounts"("userId", "instagramId");

-- CreateIndex
CREATE INDEX "posts_userId_idx" ON "posts"("userId");

-- CreateIndex
CREATE INDEX "posts_status_idx" ON "posts"("status");

-- CreateIndex
CREATE INDEX "posts_scheduledAt_idx" ON "posts"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "auto_reply_settings_userId_platform_key" ON "auto_reply_settings"("userId", "platform");

-- CreateIndex
CREATE INDEX "keyword_replies_userId_idx" ON "keyword_replies"("userId");

-- CreateIndex
CREATE INDEX "keyword_replies_enabled_idx" ON "keyword_replies"("enabled");

-- CreateIndex
CREATE INDEX "keyword_replies_platform_idx" ON "keyword_replies"("platform");

-- CreateIndex
CREATE INDEX "reply_history_userId_idx" ON "reply_history"("userId");

-- CreateIndex
CREATE INDEX "reply_history_postId_idx" ON "reply_history"("postId");

-- CreateIndex
CREATE INDEX "reply_history_status_idx" ON "reply_history"("status");

-- CreateIndex
CREATE INDEX "reply_history_platform_idx" ON "reply_history"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "reply_history_platform_replyId_key" ON "reply_history"("platform", "replyId");

-- CreateIndex
CREATE INDEX "message_history_userId_idx" ON "message_history"("userId");

-- CreateIndex
CREATE INDEX "message_history_conversationId_idx" ON "message_history"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "message_history_platform_messageId_key" ON "message_history"("platform", "messageId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads_accounts" ADD CONSTRAINT "threads_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_accounts" ADD CONSTRAINT "instagram_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_reply_settings" ADD CONSTRAINT "auto_reply_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
