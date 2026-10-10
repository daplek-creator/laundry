import React, { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  Edit3,
  FileBarChart,
  Globe,
  Layout,
  LogOut,
  Package,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  formatDateID,
  formatDateTimeID,
  formatIDR,
  getAllowedNextStatuses,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../lib/pricing.ts';
import {
  BusinessSettings,
  LaundryService,
  OrderStatus,
  PaymentStatus,
  ServiceAddon,
  ServiceUnit,
} from '../types/domain.ts';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/StatusIndicators.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';

type AdminTab =
  | 'orders'
  | 'cms_website'
  | 'services'
  | 'customers'
  | 'reports'
  | 'settings';

interface AdminPortalProps {
  onBackToPublicSite: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToPublicSite }) => {
  const {
    allOrdersAdmin: orders,
    services,
    addons,
    customers,
    activityLogs,
    settings,
    logoutAdminPortal,
    adminUpdateOrderStatus,
    adminUpdateActualWeightAndPrice,
    adminRecordPayment,
    adminSaveService,
    adminDeleteService,
    adminToggleServiceActive,
    adminSaveAddon,
    adminToggleAddonActive,
    adminUpdateSettings,
    resetDemoData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Order Management Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    orders[0]?.id || null
  );

  // Order Action Form State
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  const [nextStatusInput, setNextStatusInput] = useState<OrderStatus>(
    selectedOrder?.status || 'pending_confirmation'
  );
  const [statusNoteInput, setStatusNoteInput] = useState('');
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [actualQtyInput, setActualQtyInput] = useState<string>('');
  const [adjustmentReasonInput, setAdjustmentReasonInput] = useState('');
  const [customFinalTotalInput, setCustomFinalTotalInput] = useState<string>('');

  // Payment Form State
  const [payStatusInput, setPayStatusInput] = useState<PaymentStatus>('paid');
  const [payAmountInput, setPayAmountInput] = useState<string>('');
  const [payMethodInput, setPayMethodInput] = useState<string>('Transfer Bank / QRIS');
  const [payRefInput, setPayRefInput] = useState<string>('');

  // Service Editor State
  const [editingService, setEditingService] = useState<
    (Omit<LaundryService, 'id'> & { id?: string }) | null
  >(null);

  // Addon Editor State
  const [editingAddon, setEditingAddon] = useState<
    (Omit<ServiceAddon, 'id'> & { id?: string }) | null
  >(null);

  // Business Settings & Website Content Editor State
  const [settingsDraft, setSettingsDraft] = useState<BusinessSettings>(settings);

  // New Benefit / Testimonial state inside CMS
  const [newBenefitTitle, setNewBenefitTitle] = useState('');
  const [newBenefitDesc, setNewBenefitDesc] = useState('');
  const [newTestiName, setNewTestiName] = useState('');
  const [newTestiRole, setNewTestiRole] = useState('');
  const [newTestiService, setNewTestiService] = useState('Cuci Setrika');
  const [newTestiComment, setNewTestiComment] = useState('');

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const ord = orders.find((o) => o.id === orderId);
    if (ord) {
      setNextStatusInput(ord.status);
      setStatusNoteInput('');
      setInternalNoteInput(ord.internalAdminNotes || '');
      setActualQtyInput(
        ord.actualQuantity !== null ? String(ord.actualQuantity) : String(ord.estimatedQuantity)
      );
      setAdjustmentReasonInput(ord.priceAdjustmentReason || '');
      setCustomFinalTotalInput(ord.finalTotal !== null ? String(ord.finalTotal) : '');
      setPayStatusInput(ord.paymentStatus === 'unpaid' ? 'paid' : ord.paymentStatus);
      setPayAmountInput(String(ord.finalTotal ?? ord.estimatedTotal));
      setPayMethodInput(ord.paymentMethod);
      setPayRefInput(ord.payment.transactionReference || '');
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || o.paymentStatus === paymentFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.serviceNameSnapshot.toLowerCase().includes(q);
      return matchesStatus && matchesPayment && matchesQuery;
    });
  }, [orders, statusFilter, paymentFilter, searchQuery]);

  // Operational Metrics
  const metrics = useMemo(() => {
    const activeCount = orders.filter(
      (o) => !['completed', 'cancelled', 'rejected'].includes(o.status)
    ).length;
    const pendingConfirmCount = orders.filter(
      (o) => o.status === 'pending_confirmation'
    ).length;
    const completedCount = orders.filter((o) => o.status === 'completed').length;
    const paidRevenue = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((acc, o) => acc + (o.finalTotal ?? o.estimatedTotal), 0);
    return { activeCount, pendingConfirmCount, completedCount, paidRevenue };
  }, [orders]);

  // Handlers
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const res = await adminUpdateOrderStatus({
      orderId: selectedOrder.id,
      nextStatus: nextStatusInput,
      note: statusNoteInput,
      internalNote: internalNoteInput,
    });
    if (res.ok) {
      showNotice('ok', `Status pesanan ${selectedOrder.orderNumber} berhasil diperbarui.`);
      setStatusNoteInput('');
    } else {
      showNotice('err', res.error || 'Gagal memperbarui status.');
    }
  };

  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const parsedQty = parseFloat(actualQtyInput);
    const parsedCustomTotal =
      customFinalTotalInput.trim() !== '' ? parseFloat(customFinalTotalInput) : undefined;
    const res = await adminUpdateActualWeightAndPrice({
      orderId: selectedOrder.id,
      actualQuantity: parsedQty,
      adjustmentReason: adjustmentReasonInput,
      customFinalTotal: parsedCustomTotal,
    });
    if (res.ok) {
      showNotice('ok', 'Berat aktual dan total tagihan akhir berhasil dikonfirmasi.');
    } else {
      showNotice('err', res.error || 'Gagal menyimpan berat aktual.');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const res = await adminRecordPayment({
      orderId: selectedOrder.id,
      paymentStatus: payStatusInput,
      amountRecorded: parseFloat(payAmountInput) || 0,
      paymentMethod: payMethodInput,
      transactionReference: payRefInput,
    });
    if (res.ok) {
      showNotice('ok', 'Catatan pembayaran pesanan berhasil diperbarui.');
    } else {
      showNotice('err', res.error || 'Gagal memperbarui pembayaran.');
    }
  };

  const handleServiceFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    const res = await adminSaveService(editingService);
    if (res.ok) {
      showNotice('ok', `Layanan "${editingService.name}" berhasil disimpan.`);
      setEditingService(null);
    } else {
      showNotice('err', res.error || 'Gagal menyimpan layanan.');
    }
  };

  const handleAddonFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddon) return;
    const res = await adminSaveAddon(editingAddon);
    if (res.ok) {
      showNotice('ok', `Add-on "${editingAddon.name}" berhasil disimpan.`);
      setEditingAddon(null);
    } else {
      showNotice('err', res.error || 'Gagal menyimpan add-on.');
    }
  };

  const handleSaveSettingsAndCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminUpdateSettings(settingsDraft);
    if (res.ok) {
      showNotice(
        'ok',
        'Perubahan tampilan website dan pengaturan bisnis berhasil disimpan & langsung aktif di halaman utama.'
      );
    } else {
      showNotice('err', res.error || 'Gagal menyimpan pengaturan.');
    }
  };

  const handleAddBenefit = () => {
    if (!newBenefitTitle.trim() || !newBenefitDesc.trim()) return;
    setSettingsDraft({
      ...settingsDraft,
      websiteContent: {
        ...settingsDraft.websiteContent,
        benefits: [
          ...settingsDraft.websiteContent.benefits,
          {
            id: `ben-${Date.now()}`,
            title: newBenefitTitle.trim(),
            description: newBenefitDesc.trim(),
          },
        ],
      },
    });
    setNewBenefitTitle('');
    setNewBenefitDesc('');
  };

  const handleRemoveBenefit = (id: string) => {
    setSettingsDraft({
      ...settingsDraft,
      websiteContent: {
        ...settingsDraft.websiteContent,
        benefits: settingsDraft.websiteContent.benefits.filter((b) => b.id !== id),
      },
    });
  };

  const handleAddTestimonial = () => {
    if (!newTestiName.trim() || !newTestiComment.trim()) return;
    setSettingsDraft({
      ...settingsDraft,
      websiteContent: {
        ...settingsDraft.websiteContent,
        testimonials: [
          ...settingsDraft.websiteContent.testimonials,
          {
            id: `testi-${Date.now()}`,
            name: newTestiName.trim(),
            role: newTestiRole.trim() || 'Pelanggan The Fresh Laundry',
            service: newTestiService.trim() || 'Cuci Setrika',
            comment: newTestiComment.trim(),
          },
        ],
      },
    });
    setNewTestiName('');
    setNewTestiRole('');
    setNewTestiComment('');
  };

  const handleRemoveTestimonial = (id: string) => {
    setSettingsDraft({
      ...settingsDraft,
      websiteContent: {
        ...settingsDraft.websiteContent,
        testimonials: settingsDraft.websiteContent.testimonials.filter((t) => t.id !== id),
      },
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'Nomor Pesanan',
      'Tanggal',
      'Pelanggan',
      'Telepon',
      'Layanan',
      'Kuantitas Estimasi',
      'Kuantitas Aktual',
      'Satuan',
      'Status Pesanan',
      'Status Pembayaran',
      'Total Tagihan (IDR)',
    ];
    const rows = orders.map((o) => [
      o.orderNumber,
      o.scheduledDate,
      `"${o.customerName}"`,
      o.customerPhone,
      `"${o.serviceNameSnapshot}"`,
      o.estimatedQuantity,
      o.actualQuantity ?? '',
      o.serviceUnitSnapshot,
      ORDER_STATUS_LABELS[o.status],
      PAYMENT_STATUS_LABELS[o.paymentStatus],
      o.finalTotal ?? o.estimatedTotal,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `laporan-pesanan-the-fresh-laundry-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col lg:flex-row">
      {/* Left Deep Navy Admin Sidebar */}
      <aside className="w-full lg:w-68 bg-[#102A67] text-white shrink-0 flex flex-col justify-between p-5">
        <div>
          <div className="pb-5 mb-5 border-b border-white/15 flex items-center justify-between">
            <div>
              <BrandLogo variant="light" />
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-md bg-white/10 text-[11px] font-semibold uppercase tracking-wider text-[#A5B4FC]">
                Panel Kontrol /admin
              </span>
            </div>
          </div>

          <nav aria-label="Navigasi Admin" className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#3159D9] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <ClipboardList className="w-4 h-4" />
                <span>Pesanan & Status</span>
              </span>
              {metrics.pendingConfirmCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[#7452E8] text-white">
                  {metrics.pendingConfirmCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setSettingsDraft(settings);
                setActiveTab('cms_website');
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'cms_website'
                  ? 'bg-[#3159D9] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Layout className="w-4 h-4" />
              <span>Edit Tampilan Website</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-[#3159D9] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Layanan & Harga</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-[#3159D9] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Data Pelanggan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-[#3159D9] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileBarChart className="w-4 h-4" />
              <span>Laporan & Log</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSettingsDraft(settings);
                setActiveTab('settings');
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#3159D9] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Kontak & Operasional</span>
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/15 space-y-2 mt-6">
          <button
            type="button"
            onClick={onBackToPublicSite}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>Lihat Website Utama</span>
          </button>
          <button
            type="button"
            onClick={resetDemoData}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data Awal</span>
          </button>
          <button
            type="button"
            onClick={logoutAdminPortal}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#FCA5A5] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar dari /admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-5 sm:p-8 max-w-7xl mx-auto w-full">
        {/* Top Operational KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-[#E2E7F0]">
            <span className="text-xs font-medium text-[#68738A]">Menunggu Konfirmasi</span>
            <p className="text-2xl font-bold text-[#B45309] mt-1 tabular-nums">
              {metrics.pendingConfirmCount} Pesanan
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E2E7F0]">
            <span className="text-xs font-medium text-[#68738A]">Sedang Diproses</span>
            <p className="text-2xl font-bold text-[#3159D9] mt-1 tabular-nums">
              {metrics.activeCount} Pesanan
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E2E7F0]">
            <span className="text-xs font-medium text-[#68738A]">Pesanan Selesai</span>
            <p className="text-2xl font-bold text-[#15803D] mt-1 tabular-nums">
              {metrics.completedCount} Pesanan
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E2E7F0]">
            <span className="text-xs font-medium text-[#68738A]">Pendapatan Terverifikasi</span>
            <p className="text-2xl font-bold text-[#102A67] mt-1 tabular-nums">
              {formatIDR(metrics.paidRevenue)}
            </p>
          </div>
        </div>

        {/* Feedback Toast */}
        {feedback && (
          <div
            role="status"
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
              feedback.type === 'ok'
                ? 'bg-[#DCFCE7] border-[#16A34A]/30 text-[#15803D]'
                : 'bg-[#FEE2E2] border-[#EF4444]/30 text-[#B91C1C]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* ===================================================================
            TAB 1: ORDERS & WORKFLOW MANAGEMENT
        =================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Search & Filters */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2E7F0] flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-[#68738A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nomor pesanan, nama pelanggan, telepon..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2E7F0] text-sm focus:outline-none focus:border-[#3159D9]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Filter Status Pesanan"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-[#E2E7F0] px-3 py-2 text-xs font-semibold text-[#171B2C] bg-[#F4F6FB]"
                >
                  <option value="all">Semua Status Pesanan</option>
                  {Object.entries(ORDER_STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter Status Pembayaran"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="rounded-xl border border-[#E2E7F0] px-3 py-2 text-xs font-semibold text-[#171B2C] bg-[#F4F6FB]"
                >
                  <option value="all">Semua Status Pembayaran</option>
                  {Object.entries(PAYMENT_STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Orders List */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E7F0] overflow-hidden">
                <div className="p-4 border-b border-[#E2E7F0] flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#102A67]">
                    Daftar Pesanan ({filteredOrders.length})
                  </h2>
                </div>
                <div className="divide-y divide-[#E2E7F0] max-h-[680px] overflow-y-auto">
                  {filteredOrders.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#68738A]">
                      Tidak ada pesanan yang cocok dengan filter pencarian.
                    </div>
                  ) : (
                    filteredOrders.map((ord) => {
                      const isSelected = selectedOrder?.id === ord.id;
                      return (
                        <button
                          key={ord.id}
                          type="button"
                          onClick={() => handleSelectOrder(ord.id)}
                          className={`w-full text-left p-4 transition-colors cursor-pointer block ${
                            isSelected ? 'bg-[#F4F6FB]' : 'hover:bg-[#F4F6FB]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-[#3159D9] tabular-nums">
                              {ord.orderNumber}
                            </span>
                            <OrderStatusBadge status={ord.status} />
                          </div>
                          <p className="text-sm font-bold text-[#171B2C]">{ord.customerName}</p>
                          <p className="text-xs text-[#68738A] mt-0.5">
                            {ord.serviceNameSnapshot} ·{' '}
                            {ord.actualQuantity ?? ord.estimatedQuantity} {ord.serviceUnitSnapshot}
                          </p>
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#E2E7F0]/60 text-xs">
                            <PaymentStatusBadge status={ord.paymentStatus} />
                            <span className="font-bold text-[#102A67] tabular-nums">
                              {formatIDR(ord.finalTotal ?? ord.estimatedTotal)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Order Inspector & Controls */}
              <div className="lg:col-span-7 space-y-6">
                {selectedOrder ? (
                  <>
                    {/* Header Summary */}
                    <div className="bg-white rounded-2xl p-6 border border-[#E2E7F0]">
                      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E2E7F0]">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[#3159D9]">
                            Detail Operasional Pesanan
                          </span>
                          <h3 className="text-2xl font-bold text-[#102A67] mt-0.5">
                            {selectedOrder.orderNumber}
                          </h3>
                          <p className="text-xs text-[#68738A] mt-1">
                            Pelanggan: <strong>{selectedOrder.customerName}</strong> (
                            {selectedOrder.customerPhone})
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <OrderStatusBadge status={selectedOrder.status} />
                          <PaymentStatusBadge status={selectedOrder.paymentStatus} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 text-xs border-b border-[#E2E7F0]">
                        <div>
                          <span className="text-[#68738A] block">Layanan</span>
                          <strong className="text-[#171B2C] text-sm">
                            {selectedOrder.serviceNameSnapshot}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[#68738A] block">Jadwal & Metode</span>
                          <strong className="text-[#171B2C]">
                            {formatDateID(selectedOrder.scheduledDate)} (
                            {selectedOrder.scheduledTimeSlot})
                          </strong>
                        </div>
                        <div>
                          <span className="text-[#68738A] block">Total Tagihan</span>
                          <strong className="text-[#102A67] text-base tabular-nums">
                            {formatIDR(selectedOrder.finalTotal ?? selectedOrder.estimatedTotal)}
                          </strong>
                        </div>
                      </div>

                      <div className="pt-4 text-xs space-y-1.5">
                        <p>
                          <span className="text-[#68738A]">Alamat Penjemputan/Serah Terima:</span>{' '}
                          <strong className="text-[#171B2C]">{selectedOrder.pickupAddress}</strong>
                        </p>
                        {selectedOrder.customerNotes && (
                          <p>
                            <span className="text-[#68738A]">Catatan Pelanggan:</span>{' '}
                            <strong className="text-[#171B2C]">
                              “{selectedOrder.customerNotes}”
                            </strong>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action 1: Update Order Status & Internal Notes */}
                    <form
                      onSubmit={handleStatusSubmit}
                      className="bg-white rounded-2xl p-6 border border-[#E2E7F0] space-y-4"
                    >
                      <h4 className="text-sm font-bold text-[#102A67] flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#3159D9]" />
                        <span>1. Perbarui Status Tahapan & Catatan Internal</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                            Pilih Status Baru
                          </label>
                          <select
                            value={nextStatusInput}
                            onChange={(e) => setNextStatusInput(e.target.value as OrderStatus)}
                            className="w-full rounded-xl border border-[#E2E7F0] px-3 py-2.5 text-sm bg-[#F4F6FB]"
                          >
                            <option value={selectedOrder.status}>
                              {ORDER_STATUS_LABELS[selectedOrder.status]} (Saat Ini)
                            </option>
                            {getAllowedNextStatuses(selectedOrder.status).map((st) => (
                              <option key={st} value={st}>
                                → {ORDER_STATUS_LABELS[st]}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                            Keterangan Riwayat (Terlihat oleh Pelanggan)
                          </label>
                          <input
                            type="text"
                            value={statusNoteInput}
                            onChange={(e) => setStatusNoteInput(e.target.value)}
                            placeholder="Contoh: Cucian masuk mesin #02..."
                            className="w-full rounded-xl border border-[#E2E7F0] px-3 py-2.5 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                          Catatan Internal Admin (Rahasia, Tidak Dilihat Pelanggan)
                        </label>
                        <textarea
                          rows={2}
                          value={internalNoteInput}
                          onChange={(e) => setInternalNoteInput(e.target.value)}
                          placeholder="Catatan khusus staf outlet..."
                          className="w-full rounded-xl border border-[#E2E7F0] px-3 py-2 text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-[#3159D9] hover:bg-[#102A67] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Simpan Status & Catatan
                      </button>
                    </form>

                    {/* Action 2: Actual Weight / Price Confirmation */}
                    <form
                      onSubmit={handleWeightSubmit}
                      className="bg-white rounded-2xl p-6 border border-[#E2E7F0] space-y-4"
                    >
                      <h4 className="text-sm font-bold text-[#102A67] flex items-center gap-2">
                        <Scale className="w-4 h-4 text-[#7452E8]" />
                        <span>2. Konfirmasi Berat/Jumlah Timbangan Aktual & Harga Akhir</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                            Berat / Jumlah Aktual ({selectedOrder.serviceUnitSnapshot})
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            required
                            value={actualQtyInput}
                            onChange={(e) => setActualQtyInput(e.target.value)}
                            className="w-full rounded-xl border border-[#E2E7F0] px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                            Override Total Akhir (Opsional, Kosongkan untuk Hitung Otomatis)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={customFinalTotalInput}
                            onChange={(e) => setCustomFinalTotalInput(e.target.value)}
                            placeholder="Otomatis sesuai tarif"
                            className="w-full rounded-xl border border-[#E2E7F0] px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                          Alasan Penyesuaian / Catatan Timbangan
                        </label>
                        <input
                          type="text"
                          value={adjustmentReasonInput}
                          onChange={(e) => setAdjustmentReasonInput(e.target.value)}
                          placeholder="Contoh: Timbangan aktual di outlet 5.5 kg"
                          className="w-full rounded-xl border border-[#E2E7F0] px-3 py-2 text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-[#102A67] hover:bg-[#3159D9] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Konfirmasi Timbangan & Harga Akhir
                      </button>
                    </form>

                    {/* Action 3: Payment Verification */}
                    <form
                      onSubmit={handlePaymentSubmit}
                      className="bg-white rounded-2xl p-6 border border-[#E2E7F0] space-y-4"
                    >
                      <h4 className="text-sm font-bold text-[#102A67] flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#15803D]" />
                        <span>3. Pencatatan & Verifikasi Pembayaran</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                            Status Pembayaran
                          </label>
                          <select
                            value={payStatusInput}
                            onChange={(e) => setPayStatusInput(e.target.value as PaymentStatus)}
                            className="w-full rounded-xl border border-[#E2E7F0] px-3 py-2 text-sm bg-[#F4F6FB]"
                          >
                            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                            Nominal Diterima (IDR)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={payAmountInput}
                            onChange={(e) => setPayAmountInput(e.target.value)}
                            className="w-full rounded-xl border border-[#E2E7F0] px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                            Metode Pembayaran
                          </label>
                          <input
                            type="text"
                            value={payMethodInput}
                            onChange={(e) => setPayMethodInput(e.target.value)}
                            className="w-full rounded-xl border border-[#E2E7F0] px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                            Nomor Referensi / Bukti Transfer
                          </label>
                          <input
                            type="text"
                            value={payRefInput}
                            onChange={(e) => setPayRefInput(e.target.value)}
                            placeholder="Contoh: QRIS-BCA-88291"
                            className="w-full rounded-xl border border-[#E2E7F0] px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-[#15803D] hover:opacity-95 text-white text-xs font-semibold transition-opacity cursor-pointer"
                      >
                        Simpan Status Pembayaran
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl p-8 text-center border border-[#E2E7F0] text-sm text-[#68738A]">
                    Pilih salah satu pesanan di sebelah kiri untuk mengelola status dan pembayaran.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: CMS WEBSITE — EDIT SEMUA FITUR & TAMPILAN WEBSITE USER
        =================================================================== */}
        {activeTab === 'cms_website' && (
          <form onSubmit={handleSaveSettingsAndCMS} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#E2E7F0]">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-[#E2E7F0]">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3159D9]">
                    Manajemen Konten & Visual Website
                  </span>
                  <h2 className="text-xl font-bold text-[#102A67]">
                    Edit Tampilan & Konten Website Utama
                  </h2>
                  <p className="text-xs text-[#68738A] mt-0.5">
                    Seluruh perubahan teks Hero, Keunggulan, Tentang Kami, dan Testimoni akan langsung tampil di halaman pengunjung.
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#3159D9] to-[#7452E8] hover:opacity-95 text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Simpan Semua Perubahan Website
                </button>
              </div>

              {/* Hero Section Editor */}
              <div className="space-y-4 pb-6 border-b border-[#E2E7F0]">
                <h3 className="text-sm font-bold text-[#102A67]">
                  1. Bagian Hero Utama (Halaman Depan)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                      Judul Hero Baris 1
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.websiteContent.heroTitleLine1}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          websiteContent: {
                            ...settingsDraft.websiteContent,
                            heroTitleLine1: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                      Judul Hero Baris 2 (Highlight Biru-Ungu)
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.websiteContent.heroTitleHighlight}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          websiteContent: {
                            ...settingsDraft.websiteContent,
                            heroTitleHighlight: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                    Deskripsi Sub-Judul Hero
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={settingsDraft.websiteContent.heroDescription}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        websiteContent: {
                          ...settingsDraft.websiteContent,
                          heroDescription: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                      Teks Tombol Utama (Primary CTA)
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.websiteContent.primaryCtaText}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          websiteContent: {
                            ...settingsDraft.websiteContent,
                            primaryCtaText: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                      Teks Tombol Kedua (Secondary CTA)
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.websiteContent.secondaryCtaText}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          websiteContent: {
                            ...settingsDraft.websiteContent,
                            secondaryCtaText: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* About Section Editor */}
              <div className="space-y-4 py-6 border-b border-[#E2E7F0]">
                <h3 className="text-sm font-bold text-[#102A67]">
                  2. Bagian Tentang Kami & Banner Promosi Bawah
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                      Judul Tentang Kami
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.websiteContent.aboutTitle}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          websiteContent: {
                            ...settingsDraft.websiteContent,
                            aboutTitle: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                      Judul Banner Promosi Bawah (Klik Mudah)
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.websiteContent.promoBannerTitle}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          websiteContent: {
                            ...settingsDraft.websiteContent,
                            promoBannerTitle: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                      Deskripsi Tentang Kami
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={settingsDraft.websiteContent.aboutDescription}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          websiteContent: {
                            ...settingsDraft.websiteContent,
                            aboutDescription: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                      Deskripsi Banner Promosi Bawah
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={settingsDraft.websiteContent.promoBannerDescription}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          websiteContent: {
                            ...settingsDraft.websiteContent,
                            promoBannerDescription: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Benefits Cards Editor */}
              <div className="space-y-4 py-6 border-b border-[#E2E7F0]">
                <h3 className="text-sm font-bold text-[#102A67]">
                  3. Kartu Keunggulan (4 Kotak Fitur di Bawah Hero)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {settingsDraft.websiteContent.benefits.map((b, idx) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-[#F4F6FB] border border-[#E2E7F0] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3159D9]">
                          Keunggulan #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(b.id)}
                          className="text-xs text-[#B91C1C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                      <input
                        type="text"
                        value={b.title}
                        onChange={(e) => {
                          const updated = settingsDraft.websiteContent.benefits.map((item) =>
                            item.id === b.id ? { ...item, title: e.target.value } : item
                          );
                          setSettingsDraft({
                            ...settingsDraft,
                            websiteContent: {
                              ...settingsDraft.websiteContent,
                              benefits: updated,
                            },
                          });
                        }}
                        className="w-full rounded-lg border border-[#E2E7F0] bg-white px-3 py-1.5 text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={b.description}
                        onChange={(e) => {
                          const updated = settingsDraft.websiteContent.benefits.map((item) =>
                            item.id === b.id ? { ...item, description: e.target.value } : item
                          );
                          setSettingsDraft({
                            ...settingsDraft,
                            websiteContent: {
                              ...settingsDraft.websiteContent,
                              benefits: updated,
                            },
                          });
                        }}
                        className="w-full rounded-lg border border-[#E2E7F0] bg-white px-3 py-1.5 text-xs"
                      />
                    </div>
                  ))}
                </div>

                {/* Add new benefit */}
                <div className="p-4 rounded-xl border border-dashed border-[#3159D9]/40 bg-[#F4F6FB]/50 flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-semibold text-[#68738A] mb-1">
                      Judul Keunggulan Baru
                    </label>
                    <input
                      type="text"
                      value={newBenefitTitle}
                      onChange={(e) => setNewBenefitTitle(e.target.value)}
                      placeholder="Contoh: Setrika Uap Higienis"
                      className="w-full rounded-lg border border-[#E2E7F0] bg-white px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-semibold text-[#68738A] mb-1">
                      Deskripsi Singkat
                    </label>
                    <input
                      type="text"
                      value={newBenefitDesc}
                      onChange={(e) => setNewBenefitDesc(e.target.value)}
                      placeholder="Deskripsi keunggulan..."
                      className="w-full rounded-lg border border-[#E2E7F0] bg-white px-3 py-2 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBenefit}
                    className="px-4 py-2 rounded-lg bg-[#102A67] text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    + Tambah Keunggulan
                  </button>
                </div>
              </div>

              {/* Testimonials Editor */}
              <div className="space-y-4 pt-6">
                <h3 className="text-sm font-bold text-[#102A67]">4. Testimoni Pelanggan</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {settingsDraft.websiteContent.testimonials.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl bg-[#F4F6FB] border border-[#E2E7F0] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#102A67]">{t.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTestimonial(t.id)}
                          className="text-xs text-[#B91C1C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => {
                          const updated = settingsDraft.websiteContent.testimonials.map((item) =>
                            item.id === t.id ? { ...item, name: e.target.value } : item
                          );
                          setSettingsDraft({
                            ...settingsDraft,
                            websiteContent: {
                              ...settingsDraft.websiteContent,
                              testimonials: updated,
                            },
                          });
                        }}
                        className="w-full rounded-lg border border-[#E2E7F0] bg-white px-2.5 py-1.5 text-xs font-semibold"
                        placeholder="Nama Pelanggan"
                      />
                      <input
                        type="text"
                        value={t.role}
                        onChange={(e) => {
                          const updated = settingsDraft.websiteContent.testimonials.map((item) =>
                            item.id === t.id ? { ...item, role: e.target.value } : item
                          );
                          setSettingsDraft({
                            ...settingsDraft,
                            websiteContent: {
                              ...settingsDraft.websiteContent,
                              testimonials: updated,
                            },
                          });
                        }}
                        className="w-full rounded-lg border border-[#E2E7F0] bg-white px-2.5 py-1.5 text-xs"
                        placeholder="Peran / Lokasi"
                      />
                      <textarea
                        rows={3}
                        value={t.comment}
                        onChange={(e) => {
                          const updated = settingsDraft.websiteContent.testimonials.map((item) =>
                            item.id === t.id ? { ...item, comment: e.target.value } : item
                          );
                          setSettingsDraft({
                            ...settingsDraft,
                            websiteContent: {
                              ...settingsDraft.websiteContent,
                              testimonials: updated,
                            },
                          });
                        }}
                        className="w-full rounded-lg border border-[#E2E7F0] bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  ))}
                </div>

                {/* Add new testimonial */}
                <div className="p-4 rounded-xl border border-dashed border-[#3159D9]/40 bg-[#F4F6FB]/50 space-y-3">
                  <p className="text-xs font-bold text-[#102A67]">Tambah Testimoni Baru</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newTestiName}
                      onChange={(e) => setNewTestiName(e.target.value)}
                      placeholder="Nama Pelanggan"
                      className="rounded-lg border border-[#E2E7F0] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      value={newTestiRole}
                      onChange={(e) => setNewTestiRole(e.target.value)}
                      placeholder="Domisili / Profesi"
                      className="rounded-lg border border-[#E2E7F0] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      value={newTestiService}
                      onChange={(e) => setNewTestiService(e.target.value)}
                      placeholder="Layanan (mis. Cuci Setrika)"
                      className="rounded-lg border border-[#E2E7F0] bg-white px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newTestiComment}
                      onChange={(e) => setNewTestiComment(e.target.value)}
                      placeholder="Isi ulasan testimoni pelanggan..."
                      className="flex-1 rounded-lg border border-[#E2E7F0] bg-white px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddTestimonial}
                      className="px-4 py-2 rounded-lg bg-[#102A67] text-white text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      + Tambah Testimoni
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-[#E2E7F0] flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#3159D9] to-[#7452E8] hover:opacity-95 text-white text-sm font-semibold shadow-md cursor-pointer"
                >
                  Simpan Perubahan Konten Website
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ===================================================================
            TAB 3: SERVICES & PRICING CRUD
        =================================================================== */}
        {activeTab === 'services' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-6 border border-[#E2E7F0]">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#102A67]">
                    Manajemen Katalog Layanan & Harga
                  </h2>
                  <p className="text-xs text-[#68738A]">
                    Tambah, ubah harga, ganti foto kartu layanan, atau nonaktifkan layanan di website.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingService({
                      code: `SRV-${Date.now().toString().slice(-4)}`,
                      name: '',
                      category: 'Kiloan Harian',
                      description: '',
                      pricePerUnit: 10000,
                      unit: 'kg',
                      minQuantity: 3,
                      estimatedHours: 24,
                      isActive: true,
                      imageKey: 'wash_fold',
                      features: ['Pencucian terpisah', 'Lipat rapi'],
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3159D9] hover:bg-[#102A67] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Layanan Baru</span>
                </button>
              </div>

              {/* Service Editor Modal/Form */}
              {editingService && (
                <form
                  onSubmit={handleServiceFormSubmit}
                  className="mb-8 p-6 rounded-2xl bg-[#F4F6FB] border border-[#3159D9]/30 space-y-4"
                >
                  <h3 className="text-sm font-bold text-[#102A67]">
                    {editingService.id ? 'Edit Layanan' : 'Tambah Layanan Baru'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Nama Layanan</label>
                      <input
                        type="text"
                        required
                        value={editingService.name}
                        onChange={(e) =>
                          setEditingService({ ...editingService, name: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#E2E7F0] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Kategori</label>
                      <input
                        type="text"
                        required
                        value={editingService.category}
                        onChange={(e) =>
                          setEditingService({ ...editingService, category: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#E2E7F0] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Kode Layanan</label>
                      <input
                        type="text"
                        required
                        value={editingService.code}
                        onChange={(e) =>
                          setEditingService({ ...editingService, code: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#E2E7F0] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Harga per Satuan</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={editingService.pricePerUnit}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            pricePerUnit: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-[#E2E7F0] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Satuan</label>
                      <select
                        value={editingService.unit}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            unit: e.target.value as ServiceUnit,
                          })
                        }
                        className="w-full rounded-xl border border-[#E2E7F0] bg-white px-3 py-2 text-sm"
                      >
                        <option value="kg">kg</option>
                        <option value="item">item</option>
                        <option value="paket">paket</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Minimum Order</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editingService.minQuantity}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            minQuantity: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-[#E2E7F0] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Visual Kartu Gambar
                      </label>
                      <select
                        value={editingService.imageKey}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            imageKey: e.target.value as LaundryService['imageKey'],
                          })
                        }
                        className="w-full rounded-xl border border-[#E2E7F0] bg-white px-3 py-2 text-sm"
                      >
                        <option value="wash_fold">Cuci Kering (Rak Pakaian)</option>
                        <option value="steam_iron">Cuci Setrika (Setrika Uap)</option>
                        <option value="bedding_care">Bedding & Bed Cover</option>
                        <option value="express_care">Laundry Express</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Deskripsi Layanan</label>
                    <textarea
                      rows={2}
                      required
                      value={editingService.description}
                      onChange={(e) =>
                        setEditingService({ ...editingService, description: e.target.value })
                      }
                      className="w-full rounded-xl border border-[#E2E7F0] bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#102A67] text-white text-xs font-semibold cursor-pointer"
                    >
                      Simpan Layanan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingService(null)}
                      className="px-4 py-2 rounded-xl border border-[#E2E7F0] bg-white text-xs font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E7F0] text-xs text-[#68738A] uppercase">
                      <th className="py-3 px-4">Layanan</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Harga</th>
                      <th className="py-3 px-4">Min. Order</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E7F0]">
                    {services.map((srv) => (
                      <tr key={srv.id}>
                        <td className="py-3.5 px-4 font-semibold text-[#102A67]">{srv.name}</td>
                        <td className="py-3.5 px-4 text-xs text-[#68738A]">{srv.category}</td>
                        <td className="py-3.5 px-4 font-bold tabular-nums">
                          {formatIDR(srv.pricePerUnit)} / {srv.unit}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {srv.minQuantity} {srv.unit}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => adminToggleServiceActive(srv.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                              srv.isActive
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : 'bg-[#F1F5F9] text-[#64748B]'
                            }`}
                          >
                            {srv.isActive ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingService(srv)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#3159D9] hover:underline cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => adminDeleteService(srv.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Addons Management */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2E7F0]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#102A67]">Layanan Tambahan (Add-ons)</h3>
                <button
                  type="button"
                  onClick={() =>
                    setEditingAddon({
                      code: `ADD-${Date.now().toString().slice(-3)}`,
                      name: '',
                      description: '',
                      price: 5000,
                      isActive: true,
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-[#F4F6FB] border border-[#E2E7F0] text-xs font-semibold text-[#102A67] cursor-pointer"
                >
                  + Tambah Add-on
                </button>
              </div>

              {editingAddon && (
                <form
                  onSubmit={handleAddonFormSubmit}
                  className="mb-6 p-4 rounded-xl bg-[#F4F6FB] border border-[#E2E7F0] grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nama Add-on</label>
                    <input
                      type="text"
                      required
                      value={editingAddon.name}
                      onChange={(e) =>
                        setEditingAddon({ ...editingAddon, name: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#E2E7F0] bg-white px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Deskripsi</label>
                    <input
                      type="text"
                      required
                      value={editingAddon.description}
                      onChange={(e) =>
                        setEditingAddon({ ...editingAddon, description: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#E2E7F0] bg-white px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Harga (IDR)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editingAddon.price}
                      onChange={(e) =>
                        setEditingAddon({ ...editingAddon, price: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-[#E2E7F0] bg-white px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-[#102A67] text-white text-xs font-semibold cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAddon(null)}
                      className="px-3 py-1.5 rounded-lg border border-[#E2E7F0] bg-white text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addons.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl border border-[#E2E7F0] flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#102A67]">{a.name}</p>
                      <p className="text-xs text-[#68738A]">{a.description}</p>
                      <p className="text-xs font-bold text-[#3159D9] mt-1">{formatIDR(a.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingAddon(a)}
                        className="text-xs text-[#3159D9] font-semibold hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => adminToggleAddonActive(a.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          a.isActive
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {a.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: CUSTOMERS DIRECTORY
        =================================================================== */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-2xl p-6 border border-[#E2E7F0]">
            <h2 className="text-lg font-bold text-[#102A67] mb-4">
              Direktori Pelanggan Terdaftar ({customers.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E2E7F0] text-xs text-[#68738A] uppercase">
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">WhatsApp / Telepon</th>
                    <th className="py-3 px-4">Total Pesanan</th>
                    <th className="py-3 px-4">Terdaftar Sejak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E7F0]">
                  {customers.map((c) => {
                    const count = orders.filter((o) => o.customerId === c.id).length;
                    return (
                      <tr key={c.id}>
                        <td className="py-3.5 px-4 font-bold text-[#102A67]">{c.fullName}</td>
                        <td className="py-3.5 px-4 tabular-nums">{c.phone}</td>
                        <td className="py-3.5 px-4 font-semibold">{count} pesanan</td>
                        <td className="py-3.5 px-4 text-xs text-[#68738A]">
                          {formatDateID(c.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: REPORTS & ACTIVITY LOGS
        =================================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#E2E7F0] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#102A67]">
                  Ekspor Laporan Operasional & Transaksi
                </h2>
                <p className="text-xs text-[#68738A]">
                  Unduh seluruh data pesanan dan pembayaran dalam format CSV untuk pembukuan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#102A67] hover:bg-[#3159D9] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Laporan CSV</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2E7F0]">
              <h3 className="text-base font-bold text-[#102A67] mb-4">
                Log Aktivitas Administrator
              </h3>
              <div className="divide-y divide-[#E2E7F0] max-h-96 overflow-y-auto text-xs">
                {activityLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-bold text-[#3159D9]">{log.actionType}</span> ·{' '}
                      <span className="font-semibold text-[#171B2C]">{log.targetReference}</span>
                      <p className="text-[#68738A] mt-0.5">{log.details}</p>
                    </div>
                    <span className="text-[#68738A] shrink-0 tabular-nums">
                      {formatDateTimeID(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 6: BUSINESS SETTINGS & WHATSAPP CONTACT
        =================================================================== */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettingsAndCMS}
            className="bg-white rounded-2xl p-6 border border-[#E2E7F0] space-y-5"
          >
            <div className="border-b border-[#E2E7F0] pb-4">
              <h2 className="text-lg font-bold text-[#102A67]">
                Pengaturan Bisnis, WhatsApp & Biaya Antar-Jemput
              </h2>
              <p className="text-xs text-[#68738A]">
                Konfigurasi nomor WhatsApp aktif, alamat outlet, jam operasional, dan tarif kurir.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                  Nama Brand Bisnis
                </label>
                <input
                  type="text"
                  required
                  value={settingsDraft.businessName}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, businessName: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                  Nomor WhatsApp Operasional (Format Internasional, mis: 62812...)
                </label>
                <input
                  type="text"
                  required
                  value={settingsDraft.whatsappNumber}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, whatsappNumber: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                  Alamat Lengkap Outlet
                </label>
                <input
                  type="text"
                  required
                  value={settingsDraft.address}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, address: e.target.value })}
                  className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                  Tautan Google Maps
                </label>
                <input
                  type="url"
                  value={settingsDraft.mapsUrl}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, mapsUrl: e.target.value })}
                  className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                  Jam Operasional
                </label>
                <input
                  type="text"
                  required
                  value={settingsDraft.operatingHours}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, operatingHours: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                  Biaya Kurir Antar-Jemput (IDR)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={settingsDraft.pickupDeliveryFee}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      pickupDeliveryFee: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171B2C] mb-1">
                  Minimum Subtotal Gratis Ongkir (IDR)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={settingsDraft.freeDeliveryMinOrder}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      freeDeliveryMinOrder: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-[#E2E7F0] px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#102A67] hover:bg-[#3159D9] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Simpan Pengaturan Bisnis
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
