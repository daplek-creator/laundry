import {
  calculateAuthoritativeOrderPrice,
  calculateFinalConfirmedPrice,
  canTransitionOrderStatus,
} from '../lib/pricing.ts';
import {
  INITIAL_ADDONS,
  INITIAL_BUSINESS_SETTINGS,
  INITIAL_SERVICES,
} from '../data/seedData.ts';

export interface VerificationResult {
  name: string;
  passed: boolean;
  detail: string;
}

/**
 * Automated verification suite for pricing rules, minimum quantity enforcement,
 * free delivery threshold, and status state machine transitions.
 */
export function runBusinessLogicTests(): VerificationResult[] {
  const results: VerificationResult[] = [];
  const regularService = INITIAL_SERVICES[0]; // Cuci Kering (Rp8.000/kg, min 3 kg)

  // Test 1: Minimum Quantity Enforcement
  const calcBelowMin = calculateAuthoritativeOrderPrice({
    service: regularService,
    requestedQuantity: 1.5, // Below 3kg minimum
    selectedAddons: [],
    handoffMethod: 'drop_off',
    settings: INITIAL_BUSINESS_SETTINGS,
  });
  results.push({
    name: 'Validasi Kuantitas Minimum (Min. 3 Kg)',
    passed: calcBelowMin.billableQuantity === 3 && calcBelowMin.subtotalEstimated === 24000,
    detail: `Input 1.5 kg ditagihkan minimum ${calcBelowMin.billableQuantity} kg = Rp${calcBelowMin.subtotalEstimated}`,
  });

  // Test 2: Delivery Fee Applied Below Free Threshold
  const calcWithDelivery = calculateAuthoritativeOrderPrice({
    service: regularService,
    requestedQuantity: 4, // 4 * 8000 = 32000 (< 100000 threshold)
    selectedAddons: [INITIAL_ADDONS[3]], // +5000 = 37000
    handoffMethod: 'pickup_delivery',
    settings: INITIAL_BUSINESS_SETTINGS,
  });
  results.push({
    name: 'Kalkulasi Biaya Antar-Jemput & Add-on',
    passed:
      calcWithDelivery.deliveryFee === 15000 && calcWithDelivery.estimatedTotal === 52000,
    detail: `Subtotal Rp32.000 + Addon Rp5.000 + Kurir Rp15.000 = Rp${calcWithDelivery.estimatedTotal}`,
  });

  // Test 3: Free Delivery Threshold (>= Rp100.000)
  const calcFreeDelivery = calculateAuthoritativeOrderPrice({
    service: regularService,
    requestedQuantity: 13, // 13 * 8000 = 104000 (>= 100000 threshold)
    selectedAddons: [],
    handoffMethod: 'pickup_delivery',
    settings: INITIAL_BUSINESS_SETTINGS,
  });
  results.push({
    name: 'Pembebasan Biaya Antar-Jemput di Atas Batas Minimum',
    passed:
      calcFreeDelivery.deliveryFee === 0 && calcFreeDelivery.estimatedTotal === 104000,
    detail: `Subtotal Rp104.000 >= Rp100.000 -> Kurir Rp${calcFreeDelivery.deliveryFee}`,
  });

  // Test 4: Final Confirmed Price Recalculation on Actual Weight
  const finalCalc = calculateFinalConfirmedPrice({
    unitPriceSnapshot: 12000,
    minQuantitySnapshot: 3,
    actualQuantity: 5.5,
    addonsTotal: 5000,
    deliveryFee: 15000,
    discountAmount: 0,
    freeDeliveryMinOrder: 100000,
    handoffMethod: 'pickup_delivery',
    standardDeliveryFee: 15000,
  });
  results.push({
    name: 'Rekalkulasi Tagihan Akhir Berdasarkan Berat Aktual (5.5 Kg)',
    passed: finalCalc.finalTotal === 86000,
    detail: `5.5 kg * Rp12.000 (Rp66.000) + Addon Rp5.000 + Kurir Rp15.000 = Rp${finalCalc.finalTotal}`,
  });

  // Test 5: Order Status State Machine Enforcement
  const validTransition = canTransitionOrderStatus('pending_confirmation', 'confirmed');
  const invalidTransition = canTransitionOrderStatus('completed', 'washing');
  results.push({
    name: 'Validasi Transisi Status Pesanan (State Machine)',
    passed: validTransition === true && invalidTransition === false,
    detail: 'Mencegah pesanan yang sudah Selesai kembali ke tahap Pencucian.',
  });

  return results;
}
