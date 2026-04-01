ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS mp_qr_enabled BOOLEAN DEFAULT false;
