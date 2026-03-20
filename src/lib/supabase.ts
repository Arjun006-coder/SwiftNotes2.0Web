import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations that bypass RLS
// fetch with 15s timeout to prevent UND_ERR_HEADERS_TIMEOUT hanging the entire server
const fetchWithTimeout = (url: RequestInfo | URL, options?: RequestInit) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
};

export const supabaseAdmin = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        global: {
            fetch: fetchWithTimeout as typeof fetch,
        }
    }
);
