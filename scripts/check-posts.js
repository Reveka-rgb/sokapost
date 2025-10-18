const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  console.log('=== POSTS DATA ===')
  posts.forEach(post => {
    console.log('\nPost ID:', post.id)
    console.log('Content:', post.content.substring(0, 50))
    console.log('Status:', post.status)
    console.log('scheduledAt:', post.scheduledAt)
    console.log('scheduledAt type:', typeof post.scheduledAt)
    console.log('scheduledAt is Date?:', post.scheduledAt instanceof Date)
    console.log('createdAt:', post.createdAt)
    console.log('---')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
