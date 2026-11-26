import { TicketCategory, TicketPriority } from '@prisma/client';

export interface ClassificationResult {
  category: TicketCategory;
  priority: TicketPriority;
}

// Category keyword dictionary (all checked in lowercase)
const CATEGORY_RULES: { category: TicketCategory; keywords: string[] }[] = [
  {
    category: TicketCategory.LOGIN,
    keywords: ['password', '2fa', 'sign in', 'locked out', 'login'],
  },
  {
    category: TicketCategory.BILLING,
    keywords: ['refund', 'invoice', 'charge', 'payment'],
  },
  {
    category: TicketCategory.DELIVERY,
    keywords: ['package', 'arrived', 'shipping', 'tracking', 'delivery'],
  },
  {
    category: TicketCategory.BUG,
    keywords: ['crash', 'error', '500', 'exception', 'broken'],
  },
];

// Priority keyword dictionary (checked in strict hierarchical order: URGENT -> HIGH -> MEDIUM)
const URGENT_KEYWORDS = ['urgent', 'production down', 'locked out'];
const HIGH_KEYWORDS = ['error', 'refund', 'not arrived'];

/**
 * Deterministically classifies ticket category and priority based on text content.
 * Matches case-insensitively across both subject and body.
 */
export const classifyTicket = (subject: string, body: string): ClassificationResult => {
  const combinedText = `${subject || ''} ${body || ''}`.toLowerCase();

  // 1. Determine Category
  let category: TicketCategory = TicketCategory.FEATURE_REQUEST; // Default category
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => combinedText.includes(keyword))) {
      category = rule.category;
      break;
    }
  }

  // 2. Determine Priority
  let priority: TicketPriority = TicketPriority.MEDIUM; // Default priority
  if (URGENT_KEYWORDS.some((keyword) => combinedText.includes(keyword))) {
    priority = TicketPriority.URGENT;
  } else if (HIGH_KEYWORDS.some((keyword) => combinedText.includes(keyword))) {
    priority = TicketPriority.HIGH;
  }

  return { category, priority };
};
