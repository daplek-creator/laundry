import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AdminActivityLog,
  BusinessSettings,
  CreateOrderInput,
  CustomerAddress,
  LaundryOrder,
  LaundryService,
  OrderStatus,
  PaymentStatus,
  ServiceAddon,
  UserProfile,
} from '../types/domain.ts';
import {
  INITIAL_ACTIVITY_LOGS,
  INITIAL_ADDRESSES,
  INITIAL_ADDONS,
  INITIAL_BUSINESS_SETTINGS,
  INITIAL_ORDERS,
  INITIAL_SERVICES,
  INITIAL_USERS,
} from '../data/seedData.ts';
import {
  calculateAuthoritativeOrderPrice,
  calculateFinalConfirmedPrice,
  canTransitionOrderStatus,
  ORDER_STATUS_LABELS,
} from '../lib/pricing.ts';
import { isSupabaseConfigured, supabase } from '../lib/supabase.ts';

interface AppContextValue {
  // Customer Auth State
  currentUser: UserProfile | null;
  isLoadingAuth: boolean;
  isSupabaseLive: boolean;
  loginWithEmail: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerCustomer: (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (input: { fullName: string; phone: string }) => Promise<{ ok: boolean; error?: string }>;

  // Dedicated /admin Authentication (username: admin, password: laundry2026)
  isAdminAuthenticated: boolean;
  loginAdminPortal: (username: string, password: string) => { ok: boolean; error?: string };
  logoutAdminPortal: () => void;

  // Data Collections
  services: LaundryService[];
  addons: ServiceAddon[];
  orders: LaundryOrder[]; // Customer's own orders
  allOrdersAdmin: LaundryOrder[]; // All orders for /admin portal
  addresses: CustomerAddress[];
  customers: UserProfile[];
  activityLogs: AdminActivityLog[];
  settings: BusinessSettings;

  // Customer Operations
  createOrder: (input: CreateOrderInput) => Promise<{ ok: boolean; order?: LaundryOrder; error?: string }>;
  cancelCustomerOrder: (orderId: string, reason: string) => Promise<{ ok: boolean; error?: string }>;
  saveAddress: (
    addr: Omit<CustomerAddress, 'id' | 'userId'> & { id?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteAddress: (id: string) => Promise<{ ok: boolean; error?: string }>;

  // Admin Operations (/admin)
  adminUpdateOrderStatus: (params: {
    orderId: string;
    nextStatus: OrderStatus;
    note: string;
    internalNote?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  adminUpdateActualWeightAndPrice: (params: {
    orderId: string;
    actualQuantity: number;
    adjustmentReason: string;
    customFinalTotal?: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  adminRecordPayment: (params: {
    orderId: string;
    paymentStatus: PaymentStatus;
    amountRecorded: number;
    paymentMethod: string;
    transactionReference: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  adminSaveService: (
    srv: Omit<LaundryService, 'id'> & { id?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  adminDeleteService: (serviceId: string) => Promise<{ ok: boolean; error?: string }>;
  adminToggleServiceActive: (serviceId: string) => Promise<{ ok: boolean; error?: string }>;
  adminSaveAddon: (
    addon: Omit<ServiceAddon, 'id'> & { id?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  adminToggleAddonActive: (addonId: string) => Promise<{ ok: boolean; error?: string }>;
  adminUpdateSettings: (newSettings: BusinessSettings) => Promise<{ ok: boolean; error?: string }>;
  resetDemoData: () => void;
}

const STORAGE_KEYS = {
  USER_ID: 'tfl_active_user_id_v2',
  ADMIN_AUTH: 'tfl_admin_session_v2',
  USERS: 'tfl_users_v2',
  SERVICES: 'tfl_services_v2',
  ADDONS: 'tfl_addons_v2',
  ORDERS: 'tfl_orders_v2',
  ADDRESSES: 'tfl_addresses_v2',
  SETTINGS: 'tfl_settings_v2',
  LOGS: 'tfl_admin_logs_v2',
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage write failed:', e);
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => loadStorage(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    loadStorage<string | null>(STORAGE_KEYS.USER_ID, null)
  );
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() =>
    loadStorage<boolean>(STORAGE_KEYS.ADMIN_AUTH, false)
  );
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);

  const [services, setServices] = useState<LaundryService[]>(() =>
    loadStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES)
  );
  const [addons, setAddons] = useState<ServiceAddon[]>(() =>
    loadStorage(STORAGE_KEYS.ADDONS, INITIAL_ADDONS)
  );
  const [allOrders, setAllOrders] = useState<LaundryOrder[]>(() =>
    loadStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS)
  );
  const [allAddresses, setAllAddresses] = useState<CustomerAddress[]>(() =>
    loadStorage(STORAGE_KEYS.ADDRESSES, INITIAL_ADDRESSES)
  );
  const [settings, setSettings] = useState<BusinessSettings>(() => {
    const loaded = loadStorage(STORAGE_KEYS.SETTINGS, INITIAL_BUSINESS_SETTINGS);
    if (!loaded.websiteContent) {
      return { ...INITIAL_BUSINESS_SETTINGS, ...loaded, websiteContent: INITIAL_BUSINESS_SETTINGS.websiteContent };
    }
    return {
      ...INITIAL_BUSINESS_SETTINGS,
      ...loaded,
      websiteContent: {
        ...INITIAL_BUSINESS_SETTINGS.websiteContent,
        ...loaded.websiteContent,
      },
    };
  });
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>(() =>
    loadStorage(STORAGE_KEYS.LOGS, INITIAL_ACTIVITY_LOGS)
  );

  // Sync changes to persistent storage
  useEffect(() => saveStorage(STORAGE_KEYS.USERS, users), [users]);
  useEffect(() => saveStorage(STORAGE_KEYS.USER_ID, currentUserId), [currentUserId]);
  useEffect(() => saveStorage(STORAGE_KEYS.ADMIN_AUTH, isAdminAuthenticated), [isAdminAuthenticated]);
  useEffect(() => saveStorage(STORAGE_KEYS.SERVICES, services), [services]);
  useEffect(() => saveStorage(STORAGE_KEYS.ADDONS, addons), [addons]);
  useEffect(() => saveStorage(STORAGE_KEYS.ORDERS, allOrders), [allOrders]);
  useEffect(() => saveStorage(STORAGE_KEYS.ADDRESSES, allAddresses), [allAddresses]);
  useEffect(() => saveStorage(STORAGE_KEYS.SETTINGS, settings), [settings]);
  useEffect(() => saveStorage(STORAGE_KEYS.LOGS, activityLogs), [activityLogs]);

  // Listen to live Supabase Auth session if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingAuth(true);
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          await syncSupabaseUser(session.user.id, session.user.email || '');
        }
      })
      .finally(() => setIsLoadingAuth(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await syncSupabaseUser(session.user.id, session.user.email || '');
      } else {
        setCurrentUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function syncSupabaseUser(uid: string, email: string) {
    if (!supabase) return;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, created_at, updated_at')
        .eq('id', uid)
        .single();

      const syncedProfile: UserProfile = {
        id: uid,
        email: profileData?.email || email,
        fullName: profileData?.full_name || email.split('@')[0],
        phone: profileData?.phone || '',
        role: 'customer',
        createdAt: profileData?.created_at || new Date().toISOString(),
        updatedAt: profileData?.updated_at || new Date().toISOString(),
      };

      setUsers((prev) => {
        const exists = prev.some((u) => u.id === uid);
        if (exists) return prev.map((u) => (u.id === uid ? syncedProfile : u));
        return [...prev, syncedProfile];
      });
      setCurrentUserId(uid);
    } catch (err) {
      console.error('Supabase user sync error:', err);
    }
  }

  const currentUser = users.find((u) => u.id === currentUserId) || null;

  // Customer orders (strictly isolated to logged-in customer)
  const customerOrders = React.useMemo(() => {
    if (!currentUser) return [];
    return allOrders
      .filter((o) => o.customerId === currentUser.id)
      .map((o) => ({
        ...o,
        internalAdminNotes: '',
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allOrders, currentUser]);

  // All orders for /admin portal
  const allOrdersSorted = React.useMemo(() => {
    return [...allOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allOrders]);

  const visibleAddresses = React.useMemo(() => {
    if (!currentUser) return [];
    return allAddresses.filter((a) => a.userId === currentUser.id);
  }, [allAddresses, currentUser]);

  const appendAdminLog = (actionType: string, targetReference: string, details: string) => {
    const newLog: AdminActivityLog = {
      id: `log-${Date.now()}`,
      adminUserId: 'usr-admin-1',
      adminName: 'Admin The Fresh Laundry',
      actionType,
      targetReference,
      details,
      createdAt: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  // Dedicated /admin Authentication (username: admin, password: laundry2026)
  const loginAdminPortal = (
    username: string,
    password: string
  ): { ok: boolean; error?: string } => {
    const cleanUser = username.trim().toLowerCase();
    if (cleanUser === 'admin' && password === 'laundry2026') {
      setIsAdminAuthenticated(true);
      appendAdminLog('ADMIN_LOGIN', 'PORTAL_ADMIN', 'Admin berhasil masuk ke dashboard /admin.');
      return { ok: true };
    }
    return {
      ok: false,
      error: 'Username atau kata sandi salah. Gunakan username "admin" dan kata sandi yang benar.',
    };
  };

  const logoutAdminPortal = () => {
    setIsAdminAuthenticated(false);
  };

  // Customer Authentication Handlers
  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { ok: false, error: 'Email dan kata sandi wajib diisi.' };
    }

    if (isSupabaseConfigured && supabase) {
      setIsLoadingAuth(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      setIsLoadingAuth(false);
      if (error) {
        return { ok: false, error: `Gagal masuk: ${error.message}` };
      }
      if (data.user) {
        await syncSupabaseUser(data.user.id, data.user.email || cleanEmail);
      }
      return { ok: true };
    }

    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      return {
        ok: false,
        error: 'Akun dengan email tersebut belum ditemukan. Silakan daftar akun baru terlebih dahulu.',
      };
    }
    if (password.length < 6) {
      return { ok: false, error: 'Kata sandi minimal 6 karakter.' };
    }

    setCurrentUserId(found.id);
    return { ok: true };
  };

  const registerCustomer = async (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const cleanName = input.fullName.trim();
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanPhone = input.phone.trim();

    if (cleanName.length < 2) {
      return { ok: false, error: 'Nama lengkap minimal 2 karakter.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, error: 'Format alamat email tidak valid.' };
    }
    if (cleanPhone.length < 9) {
      return { ok: false, error: 'Nomor WhatsApp/telepon minimal 9 digit.' };
    }
    if (input.password.length < 6) {
      return { ok: false, error: 'Kata sandi harus terdiri dari minimal 6 karakter.' };
    }

    if (isSupabaseConfigured && supabase) {
      setIsLoadingAuth(true);
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: input.password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
        },
      });
      setIsLoadingAuth(false);
      if (error) {
        return { ok: false, error: `Pendaftaran gagal: ${error.message}` };
      }
      if (data.user) {
        await syncSupabaseUser(data.user.id, cleanEmail);
      }
      return { ok: true };
    }

    const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return { ok: false, error: 'Email ini sudah terdaftar. Silakan masuk menggunakan akun Anda.' };
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      fullName: cleanName,
      phone: cleanPhone,
      role: 'customer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    return { ok: true };
  };

  const loginWithGoogle = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        ok: false,
        error: 'Silakan daftar atau masuk menggunakan formulir Email & Kata Sandi di atas.',
      };
    }

    const redirectTo =
      (import.meta.env.VITE_OAUTH_REDIRECT_URL as string) || window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUserId(null);
  };

  const updateProfile = async (input: {
    fullName: string;
    phone: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser) return { ok: false, error: 'Anda belum masuk.' };
    const cleanName = input.fullName.trim();
    const cleanPhone = input.phone.trim();
    if (cleanName.length < 2) return { ok: false, error: 'Nama lengkap tidak valid.' };
    if (cleanPhone.length < 9) return { ok: false, error: 'Nomor telepon tidak valid.' };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: cleanName, phone: cleanPhone, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);
      if (error) return { ok: false, error: error.message };
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? { ...u, fullName: cleanName, phone: cleanPhone, updatedAt: new Date().toISOString() }
          : u
      )
    );
    return { ok: true };
  };

  // Order Creation
  const createOrder = async (
    input: CreateOrderInput
  ): Promise<{ ok: boolean; order?: LaundryOrder; error?: string }> => {
    if (!currentUser) {
      return { ok: false, error: 'Silakan masuk terlebih dahulu untuk membuat pesanan.' };
    }

    const service = services.find((s) => s.id === input.serviceId && s.isActive);
    if (!service) {
      return { ok: false, error: 'Layanan yang dipilih tidak ditemukan atau sedang tidak aktif.' };
    }

    if (!input.scheduledDate || !input.scheduledTimeSlot) {
      return { ok: false, error: 'Tanggal dan waktu penyerahan/penjemputan wajib dipilih.' };
    }

    if (input.handoffMethod === 'pickup_delivery' && input.pickupAddress.trim().length < 10) {
      return {
        ok: false,
        error: 'Alamat penjemputan dan pengantaran wajib diisi lengkap (minimal 10 karakter).',
      };
    }

    const selectedAddons = addons.filter((a) => input.selectedAddonIds.includes(a.id) && a.isActive);

    try {
      const breakdown = calculateAuthoritativeOrderPrice({
        service,
        requestedQuantity: input.estimatedQuantity,
        selectedAddons,
        handoffMethod: input.handoffMethod,
        settings,
      });

      const now = new Date();
      const completionDate = new Date(now.getTime() + service.estimatedHours * 60 * 60 * 1000);
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `TFL-${now.getFullYear().toString().slice(-2)}${String(
        now.getMonth() + 1
      ).padStart(2, '0')}-${randomDigits}`;

      const orderId = `ord-${Date.now()}`;

      const newOrder: LaundryOrder = {
        id: orderId,
        orderNumber,
        customerId: currentUser.id,
        customerName: input.customerName.trim() || currentUser.fullName,
        customerPhone: input.customerPhone.trim() || currentUser.phone,
        customerEmail: currentUser.email,
        serviceId: service.id,
        serviceNameSnapshot: service.name,
        serviceUnitSnapshot: service.unit,
        unitPriceSnapshot: breakdown.unitPriceSnapshot,
        minQuantitySnapshot: service.minQuantity,
        estimatedQuantity: breakdown.billableQuantity,
        actualQuantity: null,
        addons: breakdown.addonItems,
        handoffMethod: input.handoffMethod,
        pickupAddress:
          input.handoffMethod === 'pickup_delivery'
            ? input.pickupAddress.trim()
            : 'Antar Mandiri ke Outlet The Fresh Laundry',
        scheduledDate: input.scheduledDate,
        scheduledTimeSlot: input.scheduledTimeSlot,
        customerNotes: input.customerNotes.trim(),
        internalAdminNotes: '',
        priceAdjustmentReason: '',
        status: 'pending_confirmation',
        paymentStatus: 'unpaid',
        paymentMethod: input.paymentMethod,
        subtotalEstimated: breakdown.subtotalEstimated,
        addonsTotal: breakdown.addonsTotal,
        deliveryFee: breakdown.deliveryFee,
        discountAmount: breakdown.discountAmount,
        estimatedTotal: breakdown.estimatedTotal,
        finalTotal: null,
        estimatedCompletionAt: completionDate.toISOString(),
        completedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        statusHistory: [
          {
            id: `hist-${Date.now()}`,
            orderId,
            status: 'pending_confirmation',
            note: 'Pesanan berhasil dibuat oleh pelanggan. Menunggu konfirmasi admin.',
            changedByUserId: currentUser.id,
            changedByName: currentUser.fullName,
            createdAt: now.toISOString(),
          },
        ],
        payment: {
          id: `pay-${Date.now()}`,
          orderId,
          paymentMethod: input.paymentMethod,
          amountDue: breakdown.estimatedTotal,
          amountRecorded: 0,
          status: 'unpaid',
          transactionReference: '',
          recordedByName: 'Sistem',
          paidAt: null,
          updatedAt: now.toISOString(),
        },
      };

      setAllOrders((prev) => [newOrder, ...prev]);
      return { ok: true, order: newOrder };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Gagal menghitung harga pesanan.' };
    }
  };

  const cancelCustomerOrder = async (
    orderId: string,
    reason: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser) return { ok: false, error: 'Anda belum masuk.' };
    const target = allOrders.find((o) => o.id === orderId);
    if (!target) return { ok: false, error: 'Pesanan tidak ditemukan.' };
    if (target.customerId !== currentUser.id) {
      return { ok: false, error: 'Akses ditolak.' };
    }
    if (target.status !== 'pending_confirmation') {
      return {
        ok: false,
        error: 'Pesanan yang sudah dikonfirmasi hanya dapat dibatalkan melalui Admin.',
      };
    }

    const now = new Date().toISOString();
    setAllOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'cancelled',
              updatedAt: now,
              statusHistory: [
                ...o.statusHistory,
                {
                  id: `hist-${Date.now()}`,
                  orderId,
                  status: 'cancelled',
                  note: `Dibatalkan oleh pelanggan: ${reason.trim() || 'Perubahan jadwal'}`,
                  changedByUserId: currentUser.id,
                  changedByName: currentUser.fullName,
                  createdAt: now,
                },
              ],
            }
          : o
      )
    );
    return { ok: true };
  };

  // Address Management
  const saveAddress = async (
    addr: Omit<CustomerAddress, 'id' | 'userId'> & { id?: string }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser) return { ok: false, error: 'Anda belum masuk.' };
    if (!addr.label.trim() || !addr.fullAddress.trim() || !addr.recipientName.trim()) {
      return { ok: false, error: 'Label alamat, nama penerima, dan alamat lengkap wajib diisi.' };
    }

    setAllAddresses((prev) => {
      let updated = [...prev];
      if (addr.isDefault) {
        updated = updated.map((item) =>
          item.userId === currentUser.id ? { ...item, isDefault: false } : item
        );
      }

      if (addr.id) {
        return updated.map((item) =>
          item.id === addr.id && item.userId === currentUser.id
            ? { ...item, ...addr, id: addr.id, userId: currentUser.id }
            : item
        );
      }

      const newAddr: CustomerAddress = {
        ...addr,
        id: `addr-${Date.now()}`,
        userId: currentUser.id,
      };
      return [newAddr, ...updated];
    });

    return { ok: true };
  };

  const deleteAddress = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser) return { ok: false, error: 'Anda belum masuk.' };
    setAllAddresses((prev) => prev.filter((a) => !(a.id === id && a.userId === currentUser.id)));
    return { ok: true };
  };

  // Admin Operations (Protected by isAdminAuthenticated)
  const adminUpdateOrderStatus = async (params: {
    orderId: string;
    nextStatus: OrderStatus;
    note: string;
    internalNote?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!isAdminAuthenticated) {
      return { ok: false, error: 'Otorisasi ditolak: Silakan login di /admin.' };
    }

    const order = allOrders.find((o) => o.id === params.orderId);
    if (!order) return { ok: false, error: 'Pesanan tidak ditemukan.' };

    if (!canTransitionOrderStatus(order.status, params.nextStatus)) {
      return {
        ok: false,
        error: `Transisi status tidak valid dari "${ORDER_STATUS_LABELS[order.status]}" ke "${
          ORDER_STATUS_LABELS[params.nextStatus]
        }".`,
      };
    }

    const now = new Date().toISOString();
    const statusChanged = order.status !== params.nextStatus;

    setAllOrders((prev) =>
      prev.map((o) => {
        if (o.id !== params.orderId) return o;
        return {
          ...o,
          status: params.nextStatus,
          internalAdminNotes:
            params.internalNote !== undefined ? params.internalNote : o.internalAdminNotes,
          completedAt: params.nextStatus === 'completed' ? now : o.completedAt,
          updatedAt: now,
          statusHistory: statusChanged
            ? [
                ...o.statusHistory,
                {
                  id: `hist-${Date.now()}`,
                  orderId: o.id,
                  status: params.nextStatus,
                  note:
                    params.note.trim() ||
                    `Status diperbarui menjadi ${ORDER_STATUS_LABELS[params.nextStatus]}.`,
                  changedByUserId: 'usr-admin-1',
                  changedByName: 'Admin Operasional',
                  createdAt: now,
                },
              ]
            : o.statusHistory,
        };
      })
    );

    appendAdminLog(
      'UPDATE_STATUS',
      order.orderNumber,
      `Mengubah status ke ${ORDER_STATUS_LABELS[params.nextStatus]}.`
    );

    return { ok: true };
  };

  const adminUpdateActualWeightAndPrice = async (params: {
    orderId: string;
    actualQuantity: number;
    adjustmentReason: string;
    customFinalTotal?: number;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!isAdminAuthenticated) {
      return { ok: false, error: 'Otorisasi ditolak.' };
    }

    if (params.actualQuantity <= 0 || !Number.isFinite(params.actualQuantity)) {
      return { ok: false, error: 'Berat atau jumlah aktual harus lebih besar dari 0.' };
    }

    const order = allOrders.find((o) => o.id === params.orderId);
    if (!order) return { ok: false, error: 'Pesanan tidak ditemukan.' };

    const calc = calculateFinalConfirmedPrice({
      unitPriceSnapshot: order.unitPriceSnapshot,
      minQuantitySnapshot: order.minQuantitySnapshot,
      actualQuantity: params.actualQuantity,
      addonsTotal: order.addonsTotal,
      deliveryFee: order.deliveryFee,
      discountAmount: order.discountAmount,
      freeDeliveryMinOrder: settings.freeDeliveryMinOrder,
      handoffMethod: order.handoffMethod,
      standardDeliveryFee: settings.pickupDeliveryFee,
    });

    const confirmedTotal =
      params.customFinalTotal !== undefined && params.customFinalTotal >= 0
        ? Math.round(params.customFinalTotal)
        : calc.finalTotal;

    const now = new Date().toISOString();

    setAllOrders((prev) =>
      prev.map((o) => {
        if (o.id !== params.orderId) return o;
        return {
          ...o,
          actualQuantity: params.actualQuantity,
          deliveryFee: calc.recalculatedDelivery,
          finalTotal: confirmedTotal,
          priceAdjustmentReason:
            params.adjustmentReason.trim() ||
            `Penyesuaian timbangan aktual ${params.actualQuantity} ${o.serviceUnitSnapshot}.`,
          updatedAt: now,
          payment: {
            ...o.payment,
            amountDue: confirmedTotal,
            updatedAt: now,
          },
          statusHistory: [
            ...o.statusHistory,
            {
              id: `hist-${Date.now()}`,
              orderId: o.id,
              status: o.status,
              note: `Konfirmasi berat/jumlah aktual: ${params.actualQuantity} ${
                o.serviceUnitSnapshot
              }. Total tagihan akhir dikonfirmasi Rp${confirmedTotal.toLocaleString('id-ID')}.`,
              changedByUserId: 'usr-admin-1',
              changedByName: 'Admin Operasional',
              createdAt: now,
            },
          ],
        };
      })
    );

    appendAdminLog(
      'RECORD_ACTUAL_WEIGHT',
      order.orderNumber,
      `Mencatat kuantitas aktual ${params.actualQuantity} ${order.serviceUnitSnapshot}. Total akhir: Rp${confirmedTotal.toLocaleString('id-ID')}.`
    );

    return { ok: true };
  };

  const adminRecordPayment = async (params: {
    orderId: string;
    paymentStatus: PaymentStatus;
    amountRecorded: number;
    paymentMethod: string;
    transactionReference: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!isAdminAuthenticated) {
      return { ok: false, error: 'Otorisasi ditolak.' };
    }

    const order = allOrders.find((o) => o.id === params.orderId);
    if (!order) return { ok: false, error: 'Pesanan tidak ditemukan.' };

    const now = new Date().toISOString();
    const effectiveDue = order.finalTotal ?? order.estimatedTotal;

    setAllOrders((prev) =>
      prev.map((o) => {
        if (o.id !== params.orderId) return o;
        return {
          ...o,
          paymentStatus: params.paymentStatus,
          paymentMethod: params.paymentMethod || o.paymentMethod,
          updatedAt: now,
          payment: {
            ...o.payment,
            paymentMethod: params.paymentMethod || o.payment.paymentMethod,
            amountDue: effectiveDue,
            amountRecorded: Math.max(0, Math.round(params.amountRecorded)),
            status: params.paymentStatus,
            transactionReference: params.transactionReference.trim(),
            recordedByName: 'Admin Operasional',
            paidAt: params.paymentStatus === 'paid' ? now : o.payment.paidAt,
            updatedAt: now,
          },
        };
      })
    );

    appendAdminLog(
      'VERIFY_PAYMENT',
      order.orderNumber,
      `Memperbarui pembayaran ke ${params.paymentStatus.toUpperCase()} (Rp${params.amountRecorded.toLocaleString('id-ID')})`
    );

    return { ok: true };
  };

  const adminSaveService = async (
    srv: Omit<LaundryService, 'id'> & { id?: string }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!isAdminAuthenticated) return { ok: false, error: 'Otorisasi ditolak.' };
    if (!srv.name.trim() || srv.pricePerUnit < 0 || srv.minQuantity <= 0) {
      return { ok: false, error: 'Nama layanan, harga valid, dan kuantitas minimum wajib diisi.' };
    }

    if (srv.id) {
      setServices((prev) =>
        prev.map((item) => (item.id === srv.id ? { ...srv, id: srv.id } : item))
      );
      appendAdminLog('UPDATE_SERVICE', srv.code, `Memperbarui layanan "${srv.name}".`);
    } else {
      const newService: LaundryService = {
        ...srv,
        id: `srv-${Date.now()}`,
      };
      setServices((prev) => [...prev, newService]);
      appendAdminLog('CREATE_SERVICE', srv.code, `Menambahkan layanan baru "${srv.name}".`);
    }

    return { ok: true };
  };

  const adminDeleteService = async (
    serviceId: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!isAdminAuthenticated) return { ok: false, error: 'Otorisasi ditolak.' };
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    appendAdminLog('DELETE_SERVICE', serviceId, 'Menghapus layanan dari katalog.');
    return { ok: true };
  };

  const adminToggleServiceActive = async (
    serviceId: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!isAdminAuthenticated) return { ok: false, error: 'Otorisasi ditolak.' };
    const target = services.find((s) => s.id === serviceId);
    if (!target) return { ok: false, error: 'Layanan tidak ditemukan.' };

    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, isActive: !s.isActive } : s))
    );
    appendAdminLog(
      'TOGGLE_SERVICE',
      target.code,
      `Mengubah status layanan "${target.name}" menjadi ${!target.isActive ? 'Aktif' : 'Nonaktif'}.`
    );
    return { ok: true };
  };

  const adminSaveAddon = async (
    addon: Omit<ServiceAddon, 'id'> & { id?: string }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!isAdminAuthenticated) return { ok: false, error: 'Otorisasi ditolak.' };
    if (!addon.name.trim() || addon.price < 0) {
      return { ok: false, error: 'Nama add-on dan harga wajib valid.' };
    }
    if (addon.id) {
      setAddons((prev) =>
        prev.map((a) => (a.id === addon.id ? { ...addon, id: addon.id } : a))
      );
    } else {
      setAddons((prev) => [...prev, { ...addon, id: `add-${Date.now()}` }]);
    }
    appendAdminLog('SAVE_ADDON', addon.code, `Menyimpan layanan tambahan "${addon.name}".`);
    return { ok: true };
  };

  const adminToggleAddonActive = async (
    addonId: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!isAdminAuthenticated) return { ok: false, error: 'Otorisasi ditolak.' };
    setAddons((prev) =>
      prev.map((a) => (a.id === addonId ? { ...a, isActive: !a.isActive } : a))
    );
    return { ok: true };
  };

  const adminUpdateSettings = async (
    newSettings: BusinessSettings
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!isAdminAuthenticated) return { ok: false, error: 'Otorisasi ditolak.' };
    setSettings(newSettings);
    appendAdminLog(
      'UPDATE_WEBSITE_CONTENT',
      'PENGATURAN_WEBSITE',
      'Memperbarui tampilan konten website, kontak WhatsApp, dan konfigurasi bisnis.'
    );
    return { ok: true };
  };

  const resetDemoData = () => {
    setUsers(INITIAL_USERS);
    setServices(INITIAL_SERVICES);
    setAddons(INITIAL_ADDONS);
    setAllOrders(INITIAL_ORDERS);
    setAllAddresses(INITIAL_ADDRESSES);
    setSettings(INITIAL_BUSINESS_SETTINGS);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoadingAuth,
        isSupabaseLive: isSupabaseConfigured,
        loginWithEmail,
        registerCustomer,
        loginWithGoogle,
        logout,
        updateProfile,
        isAdminAuthenticated,
        loginAdminPortal,
        logoutAdminPortal,
        services,
        addons,
        orders: customerOrders,
        allOrdersAdmin: allOrdersSorted,
        addresses: visibleAddresses,
        customers: users.filter((u) => u.role === 'customer'),
        activityLogs,
        settings,
        createOrder,
        cancelCustomerOrder,
        saveAddress,
        deleteAddress,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp harus digunakan di dalam AppProvider.');
  }
  return ctx;
}
