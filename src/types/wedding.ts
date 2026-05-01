export type GuestCategory =
  | "FAMILY"
  | "RELATIVE"
  | "FRIEND"
  | "VIP"
  | "COLLEAGUE"
  | "OTHER";
export type GuestSide = "GROOM" | "BRIDE" | "BOTH";
export type RsvpStatus = "PENDING" | "CONFIRMED" | "DECLINED";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface Wedding {
  id: string;
  slug: string;
  groomName: string;
  brideName: string;
  groomFullName?: string;
  brideFullName?: string;
  groomParents?: string;
  brideParents?: string;
  eventDate: string;
  venueName?: string;
  venueAddress?: string;
  venueMapUrl?: string;
  quoteText?: string;
  quoteSource?: string;
  giftInfo?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  currency: string;
  timezone: string;
}

export interface WeddingEvent {
  id: string;
  weddingId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  sortOrder: number;
}

export interface Guest {
  id: string;
  weddingId: string;
  name: string;
  phone?: string;
  email?: string;
  category: GuestCategory;
  invitedPax: number;
  side: GuestSide;
  tableNumber?: string;
  notes?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  rsvpStatus: RsvpStatus;
  /** Pax confirmed via the linked RSVP (0 if no confirmed RSVP). */
  confirmedPax: number;
  /** True if this guest record was auto-created from a public RSVP. */
  fromRsvp: boolean;
  /** True when this Guest has a matching RSVP row (guestId → guest). Unlinked guests surface as UI PENDING without an RSVP submission. */
  hasLinkedRsvp: boolean;
  createdAt: string;
}

export interface Rsvp {
  id: string;
  weddingId: string;
  guestId?: string;
  name: string;
  phone?: string;
  email?: string;
  attendance: RsvpStatus;
  paxCount: number;
  /** Whose side — mirrors Guest.side. */
  side?: GuestSide;
  /** Mirrors Guest.category. */
  category?: GuestCategory;
  message?: string;
  submittedAt: string;
}

export interface BudgetCategory {
  id: string;
  weddingId: string;
  name: string;
  allocatedAmount: number;
  /** Sum of `paidAmount` across all expenses (cash actually paid). */
  totalSpent: number;
  /** Sum of `amount` across all expenses (committed / promised). */
  committedAmount: number;
  /** Number of expenses in this category. */
  expenseCount: number;
}

export interface Expense {
  id: string;
  weddingId: string;
  categoryId: string;
  categoryName: string;
  vendorId?: string;
  vendorName?: string;
  description: string;
  amount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
}

export interface Vendor {
  id: string;
  weddingId: string;
  name: string;
  serviceType: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  contractAmount: number;
  paidAmount: number;
  notes?: string;
}

export interface Invoice {
  id: string;
  weddingId: string;
  vendorId?: string;
  vendorName?: string;
  invoiceNumber?: string;
  amount: number;
  dueDate?: string;
  paymentStatus: PaymentStatus;
  category?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  notes?: string;
  createdAt: string;
}

export interface TimelineTask {
  id: string;
  weddingId: string;
  title: string;
  description?: string;
  category?: string;
  dueDate?: string;
  status: TaskStatus;
  vendorName?: string;
  notes?: string;
  sortOrder: number;
}

export interface GuestFilters {
  category: GuestCategory | "all";
  rsvpStatus: RsvpStatus | "all";
  side: GuestSide | "all";
  search: string;
}

export interface RsvpFilters {
  attendance: RsvpStatus | "all";
  search: string;
}

export interface VendorFilters {
  serviceType: string | "all";
  search: string;
}

export interface InvoiceFilters {
  paymentStatus: PaymentStatus | "all";
  search: string;
}
