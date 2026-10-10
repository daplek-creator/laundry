import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Lock, ShieldCheck, User } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { BrandLogo } from '../../components/BrandLogo.tsx';

interface AdminLoginProps {
  onBackToPublicSite: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onBackToPublicSite }) => {
  const { loginAdminPortal } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = loginAdminPortal(username, password);
    if (!res.ok) {
      setErrorMsg(res.error || 'Gagal masuk ke dashboard admin.');
    }
  };

  return (
    <div className="min-h-screen bg-[#102A67] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#3159D9]/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#7452E8]/25 blur-3xl"
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <BrandLogo variant="light" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold text-white tracking-tight">
          Portal Manajemen Admin
        </h1>
        <p className="mt-1.5 text-center text-xs text-white/75">
          Masukkan kredensial khusus administrator untuk mengelola operasional dan tampilan website.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-[#E2E7F0] sm:px-8">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-[#E2E7F0]">
            <div className="w-9 h-9 rounded-xl bg-[#102A67] text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#102A67]">Autentikasi /admin</h2>
              <p className="text-[11px] text-[#68738A]">Akses Terbatas Pengelola Bisnis</p>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-[#FEE2E2] border border-[#EF4444]/30 text-xs font-medium text-[#B91C1C]"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-semibold text-[#171B2C] mb-1.5"
              >
                Username Admin
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#68738A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username admin"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E7F0] bg-[#F4F6FB] text-sm text-[#171B2C] focus:bg-white focus:outline-none focus:border-[#3159D9]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-[#171B2C] mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#68738A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E7F0] bg-[#F4F6FB] text-sm text-[#171B2C] focus:bg-white focus:outline-none focus:border-[#3159D9]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#3159D9] to-[#7452E8] hover:opacity-95 text-white text-sm font-semibold shadow-md transition-opacity flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Masuk ke Dashboard Admin</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E2E7F0] flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToPublicSite}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68738A] hover:text-[#102A67] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Website Utama</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
