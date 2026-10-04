import { PrismaClient, UserRole, RoomStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Users
  const defaultPassword = await bcrypt.hash('Password123!', 10);

  const users = [
    {
      email: 'admin@hotel.com',
      name: 'System Admin',
      passwordHash: defaultPassword,
      role: UserRole.SUPER_ADMIN,
    },
    {
      email: 'frontdesk@hotel.com',
      name: 'Front Desk Agent',
      passwordHash: defaultPassword,
      role: UserRole.FRONT_DESK,
    },
    {
      email: 'cleaner@hotel.com',
      name: 'Housekeeping Staff',
      passwordHash: defaultPassword,
      role: UserRole.HOUSEKEEPING,
    },
    {
      email: 'guest@example.com',
      name: 'John Guest',
      passwordHash: defaultPassword,
      role: UserRole.GUEST,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }
  console.log('✅ Users seeded');

  // 2. Seed RoomTypes
  const roomTypesData = [
    {
      name: 'Deluxe King Suite',
      slug: 'deluxe-king',
      description: 'Spacious suite with a king-sized bed and premium amenities.',
      basePrice: 220.0,
      capacity: 2,
      amenities: ['King Bed', 'Free Wi-Fi', 'Mini Bar', 'Ocean View'],
      images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427'],
    },
    {
      name: 'Ocean View Double',
      slug: 'ocean-double',
      description: 'Comfortable double room with breathtaking ocean view.',
      basePrice: 310.0,
      capacity: 4,
      amenities: ['2 Double Beds', 'Free Wi-Fi', 'Balcony', 'TV'],
      images: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a'],
    },
    {
      name: 'Executive Presidential',
      slug: 'exec-president',
      description: 'Luxury presidential suite with private lounge and jacuzzi.',
      basePrice: 650.0,
      capacity: 2,
      amenities: ['King Bed', 'Jacuzzi', 'Private Lounge', 'Butler Service'],
      images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'],
    },
  ];

  const createdRoomTypes: Record<string, string> = {};

  for (const rt of roomTypesData) {
    const roomType = await prisma.roomType.upsert({
      where: { slug: rt.slug },
      update: {},
      create: rt,
    });
    createdRoomTypes[rt.slug] = roomType.id;
  }
  console.log('✅ RoomTypes seeded');

  // 3. Seed Rooms (6 rooms across 3 floors)
  const roomsData = [
    { roomNumber: '101', floor: 1, status: RoomStatus.VACANT_CLEAN, roomTypeId: createdRoomTypes['deluxe-king'] },
    { roomNumber: '102', floor: 1, status: RoomStatus.VACANT_CLEAN, roomTypeId: createdRoomTypes['deluxe-king'] },
    { roomNumber: '201', floor: 2, status: RoomStatus.VACANT_CLEAN, roomTypeId: createdRoomTypes['ocean-double'] },
    { roomNumber: '202', floor: 2, status: RoomStatus.VACANT_CLEAN, roomTypeId: createdRoomTypes['ocean-double'] },
    { roomNumber: '301', floor: 3, status: RoomStatus.VACANT_CLEAN, roomTypeId: createdRoomTypes['exec-president'] },
    { roomNumber: '302', floor: 3, status: RoomStatus.VACANT_CLEAN, roomTypeId: createdRoomTypes['exec-president'] },
  ];

  for (const room of roomsData) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: {},
      create: room,
    });
  }
  console.log('✅ Rooms seeded');

  // 4. Seed Document Chunks with 1536-dim dummy vectors for RAG
  const dummyVector = `[${new Array(1536).fill(0).join(',')}]`;

  const docChunks = [
    {
      id: 'doc-chunk-cancellation-policy',
      title: 'Hotel Cancellation Policy',
      content: 'Guests may cancel their reservation up to 48 hours prior to check-in for a full refund.',
      metadata: { category: 'policies', updated: '2026-01-01' },
    },
    {
      id: 'doc-chunk-breakfast-times',
      title: 'Breakfast Times',
      content: 'Complimentary breakfast is served daily from 6:30 AM to 10:30 AM in the main dining hall.',
      metadata: { category: 'services', updated: '2026-01-01' },
    },
    {
      id: 'doc-chunk-late-checkout',
      title: 'Late Checkout Rules',
      content: 'Late checkout up to 2:00 PM is available upon request for an additional fee of $50.',
      metadata: { category: 'policies', updated: '2026-01-01' },
    },
  ];

  for (const chunk of docChunks) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DocumentChunk" (id, title, content, metadata, embedding, "createdAt")
       VALUES ($1, $2, $3, $4::jsonb, $5::vector, NOW())
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content`,
      chunk.id,
      chunk.title,
      chunk.content,
      JSON.stringify(chunk.metadata),
      dummyVector
    );
  }
  console.log('✅ DocumentChunks (RAG vector embeddings) seeded');

  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
