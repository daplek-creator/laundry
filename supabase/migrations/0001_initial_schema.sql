-- =============================================================================
-- THE FRESH LAUNDRY — SUPABASE POSTGRESQL SCHEMA, RLS, & SEED MIGRATION
-- Target: Supabase PostgreSQL 15+
-- Instructions: Run this entire script in the Supabase SQL Editor.
-- =============================================================================

-- Enable UUID generation extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ENUMS & CUSTOM TYPES
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role_type AS ENUM ('customer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE service_unit_type AS ENUM ('kg', 'item', 'paket');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE handoff_method_type AS ENUM ('drop_off', 'pickup_delivery');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status_type AS ENUM (
    'pending_confirmation',
    'confirmed',
    'picked_up',
    'washing',
    'ironing',
    'quality_check',
    'ready_for_delivery',
    'completed',
    'cancelled',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_type AS ENUM (
    'unpaid',
    'pending_verification',
    'partially_paid',
    'paid'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLES
-- -----------------------------------------------------------------------------

-- 2.1 Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 User Roles (Strict separation from public profiles to prevent self-promotion)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role_type NOT NULL DEFAULT 'customer',
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Customer Saved Addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  full_address TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Laundry Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price_per_unit INTEGER NOT NULL CHECK (price_per_unit >= 0),
  unit service_unit_type NOT NULL DEFAULT 'kg',
  min_quantity NUMERIC(6,2) NOT NULL DEFAULT 1.0 CHECK (min_quantity > 0),
  estimated_hours INTEGER NOT NULL DEFAULT 48 CHECK (estimated_hours > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_key TEXT NOT NULL DEFAULT 'wash_fold',
  features TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Service Add-ons (Pewangi khusus, Hanger, Anti-noda, dll.)
CREATE TABLE IF NOT EXISTS public.service_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  service_name_snapshot TEXT NOT NULL,
  service_unit_snapshot service_unit_type NOT NULL,
  unit_price_snapshot INTEGER NOT NULL CHECK (unit_price_snapshot >= 0),
  min_quantity_snapshot NUMERIC(6,2) NOT NULL,
  estimated_quantity NUMERIC(6,2) NOT NULL CHECK (estimated_quantity > 0),
  actual_quantity NUMERIC(6,2) CHECK (actual_quantity IS NULL OR actual_quantity > 0),
  handoff_method handoff_method_type NOT NULL DEFAULT 'drop_off',
  pickup_address TEXT DEFAULT '',
  scheduled_date DATE NOT NULL,
  scheduled_time_slot TEXT NOT NULL,
  customer_notes TEXT DEFAULT '',
  internal_admin_notes TEXT DEFAULT '',
  price_adjustment_reason TEXT DEFAULT '',
  status order_status_type NOT NULL DEFAULT 'pending_confirmation',
  payment_status payment_status_type NOT NULL DEFAULT 'unpaid',
  payment_method TEXT NOT NULL DEFAULT 'Tunai / Saat Pengambilan',
  subtotal_estimated INTEGER NOT NULL CHECK (subtotal_estimated >= 0),
  addons_total INTEGER NOT NULL DEFAULT 0 CHECK (addons_total >= 0),
  delivery_fee INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  estimated_total INTEGER NOT NULL CHECK (estimated_total >= 0),
  final_total INTEGER CHECK (final_total IS NULL OR final_total >= 0),
  estimated_completion_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 Order Add-on Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES public.service_addons(id) ON DELETE SET NULL,
  addon_name_snapshot TEXT NOT NULL,
  price_snapshot INTEGER NOT NULL CHECK (price_snapshot >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Order Status History (Audit Trail)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status order_status_type NOT NULL,
  note TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount_due INTEGER NOT NULL CHECK (amount_due >= 0),
  amount_recorded INTEGER NOT NULL DEFAULT 0 CHECK (amount_recorded >= 0),
  status payment_status_type NOT NULL DEFAULT 'unpaid',
  transaction_reference TEXT DEFAULT '',
  recorded_by_name TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.10 Business Settings (Single row configuration)
CREATE TABLE IF NOT EXISTS public.business_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'The Fresh Laundry',
  whatsapp_number TEXT NOT NULL DEFAULT '6281200000000',
  email_contact TEXT NOT NULL DEFAULT 'halo@thefreshlaundry.id',
  address TEXT NOT NULL DEFAULT '[Placeholder Alamat: Jl. Contoh Raya No. 12, Jakarta Selatan — Silakan ubah di Pengaturan Admin]',
  maps_url TEXT NOT NULL DEFAULT 'https://maps.google.com',
  operating_hours TEXT NOT NULL DEFAULT 'Senin – Sabtu: 07.00 – 20.00 WIB | Minggu: 08.00 – 17.00 WIB',
  pickup_delivery_enabled BOOLEAN NOT NULL DEFAULT true,
  pickup_delivery_fee INTEGER NOT NULL DEFAULT 15000 CHECK (pickup_delivery_fee >= 0),
  free_delivery_min_order INTEGER NOT NULL DEFAULT 100000 CHECK (free_delivery_min_order >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.11 Admin Activity Logs
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_reference TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- -----------------------------------------------------------------------------
-- 4. HELPER FUNCTIONS & TRIGGERS FOR AUTH / RBAC
-- -----------------------------------------------------------------------------

-- Check if the currently authenticated Supabase user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Automatically create profile and default 'customer' role on new Supabase Auth user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'Pelanggan'), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Strictly force 'customer' role on registration; never trust user metadata for role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users read/update own profile; Admins read all
CREATE POLICY "Users can read own profile or admin reads all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User Roles: Users can read own role; ONLY database administrator / existing admin can modify
CREATE POLICY "Users can read own role or admin reads all"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Addresses: Customers manage own addresses; Admins read all
CREATE POLICY "Customers manage own addresses"
  ON public.addresses FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Services & Addons: Public can read active services; Admins have full CRUD
CREATE POLICY "Public can view services"
  ON public.services FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins manage services"
  ON public.services FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can view service addons"
  ON public.service_addons FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins manage service addons"
  ON public.service_addons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Orders: Customers can read & create their own orders; Admins can read & update all orders
CREATE POLICY "Customers read own orders, Admins read all"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id OR public.is_admin());

CREATE POLICY "Customers create own orders with unpaid status"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND status = 'pending_confirmation'
    AND payment_status = 'unpaid'
    AND final_total IS NULL
  );

CREATE POLICY "Admins update any order"
  ON public.orders FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Order Items: Customers read/insert for own orders; Admins full access
CREATE POLICY "Customers read own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.customer_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Customers insert own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    ) OR public.is_admin()
  );

-- Order Status History: Customers read own order history; Admins manage all
CREATE POLICY "Customers read own status history"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND (o.customer_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Authenticated users insert initial status or Admin updates"
  ON public.order_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND (o.customer_id = auth.uid() OR public.is_admin())
    )
  );

