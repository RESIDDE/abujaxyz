-- Create tables equivalent to the Prisma schema

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "avatar" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Session" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expires" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Thread" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subject" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Email" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "messageId" TEXT UNIQUE,
  "fromAddress" TEXT NOT NULL,
  "fromName" TEXT,
  "toAddresses" TEXT NOT NULL, -- JSON array stored as string
  "ccAddresses" TEXT NOT NULL DEFAULT '[]',
  "bccAddresses" TEXT NOT NULL DEFAULT '[]',
  "subject" TEXT NOT NULL,
  "bodyText" TEXT,
  "bodyHtml" TEXT,
  "folder" TEXT NOT NULL DEFAULT 'INBOX',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "isStarred" BOOLEAN NOT NULL DEFAULT false,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "threadId" UUID REFERENCES "Thread"("id") ON DELETE SET NULL
);

CREATE INDEX "Email_userId_folder_idx" ON "Email"("userId", "folder");
CREATE INDEX "Email_threadId_idx" ON "Email"("threadId");

CREATE TABLE "Attachment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "emailId" UUID NOT NULL REFERENCES "Email"("id") ON DELETE CASCADE,
  "filename" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "content" TEXT -- base64 encoded
);

CREATE TABLE "Draft" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "toAddresses" TEXT NOT NULL DEFAULT '[]',
  "ccAddresses" TEXT NOT NULL DEFAULT '[]',
  "bccAddresses" TEXT NOT NULL DEFAULT '[]',
  "subject" TEXT NOT NULL DEFAULT '',
  "bodyHtml" TEXT NOT NULL DEFAULT '',
  "bodyText" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
