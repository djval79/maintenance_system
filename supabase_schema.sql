-- Create a table for clients (The "Care Home" or Organization)
CREATE TABLE IF NOT EXISTS public.maintenance_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT UNIQUE NOT NULL, -- e.g., 'novum_care'
    name TEXT NOT NULL,
    tier TEXT DEFAULT 'Standard', -- 'Standard', 'Premium', 'Corporate'
    subscription_status TEXT DEFAULT 'active', -- 'active', 'past_due', 'canceled'
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create a table for app users (Staff & Managers)
-- This links Supabase Auth users to a Client Organization
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id), -- The logged-in user
    client_id TEXT REFERENCES public.maintenance_clients(client_id), -- The Organization they belong to
    role TEXT DEFAULT 'staff', -- 'admin' (Manager) or 'staff' (View Only)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, client_id)
);

-- Create a table for target sites
CREATE TABLE IF NOT EXISTS public.maintenance_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id TEXT UNIQUE NOT NULL,
    client_id TEXT REFERENCES public.maintenance_clients(client_id),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create a table for audit logs
CREATE TABLE IF NOT EXISTS public.maintenance_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    performance_score NUMERIC,
    accessibility_score NUMERIC,
    best_practices_score NUMERIC,
    seo_score NUMERIC,
    uptime_status TEXT,
    latency TEXT,
    opportunities JSONB,
    screenshot_url TEXT,
    ai_perspective TEXT,
    ai_hidden_opportunity TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.maintenance_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_audits ENABLE ROW LEVEL SECURITY;

-- POLICIES (The "Magic" that allows staff access without paying)

-- 1. Members can view their own Organization details if the sub is active
CREATE POLICY "Members can view own active organization"
ON public.maintenance_clients
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.client_id = maintenance_clients.client_id
        AND organization_members.user_id = auth.uid()
    )
);

-- 2. Staff can view audits ONLY for their Organization
CREATE POLICY "Staff can view org audits"
ON public.maintenance_audits
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.client_id = maintenance_audits.client_id
        AND organization_members.user_id = auth.uid()
    )
);

-- 3. Only Admins/Managers can insert/update targets (Not simple staff)
CREATE POLICY "Admins can manage targets"
ON public.maintenance_targets
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.client_id = maintenance_targets.client_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
);
