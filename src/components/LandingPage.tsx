import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  Headset,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Truck,
  WashingMachine,
} from 'lucide-react';
import { BRAND_IMAGES, SERVICE_IMAGE_MAP } from '../assets/brandAssets.ts';
import { useApp } from '../context/AppContext.tsx';
import { formatIDR } from '../lib/pricing.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface LandingPageProps {
  onNavigateOrder: (serviceId?: string) => void;
  onNavigateAuth: () => void;
  onNavigateDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateOrder,
  onNavigateAuth,
  onNavigateDashboard,
}) => {
  const { services, addons, settings, currentUser } = useApp();
  const activeServices = services.filter((s) => s.isActive);
  const [showAllServices, setShowAllServices] = useState(false);

  const displayedServices = showAllServices
    ? activeServices
    : activeServices.slice(0, 4);
  const activeAddons = addons.filter((a) => a.isActive);

  // Price Simulator State
  const [simServiceId, setSimServiceId] = useState<string>(
    activeServices[0]?.id || 'srv-cuci-kering-lipat'
  );
  const [simQty, setSimQty] = useState<number>(5);
  const [simPickup, setSimPickup] = useState<boolean>(true);

  const selectedSimService =
    activeServices.find((s) => s.id === simServiceId) || activeServices[0];

  const simBillableQty = selectedSimService
    ? Math.max(simQty, selectedSimService.minQuantity)
    : simQty;
  const simSubtotal = selectedSimService
    ? simBillableQty * selectedSimService.pricePerUnit
    : 0;
  const simDelivery =
    simPickup && settings.pickupDeliveryEnabled
      ? simSubtotal >= settings.freeDeliveryMinOrder
        ? 0
        : settings.pickupDeliveryFee
      : 0;
  const simTotal = simSubtotal + simDelivery;

  const content = settings.websiteContent;
  const cleanWa = settings.whatsappNumber.replace(/\D+/g, '');
  const whatsappChatUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(
    `Halo ${settings.businessName}, saya ingin memesan / bertanya mengenai layanan laundry.`
  )}`;

  const benefitIcons = [
    <WashingMachine key="b1" className="w-5 h-5 text-[#3159D9]" />,
    <Clock key="b2" className="w-5 h-5 text-[#3159D9]" />,
    <Tag key="b3" className="w-5 h-5 text-[#7452E8]" />,
    <Headset key="b4" className="w-5 h-5 text-[#3159D9]" />,
  ];

  // Short concise subtitles matching Opsi 1 reference image
  const getShortCardSubtitle = (code: string, fallbackFeatures: string[]) => {
    switch (code) {
      case 'CUCI-KERING':
        return 'Pakaian sehari-hari';
      case 'CUCI-SETRIKA':
        return 'Rapi dan wangi';
      case 'LAUNDRY-BEDDING':
        return 'Sprei, selimut, bed cover';
      case 'LAUNDRY-EXPRESS':
        return 'Selesai dalam 3 jam';
      default:
        return fallbackFeatures[0] || 'Perawatan pakaian profesional';
    }
  };

  return (
    <div className="bg-[#F4F6FB] text-[#171B2C]">
      {/* =====================================================================
          HERO SECTION — EXACT OPSI 1 (DEEP NAVY + INTEGRATED TRANSPARENT HEADER)
      ====================================================================== */}
      <section
        id="beranda"
        className="relative overflow-hidden bg-gradient-to-br from-[#07143A] via-[#102A67] to-[#263C9E] text-white"
      >
        {/* Ambient Glowing Blue & Purple Waves + Sparkle Bokeh matching Opsi 1 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 right-1/4 w-[540px] h-[540px] rounded-full bg-[#3159D9]/35 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 w-[640px] h-[480px] rounded-full bg-[#7452E8]/35 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-[#60A5FA]/15 blur-[90px]"
        />

        {/* Decorative SVG Light Wave Ribbon at Bottom of Hero */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="pointer-events-none absolute bottom-0 left-0 w-full h-36 sm:h-48 opacity-45"
          preserveAspectRatio="none"
        >
          <path
            d="M-60 160C240 40 520 240 860 120C1140 20 1320 90 1500 50"
            stroke="url(#waveGrad1)"
            strokeWidth="4"
          />
          <path
            d="M-60 190C280 90 580 250 920 140C1180 55 1350 120 1500 85"
            stroke="url(#waveGrad2)"
            strokeWidth="2"
          />
          <defs>
            <linearGradient id="waveGrad1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3159D9" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#93C5FD" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7452E8" stopOpacity="0.1" />
              <stop offset="60%" stopColor="#C4B5FD" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3159D9" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:py-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Copy Column — Exact Opsi 1 Typography & Buttons */}
            <div className="lg:col-span-6 space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.14] text-white">
                <span className="block">{content.heroTitleLine1}</span>
                <span className="block mt-1">
                  {content.heroTitleHighlight.split(' ').slice(0, 1).join(' ')}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#93C5FD] via-[#A78BFA] to-[#C084FC]">
                    {content.heroTitleHighlight.split(' ').slice(1).join(' ') ||
                      content.heroTitleHighlight}
                  </span>
                </span>
              </h1>

              <p className="text-sm sm:text-base lg:text-[17px] text-white/85 leading-relaxed max-w-lg font-normal">
                {content.heroDescription}
              </p>

              {/* Two Pill Buttons matching Opsi 1: Pesan Sekarang (Gradient) & Lihat Layanan (Dark Glass Outline) */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateOrder()}
                  className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#3159D9] via-[#5454E8] to-[#7452E8] hover:opacity-95 text-white font-semibold text-sm shadow-lg shadow-[#3159D9]/40 border border-white/20 transition-all cursor-pointer"
                >
                  {content.primaryCtaText}
                </button>

                <a
                  href="#layanan"
                  className="px-7 py-3.5 rounded-full bg-[#0D1F4F]/75 hover:bg-[#0D1F4F] text-white font-semibold text-sm border border-white/30 backdrop-blur-xs transition-all"
                >
                  {content.secondaryCtaText}
                </a>
              </div>

              {currentUser && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onNavigateDashboard}
                    className="text-xs font-semibold text-[#93C5FD] hover:text-white underline underline-offset-4 cursor-pointer"
                  >
                    Buka Portal Pelanggan & Lacak Status Pesanan Anda →
                  </button>
                </div>
              )}
            </div>

            {/* Right Visual Studio Showcase — Washing Machine, Folded Blue/Purple Towels & Plant */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-xl lg:max-w-none">
                {/* Soft outer glow behind the washer & towel composition */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-[#3159D9]/40 via-[#7452E8]/40 to-[#60A5FA]/30 blur-xl"
                />
                <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[#102A67]/60">
                  <img
                    src={BRAND_IMAGES.heroOption1Washer}
                    alt={`${settings.businessName} — Mesin cuci modern dan tumpukan handuk bersih`}
                    className="w-full h-[290px] sm:h-[360px] lg:h-[390px] object-cover object-center"
                  />
                  {/* Soft vignette blending left edge into the deep navy hero */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0B1E54]/80 to-transparent hidden sm:block"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0B1E54]/60 to-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4 BENEFIT CARDS ROW (EXACT OPSI 1 WHITE CARDS WITH TOP-LEFT ICON)
      ====================================================================== */}
      <section className="py-10 sm:py-12 bg-[#F4F6FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {content.benefits.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 border border-[#E2E7F0]/90 shadow-xs hover:shadow-md transition-all flex flex-col items-start text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#EEF3FF] to-[#F3EEFF] border border-[#3159D9]/15 flex items-center justify-center mb-4">
                  {benefitIcons[idx % benefitIcons.length]}
                </div>
                <h2 className="text-base font-bold text-[#102A67]">{item.title}</h2>
                <p className="text-xs text-[#68738A] mt-1.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          LAYANAN KAMI — EXACT OPSI 1 SECTION HEADER + 4 PHOTO CARDS
      ====================================================================== */}
      <section id="layanan" className="py-8 sm:py-12 bg-[#F4F6FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row with left title/subtitle and right "Lihat Semua ->" */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#102A67]">
                Layanan Kami
              </h2>
              <p className="text-xs sm:text-sm text-[#68738A] mt-1">
                Berbagai layanan laundry untuk kebutuhan Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAllServices(!showAllServices)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#3159D9] hover:text-[#102A67] transition-colors cursor-pointer self-start sm:self-auto"
            >
              <span>
                {showAllServices ? 'Tampilkan 4 Layanan Utama' : 'Lihat Semua'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Main Cards Grid matching Opsi 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {displayedServices.map((srv) => {
              const imgSrc = SERVICE_IMAGE_MAP[srv.imageKey] || BRAND_IMAGES.washFold;
              const shortSub = getShortCardSubtitle(srv.code, srv.features);
              return (
                <article
                  key={srv.id}
                  onClick={() => onNavigateOrder(srv.id)}
                  className="bg-white rounded-2xl border border-[#E2E7F0] overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="h-44 overflow-hidden bg-[#EEF3FF] relative">
                      <img
                        src={imgSrc}
                        alt={srv.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#102A67] text-[11px] font-bold shadow-xs">
                        {formatIDR(srv.pricePerUnit)}/{srv.unit}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-base font-bold text-[#102A67] group-hover:text-[#3159D9] transition-colors">
                        {srv.name}
                      </h3>
                      <p className="text-xs text-[#68738A] mt-1">{shortSub}</p>
                    </div>
                  </div>

                  <div className="px-5 pb-4 pt-2 border-t border-[#F4F6FB] flex items-center justify-between text-xs">
                    <span className="text-[#68738A]">
                      Min. {srv.minQuantity} {srv.unit}
                    </span>
                    <span className="font-semibold text-[#3159D9] group-hover:underline inline-flex items-center gap-1">
                      Pesan <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          PROMO BANNER SECTION — EXACT OPSI 1 ("Nikmati Kemudahan Laundry Hanya dalam Beberapa Klik!" + Phone Mockup)
      ====================================================================== */}
      <section className="py-8 sm:py-12 bg-[#F4F6FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#08153F] via-[#17358B] to-[#6D4CE6] text-white shadow-xl border border-white/15">
            {/* Glowing Wave Highlights */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/3 w-96 h-96 rounded-full bg-[#3159D9]/40 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 right-10 w-96 h-96 rounded-full bg-[#A855F7]/35 blur-3xl"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-7 sm:p-10 lg:px-12 lg:py-10 relative z-10">
              {/* Left Banner Text & Store / Action Badges */}
              <div className="lg:col-span-7 space-y-4">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug text-white">
                  {content.promoBannerTitle}
                </h2>
                <p className="text-xs sm:text-sm lg:text-base text-white/85 max-w-xl leading-relaxed">
                  {content.promoBannerDescription}
                </p>

                {/* Store-style Badges + Direct Web Order CTA matching Opsi 1 bottom banner */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigateOrder()}
                    className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0B132B] hover:bg-[#171B2C] text-white border border-white/25 transition-all cursor-pointer shadow-md"
                  >
                    <svg className="w-5 h-5 text-[#60A5FA]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z" />
                    </svg>
                    <span className="text-left leading-tight">
                      <span className="block text-[9px] uppercase tracking-wider text-white/70">
                        Akses Instan
                      </span>
                      <span className="block text-xs font-bold text-white">
                        Pesan via Web App
                      </span>
                    </span>
                  </button>

                  <a
                    href={whatsappChatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0B132B] hover:bg-[#171B2C] text-white border border-white/25 transition-all shadow-md"
                  >
                    <MessageCircle className="w-5 h-5 text-[#34D399]" />
                    <span className="text-left leading-tight">
                      <span className="block text-[9px] uppercase tracking-wider text-white/70">
                        Layanan Cepat
                      </span>
                      <span className="block text-xs font-bold text-white">
                        WhatsApp Pickup
                      </span>
                    </span>
                  </a>
                </div>
              </div>

              {/* Right Smartphone UI Mockup Card matching Opsi 1 */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                <div className="w-64 sm:w-72 rounded-[28px] bg-[#0F172A] p-2.5 shadow-2xl border-2 border-white/25 transform lg:rotate-[-4deg] hover:rotate-0 transition-transform duration-300">
                  <div className="bg-gradient-to-b from-[#EEF3FF] to-[#FFFFFF] rounded-[22px] p-4 text-[#102A67] space-y-3">
                    {/* Phone Notch & Status */}
                    <div className="w-16 h-1.5 bg-[#CBD5E1] rounded-full mx-auto mb-1" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#3159D9] to-[#7452E8] flex items-center justify-center text-white text-[10px] font-bold">
                          FL
                        </div>
                        <span className="text-xs font-bold text-[#102A67]">
                          The Fresh Laundry
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold">
                        Aktif
                      </span>
                    </div>

                    {/* Mini App Card inside Phone */}
                    <div className="rounded-xl bg-gradient-to-r from-[#3159D9] to-[#7452E8] p-3 text-white">
                      <p className="text-[10px] text-white/80">Status Pesanan Anda</p>
                      <p className="text-xs font-bold mt-0.5">Setrika Uap & Finishing</p>
                      <div className="mt-2 w-full bg-white/25 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-white h-full w-3/4 rounded-full" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-[#F4F6FB] border border-[#E2E7F0]">
                        <p className="font-bold text-[#102A67]">Cuci Kering</p>
                        <p className="text-[10px] text-[#68738A]">Rp8.000 / kg</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F4F6FB] border border-[#E2E7F0]">
                        <p className="font-bold text-[#102A67]">Cuci Setrika</p>
                        <p className="text-[10px] text-[#68738A]">Rp10.000 / kg</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigateOrder()}
                      className="w-full py-2 rounded-xl bg-[#3159D9] text-white text-xs font-bold text-center cursor-pointer"
                    >
                      Pesan Sekarang
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SIMULATOR HARGA & TABEL TRANSPARANSI HARGA
      ====================================================================== */}
      <section id="harga" className="py-14 lg:py-20 bg-[#FFFFFF] border-t border-b border-[#E2E7F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Price Table & Add-ons */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#3159D9]">
                  Daftar Harga Resmi
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#102A67] mt-1">
                  Harga Transparan & Terukur
                </h2>
                <p className="text-sm text-[#68738A] mt-2">
                  Seluruh tarif dihitung jelas berdasarkan berat timbangan atau jumlah potong saat pakaian diterima.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E7F0] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#102A67] text-white text-xs uppercase">
                        <th className="py-3.5 px-4 font-semibold">Layanan</th>
                        <th className="py-3.5 px-4 font-semibold">Min. Order</th>
                        <th className="py-3.5 px-4 font-semibold">Durasi</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Harga Satuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E7F0] text-sm">
                      {activeServices.map((srv) => (
                        <tr key={srv.id} className="hover:bg-[#F4F6FB]/60">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-[#171B2C]">{srv.name}</p>
                            <p className="text-xs text-[#68738A]">{srv.category}</p>
                          </td>
                          <td className="py-3.5 px-4 text-[#68738A] tabular-nums">
                            {srv.minQuantity} {srv.unit}
                          </td>
                          <td className="py-3.5 px-4 text-[#68738A] tabular-nums">
                            ±{srv.estimatedHours} jam
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#102A67] tabular-nums">
                            {formatIDR(srv.pricePerUnit)}{' '}
                            <span className="text-xs font-normal text-[#68738A]">
                              /{srv.unit}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {activeAddons.length > 0 && (
                <div className="bg-[#F4F6FB] rounded-2xl border border-[#E2E7F0] p-5">
                  <h3 className="text-sm font-bold text-[#102A67] mb-3">
                    Layanan Tambahan (Opsional)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeAddons.map((addon) => (
                      <div
                        key={addon.id}
                        className="p-3 rounded-xl bg-white border border-[#E2E7F0] flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-semibold text-[#171B2C]">{addon.name}</p>
                          <p className="text-[11px] text-[#68738A]">{addon.description}</p>
                        </div>
                        <span className="text-xs font-bold text-[#3159D9] tabular-nums shrink-0">
                          +{formatIDR(addon.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Estimator Card */}
            <div className="lg:col-span-5 bg-[#F4F6FB] rounded-2xl border border-[#E2E7F0] p-6 sm:p-7">
              <div className="flex items-center justify-between border-b border-[#E2E7F0] pb-4 mb-5">
                <div>
                  <span className="text-xs font-semibold text-[#7452E8] uppercase tracking-wider">
                    Kalkulator Biaya
                  </span>
                  <h3 className="text-xl font-bold text-[#102A67]">
                    Hitung Estimasi Pesanan
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#3159D9]/10 text-[#3159D9] flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="sim-service"
                    className="block text-xs font-semibold text-[#171B2C] mb-1.5"
                  >
                    Pilih Jenis Layanan
                  </label>
                  <select
                    id="sim-service"
                    value={simServiceId}
                    onChange={(e) => setSimServiceId(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E7F0] bg-white px-3.5 py-2.5 text-sm font-medium text-[#171B2C] focus:outline-none focus:border-[#3159D9]"
                  >
                    {activeServices.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} ({formatIDR(srv.pricePerUnit)}/{srv.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <label htmlFor="sim-qty" className="text-[#171B2C]">
                      Perkiraan Berat / Jumlah ({selectedSimService?.unit || 'kg'})
                    </label>
                    <span className="text-[#3159D9] font-bold tabular-nums">
                      {simQty} {selectedSimService?.unit || 'kg'}
                    </span>
                  </div>
                  <input
                    id="sim-qty"
                    type="range"
                    min={1}
                    max={25}
                    step={1}
                    value={simQty}
                    onChange={(e) => setSimQty(Number(e.target.value))}
                    className="w-full accent-[#3159D9] cursor-pointer"
                  />
                  {selectedSimService && simQty < selectedSimService.minQuantity && (
                    <p className="text-[11px] text-[#B45309] mt-1">
                      * Berlaku batas minimum {selectedSimService.minQuantity}{' '}
                      {selectedSimService.unit} untuk layanan ini.
                    </p>
                  )}
                </div>

                {settings.pickupDeliveryEnabled && (
                  <div className="pt-1">
                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E7F0] bg-white cursor-pointer">
                      <span className="flex items-center gap-2.5">
                        <Truck className="w-4 h-4 text-[#3159D9]" />
                        <span>
                          <span className="block text-xs font-semibold text-[#171B2C]">
                            Gunakan Antar-Jemput Kurir
                          </span>
                          <span className="block text-[11px] text-[#68738A]">
                            Gratis ongkir untuk subtotal min.{' '}
                            {formatIDR(settings.freeDeliveryMinOrder)}
                          </span>
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={simPickup}
                        onChange={(e) => setSimPickup(e.target.checked)}
                        className="w-4 h-4 accent-[#3159D9]"
                      />
                    </label>
                  </div>
                )}

                <div className="bg-[#102A67] text-white rounded-xl p-5 space-y-2.5 mt-4">
                  <div className="flex justify-between text-xs text-white/80">
                    <span>
                      Subtotal ({simBillableQty} {selectedSimService?.unit})
                    </span>
                    <span className="tabular-nums font-medium">{formatIDR(simSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-white/80">
                    <span>Biaya Antar-Jemput</span>
                    <span className="tabular-nums font-medium">
                      {simDelivery === 0 ? 'Gratis / Rp0' : formatIDR(simDelivery)}
                    </span>
                  </div>
                  <div className="border-t border-white/15 pt-2.5 flex items-baseline justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
                      Estimasi Total
                    </span>
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {formatIDR(simTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateOrder(selectedSimService?.id)}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#3159D9] to-[#7452E8] hover:opacity-95 text-white font-semibold text-sm transition-opacity cursor-pointer"
                >
                  Lanjutkan Pemesanan Layanan Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          TENTANG KAMI
      ====================================================================== */}
      <section id="tentang" className="py-14 lg:py-20 bg-[#F4F6FB] border-b border-[#E2E7F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-[#E2E7F0] shadow-md bg-white p-2">
                <img
                  src={BRAND_IMAGES.heroNavyStudio}
                  alt={settings.businessName}
                  className="w-full h-[320px] sm:h-[360px] object-cover rounded-xl"
                />
              </div>
            </div>
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#3159D9]">
                Tentang {settings.businessName}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#102A67] leading-tight">
                {content.aboutTitle}
              </h2>
              <p className="text-sm sm:text-base text-[#68738A] leading-relaxed">
                {content.aboutDescription}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="p-4 rounded-xl bg-white border border-[#E2E7F0] flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#3159D9] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-[#102A67]">1 Mesin 1 Pelanggan</h3>
                    <p className="text-xs text-[#68738A] mt-0.5">
                      Menjamin higienitas penuh tanpa pencampuran pakaian.
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E2E7F0] flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#7452E8] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-[#102A67]">Pelacakan Status Digital</h3>
                    <p className="text-xs text-[#68738A] mt-0.5">
                      Pantau tahapan cucian dari penjemputan hingga siap diantar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          TESTIMONI PELANGGAN
      ====================================================================== */}
      <section id="testimoni" className="py-14 lg:py-20 bg-[#FFFFFF] border-b border-[#E2E7F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#3159D9]">
              Testimoni
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#102A67] mt-1">
              Ulasan Pelanggan Setia Kami
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.testimonials.map((t) => (
              <div
                key={t.id}
                className="bg-[#F4F6FB] rounded-2xl p-6 border border-[#E2E7F0] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 text-[#F59E0B] mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-[#171B2C] leading-relaxed">“{t.comment}”</p>
                </div>
                <div className="mt-5 pt-4 border-t border-[#E2E7F0] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#102A67]">{t.name}</p>
                    <p className="text-xs text-[#68738A]">{t.role}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-white text-[11px] font-semibold text-[#3159D9] border border-[#E2E7F0]">
                    {t.service}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          KONTAK & WHATSAPP (TANPA FAQ & TANPA EMAIL)
      ====================================================================== */}
      <section id="kontak" className="py-14 lg:py-20 bg-[#F4F6FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E2E7F0] shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF3FF] text-xs font-semibold text-[#3159D9]">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Kontak & Penjemputan</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#102A67]">
                  Hubungi Kami via WhatsApp atau Pesan Langsung
                </h2>
                <p className="text-sm text-[#68738A] max-w-xl leading-relaxed">
                  Tim {settings.businessName} siap melayani penjemputan pakaian ke alamat Anda maupun pertanyaan seputar layanan setiap hari pada jam operasional.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigateOrder()}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#3159D9] to-[#7452E8] hover:opacity-95 text-white font-semibold text-sm shadow-md cursor-pointer"
                  >
                    <span>Pesan Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href={whatsappChatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-sm transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat WhatsApp (+{settings.whatsappNumber})</span>
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#F4F6FB] rounded-2xl p-6 border border-[#E2E7F0] space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E7F0] flex items-center justify-center shrink-0 text-[#3159D9]">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#68738A]">WhatsApp Operasional</p>
                    <a
                      href={whatsappChatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-bold text-[#102A67] hover:underline"
                    >
                      +{settings.whatsappNumber}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E7F0] flex items-center justify-center shrink-0 text-[#3159D9]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#68738A]">Alamat Outlet</p>
                    <p className="text-sm font-semibold text-[#171B2C]">{settings.address}</p>
                    {settings.mapsUrl && (
                      <a
                        href={settings.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs font-semibold text-[#3159D9] hover:underline mt-1"
                      >
                        Lihat Lokasi di Google Maps →
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E7F0] flex items-center justify-center shrink-0 text-[#3159D9]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#68738A]">Jam Operasional</p>
                    <p className="text-sm font-semibold text-[#171B2C]">{settings.operatingHours}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          FOOTER
      ====================================================================== */}
      <footer className="bg-[#08153F] text-white py-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <BrandLogo variant="light" />
          <p className="text-xs text-white/70 text-center sm:text-right">
            © {new Date().getFullYear()} {settings.businessName}. Layanan Laundry Bersih, Rapi & Terpercaya.
          </p>
        </div>
      </footer>
    </div>
  );
};