-- Payments: Customers read own payments; ONLY Admins can insert/update payment records
CREATE POLICY "Customers read own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id
        AND (o.customer_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Only admins manage payments"
  ON public.payments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Business Settings: Public read, Admin update
CREATE POLICY "Public read business settings"
  ON public.business_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins update business settings"
  ON public.business_settings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin Activity Logs: Only Admins can read and insert
CREATE POLICY "Admins read activity logs"
  ON public.admin_activity_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins insert activity logs"
  ON public.admin_activity_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6. INITIAL SEED DATA (CLEARLY MARKED DEMONSTRATION CONFIGURATION)
-- -----------------------------------------------------------------------------

INSERT INTO public.business_settings (
  id, business_name, whatsapp_number, email_contact, address, maps_url, operating_hours, pickup_delivery_enabled, pickup_delivery_fee, free_delivery_min_order
) VALUES (
  1,
  'The Fresh Laundry',
  '6281200000000',
  'layanan@thefreshlaundry.id',
  'Jl. Senopati Dalam No. 18 (Contoh Konfigurasi Awal), Kebayoran Baru, Jakarta Selatan',
  'https://maps.google.com',
  'Senin – Sabtu: 07.00 – 20.00 WIB | Minggu: 08.00 – 17.00 WIB',
  true,
  15000,
  100000
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.services (code, name, category, description, price_per_unit, unit, min_quantity, estimated_hours, is_active, image_key, features)
VALUES
  (
    'CUCI-SETRIKA-REG',
    'Cuci & Setrika Uap Reguler',
    'Kiloan Harian',
    'Pencucian terpisah per pelanggan dengan deterjen ramah serat, pengeringan suhu terkontrol, dan setrika uap rapi siap masuk lemari.',
    12000,
    'kg',
    3.0,
    48,
    true,
    'wash_fold',
    ARRAY['Satu mesin satu pelanggan', 'Setrika uap presisi', 'Lipat rapi & kemasan higienis']
  ),
  (
    'CUCI-KERING-LIPAT',
    'Cuci Kering Lipat Praktis',
    'Kiloan Harian',
    'Layanan cuci bersih dan pengeringan sempurna dengan lipatan presisi tanpa setrika. Cocok untuk pakaian santai dan kaos harian.',
    9000,
    'kg',
    3.0,
    36,
    true,
    'wash_fold',
    ARRAY['Pencucian higienis terpisah', 'Pengeringan anti-lembap', 'Lipat rapi tanpa kusut']
  ),
  (
    'SETRIKA-UAP-SAJA',
    'Setrika Uap Presisi',
    'Perawatan Khusus',
    'Layanan setrika uap bertekanan untuk pakaian yang sudah dicuci di rumah agar kembali licin, rapi, dan segar.',
    8500,
    'kg',
    3.0,
    24,
    true,
    'steam_iron',
    ARRAY['Uap suhu terkalibrasi', 'Aman untuk bahan sensitif', 'Pilihan lipat atau gantung']
  ),
  (
    'LAUNDRY-EXPRESS-6J',
    'Laundry Express Prioritas',
    'Layanan Kilat',
    'Penyelesaian cepat di hari yang sama untuk kebutuhan mendesak dengan standar pencucian penuh dan setrika uap.',
    22000,
    'kg',
    2.0,
    6,
    true,
    'wash_fold',
    ARRAY['Selesai dalam estimasi 6 jam', 'Mesin khusus prioritas', 'Kontrol kualitas ganda']
  ),
  (
    'BEDCOVER-SELIMUT',
    'Perawatan Bed Cover & Duvet',
    'Linen & Rumah Tangga',
    'Pencucian mendalam menggunakan mesin berkapasitas besar untuk menghilangkan debu tungau serta menjaga kelembutan serat bed cover.',
    45000,
    'item',
    1.0,
    72,
    true,
    'bedding_care',
    ARRAY['Sanitasi anti-tungau', 'Pengeringan volume penuh', 'Kemasan pelindung debu']
  ),
  (
    'PAKET-KELUARGA-20KG',
    'Paket Hemat Rumah Tangga (20 Kg)',
    'Paket Laundry',
    'Kuota cuci dan setrika uap 20 kilogram untuk kebutuhan keluarga dengan jadwal penjemputan teratur.',
    210000,
    'paket',
    1.0,
    48,
    true,
    'steam_iron',
    ARRAY['Kuota 20 Kg Cuci & Setrika', 'Bebas biaya antar-jemput area layanan', 'Prioritas antrean reguler']
  )
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.service_addons (code, name, description, price, is_active)
VALUES
  ('ADD-HANGER', 'Pengemasan Gantung (Hanger)', 'Pakaian kemeja/celana dipasang pada hanger (per 5 potong)', 10000, true),
  ('ADD-HYPOALLERGENIC', 'Deterjen Hypoallergenic Bayi/Kulit Sensitif', 'Formula lembut bebas residu keras untuk satu siklus cucian', 12000, true),
  ('ADD-STAIN-CARE', 'Penanganan Noda Khusus (Pre-Spot)', 'Pembersihan awal pada noda kerah, minyak, atau tinta ringan', 15000, true),
  ('ADD-LINEN-SCENT', 'Aroma Linen Sea Salt & Cotton', 'Finishing aroma tenang khas butik yang tahan lama', 5000, true)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- HOW TO ASSIGN THE FIRST ADMIN ACCOUNT SECURELY:
-- After registering your account in the web app, run this in Supabase SQL Editor:
--
-- UPDATE public.user_roles
-- SET role = 'admin', updated_at = NOW()
-- WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'email-admin-anda@domain.com');
-- =============================================================================
