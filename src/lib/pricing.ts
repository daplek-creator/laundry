import {
  BusinessSettings,
  HandoffMethod,
  LaundryService,
  OrderAddonItem,
  OrderStatus,
  PaymentStatus,
  ServiceAddon,
} from '../types/domain.ts';

export interface PriceBreakdown {
  billableQuantity: number;
  unitPriceSnapshot: number;
  subtotalEstimated: number;
  addonItems: OrderAddonItem[];
  addonsTotal: number;
  deliveryFee: number;
  discountAmount: number;
  estimatedTotal: number;
}

/**
 * Authoritative Price Calculation Engine
 * Enforces minimum order quantity, add-ons pricing, and delivery fee rules.
 */
export function calculateAuthoritativeOrderPrice(params: {
  service: LaundryService;
  requestedQuantity: number;
  selectedAddons: ServiceAddon[];
  handoffMethod: HandoffMethod;
  settings: BusinessSettings;
}): PriceBreakdown {
  const { service, requestedQuantity, selectedAddons, handoffMethod, settings } = params;

  if (!service.isActive) {
    throw new Error(`Layanan "${service.name}" sedang tidak aktif.`);
  }

  const safeQty = Number.isFinite(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : service.minQuantity;
  // Tagihan minimum mengikuti minQuantity layanan
  const billableQuantity = Math.max(safeQty, service.minQuantity);

  const subtotalEstimated = Math.round(billableQuantity * service.pricePerUnit);

  const addonItems: OrderAddonItem[] = selectedAddons
    .filter((a) => a.isActive)
    .map((addon) => ({
      addonId: addon.id,
      name: addon.name,
      priceSnapshot: addon.price,
      quantity: 1,
    }));

  const addonsTotal = addonItems.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);

  let deliveryFee = 0;
  if (handoffMethod === 'pickup_delivery') {
    if (!settings.pickupDeliveryEnabled) {
      throw new Error('Layanan antar-jemput sedang tidak tersedia saat ini.');
    }
    const baseSubtotal = subtotalEstimated + addonsTotal;
    deliveryFee = baseSubtotal >= settings.freeDeliveryMinOrder ? 0 : settings.pickupDeliveryFee;
  }

  const discountAmount = 0;
  const estimatedTotal = Math.max(0, subtotalEstimated + addonsTotal + deliveryFee - discountAmount);

  return {
    billableQuantity,
    unitPriceSnapshot: service.pricePerUnit,
    subtotalEstimated,
    addonItems,
    addonsTotal,
    deliveryFee,
    discountAmount,
    estimatedTotal,
  };
}

/**
 * Recalculates confirmed final total when admin inputs actual weight/quantity or adjustment
 */
export function calculateFinalConfirmedPrice(params: {
  unitPriceSnapshot: number;
  minQuantitySnapshot: number;
  actualQuantity: number;
  addonsTotal: number;
  deliveryFee: number;
  discountAmount: number;
  freeDeliveryMinOrder: number;
  handoffMethod: HandoffMethod;
  standardDeliveryFee: number;
}): { billableActualQty: number; recalculatedSubtotal: number; recalculatedDelivery: number; finalTotal: number } {
  const billableActualQty = Math.max(params.actualQuantity, params.minQuantitySnapshot);
  const recalculatedSubtotal = Math.round(billableActualQty * params.unitPriceSnapshot);

  let recalculatedDelivery = 0;
  if (params.handoffMethod === 'pickup_delivery') {
    recalculatedDelivery =
      recalculatedSubtotal + params.addonsTotal >= params.freeDeliveryMinOrder ? 0 : params.standardDeliveryFee;
  }

  const finalTotal = Math.max(
    0,
    recalculatedSubtotal + params.addonsTotal + recalculatedDelivery - params.discountAmount
  );

  return {
    billableActualQty,
    recalculatedSubtotal,
    recalculatedDelivery,
    finalTotal,
  };
}

/**
 * State Machine for Order Status Transitions
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_confirmation: 'Menunggu Konfirmasi',
  confirmed: 'Pesanan Dikonfirmasi',
  picked_up: 'Diterima / Dijemput',
  washing: 'Proses Pencucian',
  ironing: 'Setrika Uap & Finishing',
  quality_check: 'Pemeriksaan Kualitas',
  ready_for_delivery: 'Siap Diambil / Diantar',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  rejected: 'Ditolak Admin',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Belum Dibayar',
  pending_verification: 'Menunggu Verifikasi',
  partially_paid: 'Dibayar Sebagian',
  paid: 'Lunas',
};

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_confirmation: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['picked_up', 'washing', 'cancelled'],
  picked_up: ['washing', 'cancelled'],
  washing: ['ironing', 'quality_check'],
  ironing: ['quality_check'],
  quality_check: ['ready_for_delivery', 'ironing'],
  ready_for_delivery: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
};

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  return ALLOWED_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getAllowedNextStatuses(current: OrderStatus): OrderStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[current] || [];
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTimeID(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function formatDateID(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}
