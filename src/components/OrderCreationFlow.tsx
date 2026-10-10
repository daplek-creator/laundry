import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Info,
  MapPin,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { calculateAuthoritativeOrderPrice, formatIDR } from '../lib/pricing.ts';
import { HandoffMethod, LaundryOrder } from '../types/domain.ts';

interface OrderCreationFlowProps {
  initialServiceId?: string;
  onOrderCreated: (order: LaundryOrder) => void;
  onCancel: () => void;
  onRequireAuth: () => void;
}

const TIME_SLOTS = [
  '08:00 – 10:00 WIB',
  '10:00 – 12:00 WIB',
  '13:00 – 15:00 WIB',
  '15:00 – 18:00 WIB',
];

const PAYMENT_METHODS = [
  'Tunai / Saat Pengambilan',
  'Transfer Bank / QRIS (Verifikasi Manual)',
];

export const OrderCreationFlow: React.FC<OrderCreationFlowProps> = ({
  initialServiceId,
  onOrderCreated,
  onCancel,
  onRequireAuth,
}) => {
  const { currentUser, services, addons, addresses, settings, createOrder } = useApp();

  const activeServices = services.filter((s) => s.isActive);
  const activeAddons = addons.filter((a) => a.isActive);

  const defaultService =
    activeServices.find((s) => s.id === initialServiceId) || activeServices[0];

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    defaultService?.id || ''
  );
  const [estimatedQty, setEstimatedQty] = useState<number>(
    defaultService?.minQuantity || 3
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [handoffMethod, setHandoffMethod] = useState<HandoffMethod>(
    settings.pickupDeliveryEnabled ? 'pickup_delivery' : 'drop_off'
  );

  const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
  const [pickupAddress, setPickupAddress] = useState<string>(
    defaultAddr
      ? `${defaultAddr.fullAddress}, ${defaultAddr.district} (${defaultAddr.postalCode})`
      : ''
  );

  // Default tomorrow date
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [scheduledDate, setScheduledDate] = useState<string>(tomorrowStr);
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState<string>(TIME_SLOTS[0]);
  const [customerName, setCustomerName] = useState<string>(currentUser?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(currentUser?.phone || '');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedService =
    activeServices.find((s) => s.id === selectedServiceId) || activeServices[0];

  const selectedAddonsList = activeAddons.filter((a) => selectedAddonIds.includes(a.id));

  const pricePreview = useMemo(() => {
    if (!selectedService) return null;
    try {
      return calculateAuthoritativeOrderPrice({
        service: selectedService,
        requestedQuantity: estimatedQty,
        selectedAddons: selectedAddonsList,
        handoffMethod,
        settings,
      });
    } catch {
      return null;
    }
  }, [selectedService, estimatedQty, selectedAddonsList, handoffMethod, settings]);

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectService = (srvId: string) => {
    setSelectedServiceId(srvId);
    const srv = activeServices.find((s) => s.id === srvId);
    if (srv && estimatedQty < srv.minQuantity) {
      setEstimatedQty(srv.minQuantity);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser) {
      onRequireAuth();
      return;
    }

    if (!selectedService) {
      setErrorMsg('Silakan pilih layanan terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createOrder({
        serviceId: selectedService.id,
        estimatedQuantity: estimatedQty,
        selectedAddonIds,
        handoffMethod,
        pickupAddress,
        scheduledDate,
        scheduledTimeSlot,
        customerNotes,
        paymentMethod,
        customerName,
        customerPhone,
      });

      if (!result.ok || !result.order) {
        setErrorMsg(result.error || 'Gagal menyimpan pesanan.');
      } else {
        onOrderCreated(result.order);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-[#E2E7F0] p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-[#102A67]">
            Masuk untuk Membuat Pesanan Laundry
          </h2>
          <p className="text-sm text-[#68738A] max-w-md mx-auto leading-relaxed">
            Agar pesanan Anda memiliki nomor referensi resmi dan progresnya dapat dipantau secara aman, silakan masuk atau daftar akun pelanggan terlebih dahulu.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-xs font-semibold text-[#68738A] bg-[#F4F6FB] hover:bg-[#E2E7F0] rounded-xl cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={onRequireAuth}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#3159D9] hover:bg-[#102A67] rounded-xl cursor-pointer"
            >
              Masuk / Daftar Pelanggan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F6FB] min-h-[calc(100vh-72px)] py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#68738A] hover:text-[#102A67] mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#102A67] tracking-tight">
            Formulir Pemesanan Laundry Baru
          </h1>
          <p className="text-sm text-[#68738A] mt-1">
            Lengkapi rincian layanan, jadwal penyerahan, dan instruksi pencucian pakaian Anda.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Step-by-Step Inputs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Select Service */}
            <div className="bg-white rounded-2xl border border-[#E2E7F0] p-6">
              <h2 className="text-base font-bold text-[#102A67] mb-4">
                01. Pilih Jenis Layanan Utama
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {activeServices.map((srv) => {
                  const isSelected = srv.id === selectedService?.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => handleSelectService(srv.id)}
                      className={`p-4 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#3159D9] bg-[#3159D9]/5'
                          : 'border-[#E2E7F0] hover:border-[#68738A]/40 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-[#68738A]">
                            {srv.category}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[#3159D9] shrink-0" />}
                        </div>
                        <div className="text-sm font-bold text-[#171B2C]">{srv.name}</div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-[#E2E7F0] flex items-center justify-between text-xs">
                        <span className="font-mono-tabular font-semibold text-[#102A67]">
                          {formatIDR(srv.pricePerUnit)}/{srv.unit}
                        </span>
                        <span className="text-[#68738A]">
                          Min. {srv.minQuantity} {srv.unit}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quantity / Estimated Weight Input */}
              {selectedService && (
                <div className="mt-6 pt-5 border-t border-[#E2E7F0]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <label
                        htmlFor="order-qty"
                        className="block text-sm font-semibold text-[#171B2C]"
                      >
                        Perkiraan Berat / Kuantitas ({selectedService.unit})
                      </label>
                      <p className="text-xs text-[#68738A] mt-0.5">
                        Kuantitas tagihan minimum layanan ini adalah{' '}
                        <strong>
                          {selectedService.minQuantity} {selectedService.unit}
                        </strong>
                        . Berat pasti akan ditimbang kembali oleh Admin.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        id="order-qty"
                        type="number"
                        step={selectedService.unit === 'kg' ? '0.5' : '1'}
                        min={0.5}
                        max={200}
                        required
                        value={estimatedQty}
                        onChange={(e) =>
                          setEstimatedQty(Math.max(0.5, Number(e.target.value) || 1))
                        }
                        className="w-28 px-3.5 py-2.5 text-sm font-mono-tabular font-semibold text-right bg-[#F4F6FB] border border-[#E2E7F0] rounded-xl focus:outline-none focus:border-[#3159D9]"
                      />
                      <span className="text-xs font-semibold text-[#68738A]">
                        {selectedService.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Optional Add-ons */}
            <div className="bg-white rounded-2xl border border-[#E2E7F0] p-6">
              <h2 className="text-base font-bold text-[#102A67] mb-1">
                02. Layanan Tambahan Opsional (Add-ons)
              </h2>
              <p className="text-xs text-[#68738A] mb-4">
                Pilih perawatan ekstra jika diperlukan untuk pesanan ini.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeAddons.map((addon) => {
                  const checked = selectedAddonIds.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                        checked
                          ? 'border-[#7452E8] bg-[#7452E8]/5'
                          : 'border-[#E2E7F0] bg-white hover:bg-[#F4F6FB]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#171B2C]">{addon.name}</div>
                        <div className="text-xs text-[#68738A] mt-0.5 leading-snug">
                          {addon.description}
                        </div>
                        <div className="text-xs font-mono-tabular font-semibold text-[#3159D9] mt-2">
                          +{formatIDR(addon.price)}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 mt-0.5 ${
                          checked
                            ? 'bg-[#7452E8] border-[#7452E8] text-white'
                            : 'border-[#68738A]'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Schedule & Handoff Method */}
            <div className="bg-white rounded-2xl border border-[#E2E7F0] p-6 space-y-5">
              <h2 className="text-base font-bold text-[#102A67]">
                03. Jadwal & Metode Penyerahan Cucian
              </h2>

              <div>
                <span className="block text-xs font-semibold text-[#171B2C] mb-2">
                  Pilih Metode Penyerahan
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHandoffMethod('pickup_delivery')}
                    disabled={!settings.pickupDeliveryEnabled}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-3 ${
                      handoffMethod === 'pickup_delivery'
                        ? 'border-[#3159D9] bg-[#3159D9]/5'
                        : 'border-[#E2E7F0] bg-white'
                    } disabled:opacity-50`}
                  >
                    <Truck className="w-5 h-5 text-[#3159D9] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-[#171B2C]">
                        Jemput & Antar Kurir
                      </div>
                      <div className="text-xs text-[#68738A] mt-0.5">
                        Gratis min. {formatIDR(settings.freeDeliveryMinOrder)} (Normal{' '}
                        {formatIDR(settings.pickupDeliveryFee)})
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHandoffMethod('drop_off')}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-3 ${
                      handoffMethod === 'drop_off'
                        ? 'border-[#3159D9] bg-[#3159D9]/5'
                        : 'border-[#E2E7F0] bg-white'
                    }`}
                  >
                    <MapPin className="w-5 h-5 text-[#102A67] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-[#171B2C]">
                        Antar Mandiri ke Outlet
                      </div>
                      <div className="text-xs text-[#68738A] mt-0.5">
                        Tanpa biaya kurir · Serahkan langsung di outlet
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {handoffMethod === 'pickup_delivery' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="order-address"
                      className="text-xs font-semibold text-[#171B2C]"
                    >
                      Alamat Lengkap Penjemputan & Pengantaran
                    </label>
                    {addresses.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#68738A]">Gunakan alamat tersimpan:</span>
                        {addresses.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() =>
                              setPickupAddress(
                                `${a.fullAddress}, ${a.district} (${a.postalCode}) - Catatan: ${a.notes}`
                              )
                            }
                            className="text-xs font-semibold text-[#3159D9] hover:underline cursor-pointer"
                          >
                            [{a.label}]
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    id="order-address"
                    rows={2}
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Nama jalan, nomor rumah/gedung, kecamatan, kode pos, dan patokan lokasi..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] focus:outline-none focus:border-[#3159D9]"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="order-date"
                    className="block text-xs font-semibold text-[#171B2C] mb-1.5"
                  >
                    Tanggal Penjemputan / Penyerahan
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#68738A] absolute left-3.5 top-3" />
                    <input
                      id="order-date"
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] font-mono-tabular focus:outline-none focus:border-[#3159D9]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="order-slot"
                    className="block text-xs font-semibold text-[#171B2C] mb-1.5"
                  >
                    Rentang Waktu
                  </label>
                  <select
                    id="order-slot"
                    value={scheduledTimeSlot}
                    onChange={(e) => setScheduledTimeSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] focus:outline-none focus:border-[#3159D9]"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 4: Contact & Special Instructions */}
            <div className="bg-white rounded-2xl border border-[#E2E7F0] p-6 space-y-4">
              <h2 className="text-base font-bold text-[#102A67]">
                04. Kontak Penerima, Catatan Khusus & Metode Pembayaran
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="order-cust-name"
                    className="block text-xs font-semibold text-[#171B2C] mb-1.5"
                  >
                    Nama Kontak
                  </label>
                  <input
                    id="order-cust-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] focus:outline-none focus:border-[#3159D9]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="order-cust-phone"
                    className="block text-xs font-semibold text-[#171B2C] mb-1.5"
                  >
                    Nomor WhatsApp Aktif
                  </label>
                  <input
                    id="order-cust-phone"
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] font-mono-tabular focus:outline-none focus:border-[#3159D9]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="order-notes"
                  className="block text-xs font-semibold text-[#171B2C] mb-1.5"
                >
                  Instruksi Khusus Pencucian (Opsional)
                </label>
                <textarea
                  id="order-notes"
                  rows={2}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Contoh: Tolong pisahkan kemeja putih, jangan gunakan suhu tinggi pada bahan rajut..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] focus:outline-none focus:border-[#3159D9]"
                />
              </div>

              <div>
                <label
                  htmlFor="order-payment"
                  className="block text-xs font-semibold text-[#171B2C] mb-1.5"
                >
                  Pilih Metode Pembayaran
                </label>
                <select
                  id="order-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] focus:outline-none focus:border-[#3159D9]"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Authoritative Order Summary */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-[#E2E7F0] overflow-hidden">
              <div className="p-6 bg-[#102A67] text-white">
                <div className="text-xs font-medium text-white/75 mb-1">
                  Ringkasan & Kalkulasi Server
                </div>
                <h3 className="text-lg font-bold">Rincian Estimasi Pesanan</h3>
              </div>

              {selectedService && pricePreview && (
                <div className="p-6 space-y-4">
                  <div className="pb-4 border-b border-[#E2E7F0]">
                    <div className="text-xs text-[#68738A]">Layanan Dipilih</div>
                    <div className="text-sm font-bold text-[#171B2C] mt-0.5">
                      {selectedService.name}
                    </div>
                    <div className="text-xs text-[#68738A] mt-1">
                      Tarif: {formatIDR(selectedService.pricePerUnit)} / {selectedService.unit} ·
                      Estimasi selesai ~{selectedService.estimatedHours} jam
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#68738A]">
                        Kuantitas Ditagihkan ({pricePreview.billableQuantity}{' '}
                        {selectedService.unit})
                      </span>
                      <span className="font-mono-tabular font-semibold text-[#171B2C]">
                        {formatIDR(pricePreview.subtotalEstimated)}
                      </span>
                    </div>

                    {pricePreview.addonItems.map((item) => (
                      <div key={item.addonId} className="flex justify-between">
                        <span className="text-[#68738A]">+ {item.name}</span>
                        <span className="font-mono-tabular text-[#171B2C]">
                          {formatIDR(item.priceSnapshot)}
                        </span>
                      </div>
                    ))}

                    <div className="flex justify-between">
                      <span className="text-[#68738A]">
                        Metode ({handoffMethod === 'pickup_delivery' ? 'Jemput & Antar' : 'Antar Mandiri'})
                      </span>
                      <span className="font-mono-tabular text-[#171B2C]">
                        {pricePreview.deliveryFee === 0
                          ? 'Rp0'
                          : formatIDR(pricePreview.deliveryFee)}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[#E2E7F0] flex justify-between items-baseline">
                      <span className="text-sm font-bold text-[#171B2C]">
                        Total Estimasi Tagihan
                      </span>
                      <span className="text-xl font-bold text-[#3159D9] font-mono-tabular">
                        {formatIDR(pricePreview.estimatedTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F4F6FB] border border-[#E2E7F0] text-xs text-[#68738A] flex items-start gap-2.5 leading-relaxed">
                    <Info className="w-4 h-4 text-[#3159D9] shrink-0 mt-0.5" />
                    <span>
                      Total di atas merupakan <strong>estimasi resmi awal</strong>. Jumlah tagihan akhir akan dikonfirmasi setelah cucian ditimbang secara aktual oleh petugas kami.
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F4F6FB] border border-[#E2E7F0] text-xs text-[#68738A] flex items-start gap-2.5 leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-[#102A67] shrink-0 mt-0.5" />
                    <span>
                      Status pembayaran awal akan tercatat sebagai <strong>Belum Dibayar</strong> hingga diverifikasi oleh Admin Operasional.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-5 text-sm font-semibold text-white bg-[#3159D9] hover:bg-[#102A67] disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Memvalidasi & Menyimpan...' : 'Konfirmasi & Buat Pesanan'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
