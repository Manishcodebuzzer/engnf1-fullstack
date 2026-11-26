import { PrismaClient, Role, TicketCategory, TicketPriority, TicketStatus, ResourceType, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 12;

export async function main() {
  console.log('🌱 Starting TriageSync database seed...');

  // ── 1. Seed Accounts ────────────────────────────────────────────────────────
  console.log('  Seeding required assessment accounts...');
  const adminPasswordHash = await bcrypt.hash('Admin@123', BCRYPT_SALT_ROUNDS);
  const userPasswordHash = await bcrypt.hash('User@123', BCRYPT_SALT_ROUNDS);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@triagesync.test' },
    update: {
      name: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
    create: {
      name: 'System Administrator',
      email: 'admin@triagesync.test',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@triagesync.test' },
    update: {
      name: 'Standard User',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
    create: {
      name: 'Standard User',
      email: 'user@triagesync.test',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  console.log(`    ✓ Admin: ${adminUser.email} (Role: ${adminUser.role})`);
  console.log(`    ✓ User:  ${regularUser.email} (Role: ${regularUser.role})`);

  // ── 2. Seed Resources (At least 6: >=2 ROOM, >=2 LAB, >=2 EQUIPMENT, >=1 Inactive)
  console.log('  Seeding facility resources...');
  const seedResources = [
    {
      name: 'Executive Boardroom Alpha',
      type: ResourceType.ROOM,
      capacity: 24,
      description: 'Equipped with dual 4K video conferencing displays, spatial mic array, and whiteboard.',
      isActive: true,
    },
    {
      name: 'Innovation Conference Suite B',
      type: ResourceType.ROOM,
      capacity: 12,
      description: 'Medium team collaboration suite with interactive smart board and wireless casting.',
      isActive: true,
    },
    {
      name: 'Hardware Diagnostics Lab 1',
      type: ResourceType.LAB,
      capacity: 10,
      description: 'ESD-safe workstations, digital oscilloscopes, soldering stations, and logic analyzers.',
      isActive: true,
    },
    {
      name: 'Robotics & Automation Lab 2',
      type: ResourceType.LAB,
      capacity: 8,
      description: 'Dedicated test track, robotic arm assembly benches, and high-current power supplies.',
      isActive: true,
    },
    {
      name: 'Decommissioned Prototype Lab C',
      type: ResourceType.LAB,
      capacity: 6,
      description: 'Facility currently undergoing ventilation overhaul and electrical recertification.',
      isActive: false, // Inactive resource requirement
    },
    {
      name: 'High-Speed Network Analyzer Pro',
      type: ResourceType.EQUIPMENT,
      capacity: 2,
      description: 'Fluke 10Gbps optical/copper packet latency analyzer and certification kit.',
      isActive: true,
    },
    {
      name: 'Thermal Imaging Diagnostic Camera',
      type: ResourceType.EQUIPMENT,
      capacity: 1,
      description: 'FLIR handheld thermal inspection kit for circuit hot-spot troubleshooting.',
      isActive: true,
    },
  ];

  const resourceMap = new Map<string, string>();
  for (const r of seedResources) {
    const upserted = await prisma.resource.upsert({
      where: { name: r.name },
      update: {
        type: r.type,
        capacity: r.capacity,
        description: r.description,
        isActive: r.isActive,
      },
      create: r,
    });
    resourceMap.set(r.name, upserted.id);
  }
  console.log(`    ✓ Upserted ${seedResources.length} resources (${resourceMap.size} active/inactive)`);

  // ── 3. Seed Tickets (At least 15 covering all categories, priorities, XSS, and reviewed)
  console.log('  Seeding support tickets...');
  const seedTickets = [
    // 1. BILLING / URGENT (Reviewed, Human Override)
    {
      externalId: 'EXT-1001',
      subject: 'Critical: Double charge of $4,500 on enterprise subscription invoice',
      body: 'Our accounting department noticed our corporate card was charged twice for the annual tier. Please refund the duplicate invoice charge urgently.',
      autoCategory: TicketCategory.BILLING,
      category: TicketCategory.BILLING,
      priority: TicketPriority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      isHumanOverride: false,
      isReviewed: true,
      assigneeId: adminUser.id,
    },
    // 2. LOGIN / URGENT
    {
      externalId: 'EXT-1002',
      subject: 'Entire team locked out: 2FA authenticator broken after update',
      body: 'We are locked out of our workspace. The 2fa TOTP code is failing for all engineers on sign in.',
      autoCategory: TicketCategory.LOGIN,
      category: TicketCategory.LOGIN,
      priority: TicketPriority.URGENT,
      status: TicketStatus.OPEN,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 3. DELIVERY / HIGH
    {
      externalId: 'EXT-1003',
      subject: 'Replacement motherboard shipping package has not arrived',
      body: 'Our delivery tracking shows delayed status and the shipping package has not arrived for 5 days.',
      autoCategory: TicketCategory.DELIVERY,
      category: TicketCategory.DELIVERY,
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 4. BUG / HIGH (Reviewed, Overridden)
    {
      externalId: 'EXT-1004',
      subject: 'Application crash with 500 internal server error during database export',
      body: 'When downloading report logs, the backend throws an unhandled exception 500 error and broken page.',
      autoCategory: TicketCategory.BUG,
      category: TicketCategory.BUG,
      priority: TicketPriority.HIGH,
      status: TicketStatus.RESOLVED,
      isHumanOverride: true,
      isReviewed: true,
      assigneeId: adminUser.id,
    },
    // 5. FEATURE_REQUEST / LOW
    {
      externalId: 'EXT-1005',
      subject: 'Dark mode theme preference for mobile dashboard view',
      body: 'Would love to have an option to switch to a native dark theme layout in user settings.',
      autoCategory: TicketCategory.FEATURE_REQUEST,
      category: TicketCategory.FEATURE_REQUEST,
      priority: TicketPriority.LOW,
      status: TicketStatus.OPEN,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 6. XSS PAYLOAD TEST TICKET (Security Verification)
    {
      externalId: 'EXT-1006',
      subject: 'Malicious XSS vector in subject: <script>alert("XSS_TEST")</script><b onmouseover=alert(1)>Hover</b>',
      body: 'Testing client escaping with payload: <img src="invalid" onerror="alert(document.cookie)"/>\n<svg/onload=alert`XSS`>\n<script>window.pwned=true</script>\nEscaped plain text verification.',
      autoCategory: TicketCategory.BUG,
      category: TicketCategory.BUG,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 7. BILLING / MEDIUM (Reviewed)
    {
      externalId: 'EXT-1007',
      subject: 'Need updated tax invoice and VAT registration certificate',
      body: 'Could you update our billing contact and re-send the monthly payment invoice with our EU VAT ID?',
      autoCategory: TicketCategory.BILLING,
      category: TicketCategory.BILLING,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.CLOSED,
      isHumanOverride: false,
      isReviewed: true,
      assigneeId: adminUser.id,
    },
    // 8. LOGIN / MEDIUM
    {
      externalId: 'EXT-1008',
      subject: 'Reset password link email expired or not received',
      body: 'I requested a password reset link but the login recovery email has not arrived in my inbox.',
      autoCategory: TicketCategory.LOGIN,
      category: TicketCategory.LOGIN,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 9. DELIVERY / MEDIUM
    {
      externalId: 'EXT-1009',
      subject: 'Change delivery address for pending hardware shipment',
      body: 'We moved to Building 4. Please redirect the tracking package shipping delivery address before arrival.',
      autoCategory: TicketCategory.DELIVERY,
      category: TicketCategory.DELIVERY,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 10. BUG / URGENT
    {
      externalId: 'EXT-1010',
      subject: 'Production down: memory leak crashing API clusters in production',
      body: 'Immediate assistance required! Our production down event was triggered due to node crash error exception.',
      autoCategory: TicketCategory.BUG,
      category: TicketCategory.BUG,
      priority: TicketPriority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: adminUser.id,
    },
    // 11. FEATURE_REQUEST / MEDIUM
    {
      externalId: 'EXT-1011',
      subject: 'Webhook notifications on booking approval and cancellation',
      body: 'We would like to configure an outgoing webhook to post alerts directly to our Slack incident channel.',
      autoCategory: TicketCategory.FEATURE_REQUEST,
      category: TicketCategory.FEATURE_REQUEST,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 12. BILLING / LOW
    {
      externalId: 'EXT-1012',
      subject: 'Inquiry regarding annual prepaid discount payment pricing',
      body: 'What are the volume discounts available if we switch from monthly payment to an upfront annual invoice?',
      autoCategory: TicketCategory.BILLING,
      category: TicketCategory.BILLING,
      priority: TicketPriority.LOW,
      status: TicketStatus.OPEN,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 13. LOGIN / LOW
    {
      externalId: 'EXT-1013',
      subject: 'SSO Okta single sign in integration request',
      body: 'We want to configure SAML single sign on login for our corporate domain employees.',
      autoCategory: TicketCategory.LOGIN,
      category: TicketCategory.LOGIN,
      priority: TicketPriority.LOW,
      status: TicketStatus.OPEN,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 14. DELIVERY / LOW
    {
      externalId: 'EXT-1014',
      subject: 'Proof of delivery signature confirmation copy',
      body: 'Our audit team requires a copy of the courier tracking carrier delivery signature slip for asset verification.',
      autoCategory: TicketCategory.DELIVERY,
      category: TicketCategory.DELIVERY,
      priority: TicketPriority.LOW,
      status: TicketStatus.RESOLVED,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 15. FEATURE_REQUEST / HIGH
    {
      externalId: 'EXT-1015',
      subject: 'Bulk ticket export and automated triage rules API',
      body: 'Requesting API endpoints for batch ticket classification overrides and CSV exports to integrate with Jira.',
      autoCategory: TicketCategory.FEATURE_REQUEST,
      category: TicketCategory.FEATURE_REQUEST,
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
    // 16. BUG / LOW
    {
      externalId: 'EXT-1016',
      subject: 'Minor UI misalignment on mobile button footer',
      body: 'The cancel button text slightly wraps on 320px screens. Minor visual glitch error on small displays.',
      autoCategory: TicketCategory.BUG,
      category: TicketCategory.BUG,
      priority: TicketPriority.LOW,
      status: TicketStatus.OPEN,
      isHumanOverride: false,
      isReviewed: false,
      assigneeId: null,
    },
  ];

  const ticketMap = new Map<string, string>();
  for (const t of seedTickets) {
    const upserted = await prisma.ticket.upsert({
      where: { externalId: t.externalId },
      update: {
        subject: t.subject,
        body: t.body,
        priority: t.priority,
        status: t.status,
        isReviewed: t.isReviewed,
        isHumanOverride: t.isHumanOverride,
        assigneeId: t.assigneeId,
      },
      create: t,
    });
    ticketMap.set(t.externalId, upserted.id);

    // If reviewed or overridden, seed an audit event if none exists
    if (t.isReviewed || t.isHumanOverride) {
      const existingEvents = await prisma.ticketEvent.findMany({
        where: { ticketId: upserted.id },
      });
      if (existingEvents.length === 0) {
        await prisma.ticketEvent.create({
          data: {
            ticketId: upserted.id,
            field: 'category',
            oldValue: t.autoCategory,
            newValue: t.category,
            actor: 'admin@triagesync.test',
          },
        });
      }
    }
  }
  console.log(`    ✓ Upserted ${seedTickets.length} tickets across all categories and priorities`);

  // ── 4. Seed Representative Bookings ─────────────────────────────────────────
  console.log('  Seeding representative bookings...');
  const boardRoomId = resourceMap.get('Executive Boardroom Alpha');
  const labId = resourceMap.get('Hardware Diagnostics Lab 1');

  if (boardRoomId && labId) {
    const d1 = new Date();
    d1.setUTCDate(d1.getUTCDate() + 3);
    d1.setUTCHours(10, 0, 0, 0);

    const d1End = new Date(d1.getTime() + 60 * 60 * 1000);

    const d2 = new Date();
    d2.setUTCDate(d2.getUTCDate() + 4);
    d2.setUTCHours(14, 0, 0, 0);
    const d2End = new Date(d2.getTime() + 90 * 60 * 1000);

    // Check existing to maintain idempotency
    const existingBookings = await prisma.booking.findMany({
      where: {
        userId: regularUser.id,
        resourceId: { in: [boardRoomId, labId] },
      },
    });

    if (existingBookings.length === 0) {
      await prisma.booking.create({
        data: {
          resourceId: boardRoomId,
          userId: regularUser.id,
          ticketId: ticketMap.get('EXT-1001'),
          startTime: d1,
          endTime: d1End,
          purpose: 'Billing reconciliation meeting with vendor audit staff',
          status: BookingStatus.APPROVED,
        },
      });

      await prisma.booking.create({
        data: {
          resourceId: labId,
          userId: regularUser.id,
          ticketId: ticketMap.get('EXT-1004'),
          startTime: d2,
          endTime: d2End,
          purpose: 'Diagnostic memory dump inspection for database crash ticket',
          status: BookingStatus.PENDING,
        },
      });
      console.log('    ✓ Created 2 seed bookings (APPROVED & PENDING)');
    } else {
      console.log('    ✓ Seed bookings already exist, preserved.');
    }
  }

  console.log('\n✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error executing database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
