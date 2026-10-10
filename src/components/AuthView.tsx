import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

interface AuthViewProps {
  onSuccess: () => void;
  onBackHome: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onBackHome }) => {
  const {
    loginWithEmail,
    registerCustomer,
    loginWithGoogle,
    isSupabaseLive,
    isLoadingAuth,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await loginWithEmail(email, password);
        if (!res.ok) {
          setErrorMsg(res.error || 'Gagal masuk.');
        } else {
          onSuccess();
        }
      } else if (mode === 'register') {
        const res = await registerCustomer({ fullName, email, phone, password });
        if (!res.ok) {
          setErrorMsg(res.error || 'Gagal mendaftar.');
        } else {
          onSuccess();
        }
      } else if (mode === 'reset') {
        if (!email.trim() || !email.includes('@')) {
          setErrorMsg('Masukkan alamat email terdaftar Anda.');
        } else {
          setInfoMsg(
            isSupabaseLive
              ? 'Tautan pengaturan ulang kata sandi telah dikirim ke email Anda jika terdaftar.'
              : 'Permintaan pengaturan ulang kata sandi telah diterima. Silakan periksa pesan masuk Anda.'
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    const res = await loginWithGoogle();
    if (!res.ok) {
      setErrorMsg(res.error || 'Silakan daftar atau masuk menggunakan formulir di atas.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#F4F6FB] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#68738A] hover:text-[#102A67] mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>

        <div className="bg-white rounded-2xl border border-[#E2E7F0] p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <BrandLogo className="mb-4" />
            <h1 className="text-2xl font-bold text-[#102A67] tracking-tight">
              {mode === 'login' && 'Masuk ke Akun Pelanggan'}
              {mode === 'register' && 'Daftar Akun Pelanggan Baru'}
              {mode === 'reset' && 'Atur Ulang Kata Sandi'}
            </h1>
            <p className="text-xs text-[#68738A] mt-1.5 leading-relaxed">
              {mode === 'login' &&
                'Masuk untuk memesan layanan laundry, mengatur jadwal penjemputan, dan memantau status pakaian Anda.'}
              {mode === 'register' &&
                'Buat akun pelanggan dalam beberapa detik untuk kemudahan pemesanan dan pelacakan status.'}
              {mode === 'reset' &&
                'Masukkan email akun Anda untuk menerima panduan pengaturan ulang kata sandi.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4F6FB] rounded-xl mb-6 border border-[#E2E7F0]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#102A67] shadow-2xs'
                  : 'text-[#68738A] hover:text-[#171B2C]'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#102A67] shadow-2xs'
                  : 'text-[#68738A] hover:text-[#171B2C]'
              }`}
            >
              Daftar Akun
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div
              role="status"
              className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-semibold text-[#171B2C] mb-1.5"
                >
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#68738A] absolute left-3.5 top-3" />
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Nadia Pramesti"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] focus:outline-none focus:border-[#3159D9]"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-[#171B2C] mb-1.5"
              >
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#68738A] absolute left-3.5 top-3" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] focus:outline-none focus:border-[#3159D9]"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-phone"
                  className="block text-xs font-semibold text-[#171B2C] mb-1.5"
                >
                  Nomor WhatsApp / Telepon Aktif
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#68738A] absolute left-3.5 top-3" />
                  <input
                    id="auth-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] font-mono-tabular focus:outline-none focus:border-[#3159D9]"
                  />
                </div>
              </div>
            )}

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="auth-password"
                    className="text-xs font-semibold text-[#171B2C]"
                  >
                    Kata Sandi
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setErrorMsg(null);
                        setInfoMsg(null);
                      }}
                      className="text-xs font-medium text-[#3159D9] hover:underline cursor-pointer"
                    >
                      Lupa kata sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#68738A] absolute left-3.5 top-3" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#E2E7F0] rounded-xl text-[#171B2C] focus:outline-none focus:border-[#3159D9]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoadingAuth}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-[#3159D9] to-[#7452E8] hover:opacity-95 disabled:opacity-50 rounded-xl transition-opacity cursor-pointer"
            >
              {isSubmitting || isLoadingAuth
                ? 'Memproses...'
                : mode === 'login'
                ? 'Masuk Sekarang'
                : mode === 'register'
                ? 'Buat Akun Pelanggan'
                : 'Kirim Instruksi Pemulihan'}
            </button>
          </form>

          {isSupabaseLive && (
            <div className="mt-5 pt-5 border-t border-[#E2E7F0]">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-2.5 px-4 text-xs font-semibold text-[#171B2C] bg-white hover:bg-[#F4F6FB] border border-[#E2E7F0] rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2.5"
              >
                <span>Lanjutkan dengan Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
