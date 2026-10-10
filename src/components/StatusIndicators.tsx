import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PackageCheck,
  Sparkles,
  Truck,
  XCircle,
} from 'lucide-react';
import { OrderStatus, PaymentStatus } from '../types/domain.ts';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../lib/pricing.ts';

export const OrderStatusIndicator: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const getConfig = (s: OrderStatus) => {
    switch (s) {
      case 'pending_confirmation':
        return {
          color: 'text-amber-700',
          icon: Clock,
        };
      case 'confirmed':
      case 'picked_up':
        return {
          color: 'text-[#3159D9]',
          icon: Truck,
        };
      case 'washing':
      case 'ironing':
      case 'quality_check':
        return {
          color: 'text-[#7452E8]',
          icon: Sparkles,
        };
      case 'ready_for_delivery':
        return {
          color: 'text-[#102A67]',
          icon: PackageCheck,
        };
      case 'completed':
        return {
          color: 'text-emerald-700',
          icon: CheckCircle2,
        };
      case 'cancelled':
      case 'rejected':
        return {
          color: 'text-red-700',
          icon: XCircle,
        };
    }
  };

  const cfg = getConfig(status);
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cfg.color} whitespace-nowrap shrink-0`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{ORDER_STATUS_LABELS[status]}</span>
    </span>
  );
};

export const PaymentStatusIndicator: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const getConfig = (s: PaymentStatus) => {
    switch (s) {
      case 'paid':
        return { color: 'text-emerald-700', icon: CheckCircle2 };
      case 'pending_verification':
      case 'partially_paid':
        return { color: 'text-amber-700', icon: Clock };
      case 'unpaid':
      default:
        return { color: 'text-[#68738A]', icon: AlertCircle };
    }
  };

  const cfg = getConfig(status);
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color} whitespace-nowrap shrink-0`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{PAYMENT_STATUS_LABELS[status]}</span>
    </span>
  );
};

export const OrderStatusBadge = OrderStatusIndicator;
export const PaymentStatusBadge = PaymentStatusIndicator;

