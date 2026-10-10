/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { BrandLogo } from './components/BrandLogo.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthView } from './components/AuthView.tsx';
import { OrderCreationFlow } from './components/OrderCreationFlow.tsx';
import { CustomerPortal } from './components/CustomerPortal.tsx';
import { AdminLogin } from './admin/components/AdminLogin.tsx';
import { AdminPortal } from './admin/AdminPortal.tsx';
import { LaundryOrder } from './types/domain.ts';

type ActiveRoute = 'landing' | 'auth' | 'order_flow' | 'customer_portal' | 'admin';

function detectIsAdminUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/+$/, '');
  const hash = window.location.hash.replace(/^#/, '').replace(/\/+$/, '');
  return path === '/admin' || path.endsWith('/admin') || hash === '/admin' || hash === 'admin';
}

const MainShell: React.FC = () => {
  const { currentUser, isAdminAuthenticated } = useApp();
  const [route, setRoute] = useState<ActiveRoute>(() =>
    detectIsAdminUrl() ? 'admin' : 'landing'
  );
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | undefined>(
    undefined
  );
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Sync browser URL changes (/admin or back button)
  useEffect(() => {
    const handleLocationChange = () => {
      if (detectIsAdminUrl()) {
        setRoute('admin');
      } else if (route === 'admin') {
        setRoute('landing');
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [route]);

  const exitAdminToPublicSite = () => {
    try {
      window.history.pushState({}, '', '/');
    } catch {
      // fallback if history pushState is restricted
    }
    setRoute('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dedicated /admin route (isolated from public customer shell)
  if (route === 'admin') {
    if (!isAdminAuthenticated) {
      return <AdminLogin onBackToPublicSite={exitAdminToPublicSite} />;
    }
    return <AdminPortal onBackToPublicSite={exitAdminToPublicSite} />;
  }

  const navigateToOrder = (serviceId?: string) => {
    setPreselectedServiceId(serviceId);
    setMobileMenuOpen(false);
    if (!currentUser) {
      setRoute('auth');
    } else {
      setRoute('order_flow');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToDashboard = () => {
    setMobileMenuOpen(false);
    if (!currentUser) {
      setRoute('auth');
      return;
    }
    setRoute('customer_portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = () => {
    if (preselectedServiceId) {
      setRoute('order_flow');
    } else {
      setRoute('customer_portal');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderCreated = (order: LaundryOrder) => {
    setHighlightedOrderId(order.id);
    setRoute('customer_portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6FB] text-[#171B2C]">
      {/* Public Customer Navigation Bar — Deep Navy matching Opsi 1 */}
      <header className="sticky top-0 z-40 h-[72px] bg-[#081642]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8 text-white">
        <a
          href="#beranda"
          onClick={(e) => {
            e.preventDefault();
            setRoute('landing');
            setMobileMenuOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="focus:outline-none"
        >
          <BrandLogo variant="light" />
        </a>

        <nav
          aria-label="Navigasi Utama"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-white/80"
        >
          <a
            href="#beranda"
            onClick={() => setRoute('landing')}
            className="text-white font-semibold border-b-2 border-[#60A5FA] pb-1 transition-colors whitespace-nowrap shrink-0"
          >
            Beranda
          </a>
          <a
            href="#layanan"
            onClick={() => setRoute('landing')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Layanan
          </a>
          <a
            href="#tentang"
            onClick={() => setRoute('landing')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Tentang Kami
          </a>
          <a
            href="#testimoni"
            onClick={() => setRoute('landing')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Testimoni
          </a>
          <a
            href="#kontak"
            onClick={() => setRoute('landing')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Kontak
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <button
              type="button"
              onClick={navigateToDashboard}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#3159D9] to-[#7452E8] hover:opacity-95 rounded-full border border-white/25 shadow-md transition-opacity cursor-pointer whitespace-nowrap shrink-0"
            >
              Portal Pelanggan
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPreselectedServiceId(undefined);
                setRoute('auth');
              }}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#3159D9] to-[#7452E8] hover:opacity-95 rounded-full border border-white/25 shadow-md transition-opacity cursor-pointer whitespace-nowrap shrink-0"
            >
              Login / Daftar
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E2E7F0] px-4 py-4 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-medium text-[#171B2C]">
            <a
              href="#beranda"
              onClick={() => {
                setRoute('landing');
                setMobileMenuOpen(false);
              }}
              className="py-1.5"
            >
              Beranda
            </a>
            <a
              href="#layanan"
              onClick={() => {
                setRoute('landing');
                setMobileMenuOpen(false);
              }}
              className="py-1.5"
            >
              Layanan
            </a>
            <a
              href="#tentang"
              onClick={() => {
                setRoute('landing');
                setMobileMenuOpen(false);
              }}
              className="py-1.5"
            >
              Tentang Kami
            </a>
            <a
              href="#testimoni"
              onClick={() => {
                setRoute('landing');
                setMobileMenuOpen(false);
              }}
              className="py-1.5"
            >
              Testimoni
            </a>
            <a
              href="#kontak"
              onClick={() => {
                setRoute('landing');
                setMobileMenuOpen(false);
              }}
              className="py-1.5"
            >
              Kontak
            </a>
          </div>
          <div className="pt-3 border-t border-[#E2E7F0] flex flex-wrap gap-2">
            {currentUser ? (
              <button
                type="button"
                onClick={navigateToDashboard}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#102A67] rounded-xl"
              >
                Buka Portal Pelanggan
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setRoute('auth');
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-[#102A67] bg-[#F4F6FB] border border-[#E2E7F0] rounded-xl"
              >
                Login / Daftar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Route View */}
      <div className="flex-1">
        {route === 'landing' && (
          <LandingPage
            onNavigateOrder={navigateToOrder}
            onNavigateAuth={() => {
              setPreselectedServiceId(undefined);
              setRoute('auth');
            }}
            onNavigateDashboard={navigateToDashboard}
          />
        )}

        {route === 'auth' && (
          <AuthView
            onSuccess={handleAuthSuccess}
            onBackHome={() => setRoute('landing')}
          />
        )}

        {route === 'order_flow' && (
          <OrderCreationFlow
            initialServiceId={preselectedServiceId}
            onOrderCreated={handleOrderCreated}
            onCancel={() => setRoute('landing')}
            onRequireAuth={() => setRoute('auth')}
          />
        )}

        {route === 'customer_portal' && (
          <CustomerPortal
            initialSelectedOrderId={highlightedOrderId}
            onCreateNewOrder={navigateToOrder}
            onBackToSite={() => setRoute('landing')}
          />
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}
