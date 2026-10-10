export type UserRole = 'customer' | 'admin';

export type ServiceUnit = 'kg' | 'item' | 'paket';

export type HandoffMethod = 'drop_off' | 'pickup_delivery';

export type OrderStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'picked_up'
  | 'washing'
  | 'ironing'
  | 'quality_check'
  | 'ready_for_delivery'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type PaymentStatus =
  | 'unpaid'
  | 'pending_verification'
  | 'partially_paid'
  | 'paid';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  district: string;
  postalCode: string;
  notes: string;
  isDefault: boolean;
}

export interface LaundryService {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  pricePerUnit: number;
  unit: ServiceUnit;
  minQuantity: number;
  estimatedHours: number;
  isActive: boolean;
  imageKey: 'wash_fold' | 'steam_iron' | 'bedding_care' | 'express_care';
  features: string[];
}

export interface ServiceAddon {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
}

export interface OrderAddonItem {
  addonId: string;
  name: string;
  priceSnapshot: number;
  quantity: number;
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  status: OrderStatus;
  note: string;
  changedByUserId: string;
  changedByName: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  paymentMethod: string;
  amountDue: number;
  amountRecorded: number;
  status: PaymentStatus;
  transactionReference: string;
  recordedByName: string;
  paidAt: string | null;
  updatedAt: string;
}

export interface LaundryOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceId: string;
  serviceNameSnapshot: string;
  serviceUnitSnapshot: ServiceUnit;
  unitPriceSnapshot: number;
  minQuantitySnapshot: number;
  estimatedQuantity: number;
  actualQuantity: number | null;
  addons: OrderAddonItem[];
  handoffMethod: HandoffMethod;
  pickupAddress: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  customerNotes: string;
  internalAdminNotes: string;
  priceAdjustmentReason: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  subtotalEstimated: number;
  addonsTotal: number;
  deliveryFee: number;
  discountAmount: number;
  estimatedTotal: number;
  finalTotal: number | null;
  estimatedCompletionAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: OrderStatusHistoryItem[];
  payment: PaymentRecord;
}

export interface WebsiteBenefitItem {
  id: string;
  title: string;
  description: string;
}

export interface WebsiteTestimonialItem {
  id: string;
  name: string;
  role: string;
  comment: string;
  service: string;
}

export interface WebsiteContentConfig {
  heroTitleLine1: string;
  heroTitleHighlight: string;
  heroDescription: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  aboutTitle: string;
  aboutDescription: string;
  promoBannerTitle: string;
  promoBannerDescription: string;
  benefits: WebsiteBenefitItem[];
  testimonials: WebsiteTestimonialItem[];
}

export interface BusinessSettings {
  businessName: string;
  whatsappNumber: string;
  emailContact: string;
  address: string;
  mapsUrl: string;
  operatingHours: string;
  pickupDeliveryEnabled: boolean;
  pickupDeliveryFee: number;
  freeDeliveryMinOrder: number;
  isDemoPricingNotice: boolean;
  websiteContent: WebsiteContentConfig;
}

export interface AdminActivityLog {
  id: string;
  adminUserId: string;
  adminName: string;
  actionType: string;
  targetReference: string;
  details: string;
  createdAt: string;
}

export interface CreateOrderInput {
  serviceId: string;
  estimatedQuantity: number;
  selectedAddonIds: string[];
  handoffMethod: HandoffMethod;
  pickupAddress: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  customerNotes: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
}
