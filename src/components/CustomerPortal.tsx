import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  CreditCard,
  FileText,
  HelpCircle,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  formatDateID,
  formatDateTimeID,
  formatIDR,
  ORDER_STATUS_LABELS,
} from '../lib/pricing.ts';
import { LaundryOrder, OrderStatus } from '../types/domain.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { OrderStatusIndicator, PaymentStatusIndicator } from './StatusIndicators.tsx';

interface CustomerPortalProps {
  initialSelectedOrderId?: string | null;
  onCreateNewOrder: (serviceId?: string) => void;
  onBackToSite: () => void;
}

type CustomerTab =
  | 'ringkasan'
  | 'pesanan_aktif'
  | 'riwayat'
  | 'alamat'
  | 'profil'
  | 'bantuan';

const PROGRESS_STEPS: OrderStatus[] = [
  'pending_confirmation',
  'confirmed',
  'picked_up',
  'washing',
  'ironing',
  'quality_check',
  'ready_for_delivery',
  'completed',
];

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  initialSelectedOrderId,
  onCreateNewOrder,
  onBackToSite,
}) => {
  const {
    currentUser,
    orders,
    addresses,
    settings,
    logout,
    updateProfile,
    cancelCustomerOrder,
    saveAddress,
    deleteAddress,
  } = useApp();

  const [activeTab, setActiveTab] = useState<CustomerTab>(
    initialSelectedOrderId ? 'pesanan_aktif' : 'ringkasan'
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    initialSelectedOrderId || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Cancel modal state
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Profile form state
  const [profileName, setProfileName] = useState(currentUser?.fullName || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');

  // Address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState('');
  const [addrRecipient, setAddrRecipient] = useState(currentUser?.fullName || '');
  const [addrPhone, setAddrPhone] = useState(currentUser?.phone || '');
  const [addrFull, setAddrFull] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrPostal, setAddrPostal] = useState('');
  const [addrNotes, setAddrNotes] = useState('');
  const [addrDefault, setAddrDefault] = useState(false);

  if (!currentUser) return null;

  const activeOrders = orders.filter(
    (o) => !['completed', 'cancelled', 'rejected'].includes(o.status)
  );
  const historyOrders = orders.filter((o) =>
    statusFilter === 'all' ? true : o.status === statusFilter
  ).filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.serviceNameSnapshot.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOrder: LaundryOrder | undefined = orders.find(
    (o) => o.id === selectedOrderId
  );

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelOrderId) return;
    const res = await cancelCustomerOrder(cancelOrderId, cancelReason);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: 'Pesanan berhasil dibatalkan.' });
      setCancelOrderId(null);
      setCancelReason('');
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Gagal membatalkan pesanan.' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateProfile({ fullName: profileName, phone: profilePhone });
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: 'Profil akun Anda berhasil diperbarui.' });
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Gagal menyimpan profil.' });
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveAddress({
      label: addrLabel,
      recipientName: addrRecipient,
      phone: addrPhone,
      fullAddress: addrFull,
      district: addrDistrict,
      postalCode: addrPostal,
      notes: addrNotes,
      isDefault: addrDefault,
    });
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: 'Alamat penjemputan berhasil disimpan.' });
      setShowAddressForm(false);
      setAddrLabel('');
      setAddrFull('');
      setAddrDistrict('');
      setAddrPostal('');
      setAddrNotes('');
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Gagal menyimpan alamat.' });
    }
  };

  const navItems: { id: CustomerTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
    {
      id: 'pesanan_aktif',
      label: 'Pesanan Aktif',
      icon: Package,
      count: activeOrders.length,
    },
    { id: 'riwayat', label: 'Riwayat Pesanan', icon: History, count: orders.length },
    { id: 'alamat', label: 'Alamat Tersimpan', icon: MapPin },
    { id: 'profil', label: 'Profil Akun', icon: User },
    { id: 'bantuan', label: 'Pusat Bantuan', icon: HelpCircle },
  ];

  const cleanWhatsapp = settings.whatsappNumber.replace(/\D/g, '');

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#F4F6FB] flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-[#E2E7F0] shrink-0 flex flex-col justify-between">
        <div className="p-4 lg:p-6">
          <div className="mb-6 pb-4 border-b border-[#E2E7F0]">
            <div className="text-xs font-semibold text-[#68738A]">Portal Pelanggan</div>
            <div className="text-sm font-bold text-[#102A67] truncate mt-0.5">
              {currentUser.fullName}
            </div>
            <div className="text-xs text-[#68738A] truncate">{currentUser.email}</div>
          </div>

          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && !selectedOrderId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSelectedOrderId(null);
                    setFeedbackMsg(null);
                  }}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#102A67] text-white'
                      : 'text-[#68738A] hover:bg-[#F4F6FB] hover:text-[#171B2C]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`font-mono-tabular text-xs ${
                        isActive ? 'text-white/90' : 'text-[#68738A]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block p-6 border-t border-[#E2E7F0] space-y-2">
          <button
            type="button"
            onClick={() => onCreateNewOrder()}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#3159D9] hover:bg-[#102A67] rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pesanan Baru</span>
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full py-2.5 px-4 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl">
        {feedbackMsg && (
          <div
            className={`mb-6 p-4 rounded-xl border text-xs flex items-center justify-between ${
              feedbackMsg.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-xs font-semibold underline cursor-pointer ml-4"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Order Tracking & Detailed View */}
        {selectedOrder ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="text-xs font-semibold text-[#3159D9] hover:underline cursor-pointer mb-1 inline-block"
                >
                  ← Kembali ke Daftar Pesanan
                </button>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-[#102A67] font-mono-tabular">
                    {selectedOrder.orderNumber}
                  </h1>
                  <OrderStatusIndicator status={selectedOrder.status} />
                </div>
                <p className="text-xs text-[#68738A] mt-1">
                  Dibuat pada {formatDateTimeID(selectedOrder.createdAt)} · Estimasi selesai{' '}
                  {formatDateTimeID(selectedOrder.estimatedCompletionAt)}
                </p>
              </div>

              {selectedOrder.status === 'pending_confirmation' && (
                <button
                  type="button"
                  onClick={() => setCancelOrderId(selectedOrder.id)}
                  className="px-4 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-xl cursor-pointer"
                >
                  Batalkan Pesanan
                </button>
              )}
            </div>

            {/* Progress Visual Stepper */}
            {!['cancelled', 'rejected'].includes(selectedOrder.status) && (
              <div className="bg-white rounded-2xl border border-[#E2E7F0] p-6">
                <h2 className="text-xs font-semibold text-[#68738A] mb-4">
                  Tahap Pengerjaan Cucian
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {PROGRESS_STEPS.map((st, idx) => {
                    const currentIdx = PROGRESS_STEPS.indexOf(selectedOrder.status);
                    const isDone = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    return (
                      <div
                        key={st}
                        className={`p-3 rounded-xl border text-left ${
                          isCurrent
                            ? 'border-[#3159D9] bg-[#3159D9]/5'
                            : isDone
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'border-[#E2E7F0] bg-[#F4F6FB]/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-mono-tabular font-bold text-[#102A67]">
                            0{idx + 1}
                          </span>
                          {isDone && <Check className="w-3.5 h-3.5 text-[#3159D9]" />}
                        </div>
                        <div className="text-xs font-semibold text-[#171B2C] leading-snug">
                          {ORDER_STATUS_LABELS[st]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Columns: Service & Pricing Details */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-2xl border border-[#E2E7F0] p-6 space-y-4">
                  <h2 className="text-base font-bold text-[#102A67]">
                    Rincian Layanan & Perhitungan Biaya
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-[#E2E7F0]">
                    <div>
                      <div className="text-[#68738A]">Nama Layanan</div>
                      <div className="text-sm font-bold text-[#171B2C] mt-0.5">
                        {selectedOrder.serviceNameSnapshot}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#68738A]">Harga Satuan (Snapshot)</div>
                      <div className="text-sm font-mono-tabular font-semibold text-[#171B2C] mt-0.5">
                        {formatIDR(selectedOrder.unitPriceSnapshot)} /{' '}
                        {selectedOrder.serviceUnitSnapshot}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#68738A]">Estimasi Kuantitas Awal</div>
                      <div className="text-sm font-mono-tabular font-semibold text-[#171B2C] mt-0.5">
                        {selectedOrder.estimatedQuantity} {selectedOrder.serviceUnitSnapshot}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#68738A]">Berat / Kuantitas Aktual Dikonfirmasi</div>
                      <div className="text-sm font-mono-tabular font-bold text-[#3159D9] mt-0.5">
                        {selectedOrder.actualQuantity !== null
                          ? `${selectedOrder.actualQuantity} ${selectedOrder.serviceUnitSnapshot}`
                          : 'Menunggu penimbangan outlet'}
                      </div>
                    </div>
                  </div>

                  {selectedOrder.priceAdjustmentReason && (
                    <div className="p-3.5 rounded-xl bg-[#F4F6FB] border border-[#E2E7F0] text-xs text-[#171B2C]">
                      <span className="font-semibold text-[#102A67]">
                        Catatan Konfirmasi Timbangan:{' '}
                      </span>
                      <span>{selectedOrder.priceAdjustmentReason}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[#E2E7F0] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#68738A]">Subtotal Estimasi Awal</span>
                      <span className="font-mono-tabular text-[#171B2C]">
                        {formatIDR(selectedOrder.subtotalEstimated)}
                      </span>
                    </div>
                    {selectedOrder.addons.map((ad) => (
                      <div key={ad.addonId} className="flex justify-between">
                        <span className="text-[#68738A]">+ {ad.name}</span>
                        <span className="font-mono-tabular text-[#171B2C]">
                          {formatIDR(ad.priceSnapshot)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <span className="text-[#68738A]">Biaya Antar-Jemput</span>
                      <span className="font-mono-tabular text-[#171B2C]">
                        {formatIDR(selectedOrder.deliveryFee)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#E2E7F0]">
                      <span className="text-[#68738A]">Total Estimasi Awal</span>
                      <span className="font-mono-tabular font-semibold text-[#68738A]">
                        {formatIDR(selectedOrder.estimatedTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-[#E2E7F0]">
                      <span className="text-sm font-bold text-[#102A67]">
                        {selectedOrder.finalTotal !== null
                          ? 'Total Tagihan Akhir (Terkonfirmasi)'
                          : 'Tagihan Sementara (Estimasi)'}
                      </span>
                      <span className="text-xl font-bold font-mono-tabular text-[#3159D9]">
                        {formatIDR(selectedOrder.finalTotal ?? selectedOrder.estimatedTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Handoff & Payment Details */}
                <div className="bg-white rounded-2xl border border-[#E2E7F0] p-6 space-y-4">
                  <h2 className="text-base font-bold text-[#102A67]">
                    Informasi Penyerahan & Pembayaran
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-[#68738A]">Metode Penyerahan</div>
                      <div className="font-semibold text-[#171B2C] mt-0.5">
                        {selectedOrder.handoffMethod === 'pickup_delivery'
                          ? 'Penjemputan & Pengantaran Kurir'
                          : 'Antar Mandiri ke Outlet'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#68738A]">Jadwal Terpilih</div>
                      <div className="font-semibold text-[#171B2C] mt-0.5">
                        {formatDateID(selectedOrder.scheduledDate)} ·{' '}
                        {selectedOrder.scheduledTimeSlot}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-[#68738A]">Alamat / Lokasi</div>
                      <div className="font-medium text-[#171B2C] mt-0.5">
                        {selectedOrder.pickupAddress}
                      </div>
                    </div>
                    {selectedOrder.customerNotes && (
                      <div className="sm:col-span-2">
                        <div className="text-[#68738A]">Instruksi Khusus Pelanggan</div>
                        <div className="font-medium text-[#171B2C] mt-0.5">
                          {selectedOrder.customerNotes}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#E2E7F0] flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#68738A]">Status Pembayaran</div>
                      <div className="mt-1">
                        <PaymentStatusIndicator status={selectedOrder.paymentStatus} />
                      </div>
                      <div className="text-xs text-[#68738A] mt-1">
                        Metode: {selectedOrder.paymentMethod}
                        {selectedOrder.payment.transactionReference &&
                          ` · Ref: ${selectedOrder.payment.transactionReference}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#68738A]">Jumlah Tercatat Dibayar</div>
                      <div className="text-base font-bold font-mono-tabular text-[#171B2C]">
                        {formatIDR(selectedOrder.payment.amountRecorded)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Status Timeline History */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-2xl border border-[#E2E7F0] p-6">
                  <h2 className="text-base font-bold text-[#102A67] mb-4">
                    Riwayat Status Pesanan
                  </h2>
                  <ol className="relative border-l border-[#E2E7F0] ml-3 space-y-5">
                    {[...selectedOrder.statusHistory].reverse().map((item, idx) => (
                      <li key={item.id} className="ml-5">
                        <span
                          className={`absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full ring-4 ring-white ${
                            idx === 0 ? 'bg-[#3159D9]' : 'bg-[#68738A]/40'
                          }`}
                        />
                        <div className="text-xs font-bold text-[#171B2C]">
                          {ORDER_STATUS_LABELS[item.status]}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-[#68738A] mt-0.5">
                          {formatDateTimeID(item.createdAt)} · Oleh {item.changedByName}
                        </div>
                        <p className="text-xs text-[#68738A] mt-1 leading-relaxed bg-[#F4F6FB] p-2.5 rounded-lg border border-[#E2E7F0]">
                          {item.note}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tab Views when no individual order is open */
          <>
            {activeTab === 'ringkasan' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-[#102A67] tracking-tight">
                      Halo, {currentUser.fullName}
                    </h1>
                    <p className="text-xs text-[#68738A] mt-1">
                      Pantau pesanan aktif dan riwayat layanan laundry Anda di satu tempat.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCreateNewOrder()}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#3159D9] hover:bg-[#102A67] rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Pesan Laundry Baru</span>
                  </button>
                </div>

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-[#E2E7F0] p-5">
                    <div className="text-xs font-medium text-[#68738A]">Pesanan Aktif Saat Ini</div>
                    <div className="text-2xl font-bold text-[#102A67] font-mono-tabular mt-1">
                      {activeOrders.length}
                    </div>
                    <div className="text-xs text-[#68738A] mt-1">
                      Sedang diproses atau dijadwalkan
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#E2E7F0] p-5">
                    <div className="text-xs font-medium text-[#68738A]">Total Riwayat Pesanan</div>
                    <div className="text-2xl font-bold text-[#171B2C] font-mono-tabular mt-1">
                      {orders.length}
                    </div>
                    <div className="text-xs text-[#68738A] mt-1">
                      Seluruh transaksi akun Anda
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#E2E7F0] p-5">
                    <div className="text-xs font-medium text-[#68738A]">Alamat Tersimpan</div>
                    <div className="text-2xl font-bold text-[#3159D9] font-mono-tabular mt-1">
                      {addresses.length}
                    </div>
                    <div className="text-xs text-[#68738A] mt-1">
                      Siap digunakan untuk antar-jemput
                    </div>
                  </div>
                </div>

                {/* Active Orders Section */}
                <div className="bg-white rounded-2xl border border-[#E2E7F0] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E2E7F0] flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#102A67]">
                      Pesanan Aktif & Terbaru
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('riwayat')}
                      className="text-xs font-semibold text-[#3159D9] hover:underline cursor-pointer"
                    >
                      Lihat Semua Riwayat →
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="p-10 text-center space-y-3">
                      <Package className="w-8 h-8 text-[#68738A] mx-auto" />
                      <div className="text-sm font-bold text-[#171B2C]">
                        Belum Ada Pesanan Laundry
                      </div>
                      <p className="text-xs text-[#68738A] max-w-sm mx-auto">
                        Anda belum memiliki pesanan aktif. Jadwalkan penjemputan atau pengantaran cucian pertama Anda sekarang.
                      </p>
                      <button
                        type="button"
                        onClick={() => onCreateNewOrder()}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#3159D9] rounded-xl cursor-pointer"
                      >
                        Buat Pesanan Pertama
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E2E7F0]">
                      {orders.slice(0, 4).map((ord) => (
                        <div
                          key={ord.id}
                          className="p-5 hover:bg-[#F4F6FB]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-mono-tabular text-sm font-bold text-[#102A67]">
                                {ord.orderNumber}
                              </span>
                              <OrderStatusIndicator status={ord.status} />
                            </div>
                            <div className="text-sm font-semibold text-[#171B2C]">
                              {ord.serviceNameSnapshot} ·{' '}
                              <span className="font-mono-tabular">
                                {ord.actualQuantity ?? ord.estimatedQuantity}{' '}
                                {ord.serviceUnitSnapshot}
                              </span>
                            </div>
                            <div className="text-xs text-[#68738A]">
                              Jadwal: {formatDateID(ord.scheduledDate)} ({ord.scheduledTimeSlot})
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                            <div className="text-right">
                              <div className="text-sm font-bold font-mono-tabular text-[#171B2C]">
                                {formatIDR(ord.finalTotal ?? ord.estimatedTotal)}
                              </div>
                              <PaymentStatusIndicator status={ord.paymentStatus} />
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(ord.id)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-[#3159D9] bg-[#F4F6FB] hover:bg-[#E2E7F0] rounded-lg transition-colors cursor-pointer"
                            >
                              Lacak Detail →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(activeTab === 'pesanan_aktif' || activeTab === 'riwayat') && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-[#102A67]">
                      {activeTab === 'pesanan_aktif'
                        ? 'Pesanan Aktif Saya'
                        : 'Riwayat Seluruh Pesanan'}
                    </h1>
                    <p className="text-xs text-[#68738A] mt-1">
                      Klik pada salah satu pesanan untuk melihat linimasa pengerjaan dan rincian biaya.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCreateNewOrder()}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-[#3159D9] hover:bg-[#102A67] rounded-xl cursor-pointer self-start"
                  >
                    + Pesanan Baru
                  </button>
                </div>

                {activeTab === 'riwayat' && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#68738A] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nomor referensi (TFL-...) atau nama layanan..."
                        className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-[#E2E7F0] rounded-xl focus:outline-none focus:border-[#3159D9]"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3.5 py-2 text-xs bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C]"
                    >
                      <option value="all">Semua Status</option>
                      {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-[#E2E7F0] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F4F6FB] border-b border-[#E2E7F0] text-xs font-semibold text-[#68738A]">
                          <th className="py-3.5 px-4">No. Referensi</th>
                          <th className="py-3.5 px-4">Layanan & Kuantitas</th>
                          <th className="py-3.5 px-4">Tanggal</th>
                          <th className="py-3.5 px-4">Status Pengerjaan</th>
                          <th className="py-3.5 px-4">Pembayaran</th>
                          <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                          <th className="py-3.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E7F0] text-xs">
                        {(activeTab === 'pesanan_aktif' ? activeOrders : historyOrders).map(
                          (ord) => (
                            <tr key={ord.id} className="hover:bg-[#F4F6FB]/60">
                              <td className="py-3.5 px-4 font-mono-tabular font-bold text-[#102A67]">
                                {ord.orderNumber}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-[#171B2C]">
                                  {ord.serviceNameSnapshot}
                                </div>
                                <div className="text-[#68738A] font-mono-tabular">
                                  {ord.actualQuantity !== null
                                    ? `${ord.actualQuantity} ${ord.serviceUnitSnapshot} (Aktual)`
                                    : `${ord.estimatedQuantity} ${ord.serviceUnitSnapshot} (Estimasi)`}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono-tabular text-[#68738A]">
                                {formatDateID(ord.scheduledDate)}
                              </td>
                              <td className="py-3.5 px-4">
                                <OrderStatusIndicator status={ord.status} />
                              </td>
                              <td className="py-3.5 px-4">
                                <PaymentStatusIndicator status={ord.paymentStatus} />
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono-tabular font-bold text-[#171B2C]">
                                {formatIDR(ord.finalTotal ?? ord.estimatedTotal)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderId(ord.id)}
                                  className="px-3 py-1.5 text-xs font-semibold text-[#3159D9] hover:underline cursor-pointer"
                                >
                                  Buka Detail
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                  {(activeTab === 'pesanan_aktif' ? activeOrders : historyOrders).length === 0 && (
                    <div className="p-8 text-center text-xs text-[#68738A]">
                      Tidak ada data pesanan yang sesuai dengan kriteria tampilan ini.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'alamat' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-[#102A67]">
                      Daftar Alamat Penjemputan & Pengantaran
                    </h1>
                    <p className="text-xs text-[#68738A] mt-1">
                      Simpan alamat rumah atau kantor untuk mempercepat pemesanan berikutnya.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-[#3159D9] hover:bg-[#102A67] rounded-xl cursor-pointer"
                  >
                    {showAddressForm ? 'Tutup Formulir' : '+ Tambah Alamat'}
                  </button>
                </div>

                {showAddressForm && (
                  <form
                    onSubmit={handleCreateAddress}
                    className="bg-white rounded-2xl border border-[#E2E7F0] p-6 space-y-4"
                  >
                    <h2 className="text-sm font-bold text-[#102A67]">Tambah Alamat Baru</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                          Label Alamat
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Rumah / Kantor / Apartemen"
                          value={addrLabel}
                          onChange={(e) => setAddrLabel(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E7F0] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                          Nama Penerima
                        </label>
                        <input
                          type="text"
                          required
                          value={addrRecipient}
                          onChange={(e) => setAddrRecipient(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E7F0] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                          Nomor Telepon
                        </label>
                        <input
                          type="tel"
                          required
                          value={addrPhone}
                          onChange={(e) => setAddrPhone(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E7F0] rounded-lg font-mono-tabular"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                        Alamat Lengkap (Jalan, Nomor, RT/RW, Gedung)
                      </label>
                      <input
                        type="text"
                        required
                        value={addrFull}
                        onChange={(e) => setAddrFull(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[#E2E7F0] rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                          Kecamatan / Kota
                        </label>
                        <input
                          type="text"
                          required
                          value={addrDistrict}
                          onChange={(e) => setAddrDistrict(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E7F0] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                          Kode Pos
                        </label>
                        <input
                          type="text"
                          value={addrPostal}
                          onChange={(e) => setAddrPostal(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E7F0] rounded-lg font-mono-tabular"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                          Patokan / Catatan Kurir
                        </label>
                        <input
                          type="text"
                          value={addrNotes}
                          onChange={(e) => setAddrNotes(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E7F0] rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <label className="inline-flex items-center gap-2 text-xs text-[#171B2C] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addrDefault}
                          onChange={(e) => setAddrDefault(e.target.checked)}
                        />
                        <span>Jadikan sebagai alamat utama</span>
                      </label>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-semibold text-white bg-[#102A67] rounded-lg cursor-pointer"
                      >
                        Simpan Alamat
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="bg-white rounded-2xl border border-[#E2E7F0] p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-[#102A67]">
                            {addr.label}
                            {addr.isDefault && (
                              <span className="ml-2 text-xs font-normal text-[#3159D9]">
                                · Utama
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteAddress(addr.id)}
                            className="text-[#68738A] hover:text-red-600 cursor-pointer"
                            title="Hapus alamat"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs font-semibold text-[#171B2C]">
                          {addr.recipientName} ({addr.phone})
                        </div>
                        <p className="text-xs text-[#68738A] mt-1 leading-relaxed">
                          {addr.fullAddress}, {addr.district} {addr.postalCode}
                        </p>
                        {addr.notes && (
                          <p className="text-xs text-[#68738A] mt-1">Catatan: {addr.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'profil' && (
              <div className="max-w-xl space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#102A67]">Pengaturan Profil Akun</h1>
                  <p className="text-xs text-[#68738A] mt-1">
                    Perbarui informasi kontak yang digunakan untuk konfirmasi pesanan Anda.
                  </p>
                </div>

                <form
                  onSubmit={handleSaveProfile}
                  className="bg-white rounded-2xl border border-[#E2E7F0] p-6 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-[#68738A] mb-1">
                      Alamat Email Terdaftar (Tidak dapat diubah sembarangan)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={currentUser.email}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#F4F6FB] border border-[#E2E7F0] rounded-xl text-[#68738A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                      Nomor WhatsApp / Telepon
                    </label>
                    <input
                      type="tel"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] font-mono-tabular"
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#3159D9] hover:bg-[#102A67] rounded-xl cursor-pointer"
                    >
                      Simpan Perubahan Profil
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'bantuan' && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#102A67]">
                    Bantuan & Layanan Pelanggan
                  </h1>
                  <p className="text-xs text-[#68738A] mt-1">
                    Tim operasional kami siap membantu pertanyaan terkait jadwal jemput atau status pakaian Anda.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E7F0] p-6 space-y-4">
                  <h2 className="text-base font-bold text-[#171B2C]">
                    Hubungi Admin Operasional via WhatsApp
                  </h2>
                  <p className="text-xs text-[#68738A] leading-relaxed">
                    Sertakan Nomor Referensi Pesanan Anda (contoh: <strong>TFL-2610-0841</strong>) saat menghubungi kami agar staf kami dapat memeriksa status cucian Anda dengan cepat.
                  </p>
                  <div className="text-xs text-[#171B2C] space-y-1">
                    <div>
                      <strong>Jam Layanan:</strong> {settings.operatingHours}
                    </div>
                    <div>
                      <strong>Alamat Outlet:</strong> {settings.address}
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                      `Halo Admin The Fresh Laundry, saya ${currentUser.fullName} ingin menanyakan informasi pesanan.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#3159D9] hover:bg-[#102A67] rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat WhatsApp Layanan Pelanggan</span>
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Cancel Order Confirmation Modal */}
      {cancelOrderId && (
        <div
          className="fixed inset-0 z-50 bg-[#171B2C]/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleConfirmCancel}
            className="bg-white rounded-2xl border border-[#E2E7F0] max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#102A67]">
                Konfirmasi Pembatalan Pesanan
              </h3>
              <button
                type="button"
                onClick={() => setCancelOrderId(null)}
                className="text-[#68738A] hover:text-[#171B2C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#68738A] leading-relaxed">
              Pesanan yang masih berstatus <strong>Menunggu Konfirmasi</strong> dapat dibatalkan. Mohon tuliskan alasan pembatalan singkat:
            </p>
            <textarea
              rows={2}
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Contoh: Ingin mengubah jadwal penjemputan ke minggu depan..."
              className="w-full px-3.5 py-2 text-xs border border-[#E2E7F0] rounded-xl"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelOrderId(null)}
                className="px-4 py-2 text-xs font-semibold text-[#68738A] bg-[#F4F6FB] rounded-lg cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Ya, Batalkan Pesanan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
