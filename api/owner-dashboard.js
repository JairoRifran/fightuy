import { createClient } from '@supabase/supabase-js';

const OWNER_EMAILS = new Set(['rifranjairo@gmail.com']);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function isMissingTable(error) {
  return error?.code === '42P01' || /could not find the table|schema cache|does not exist/i.test(error?.message || '');
}

function emptyResult(data = [], count = 0) {
  return { data, count, error: null };
}

async function optionalQuery(query, fallback = emptyResult()) {
  const result = await query;
  if (isMissingTable(result.error)) return fallback;
  return result;
}

async function listAuthUsers(admin) {
  const users = [];
  let page = 1;
  const perPage = 1000;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    users.push(...(data?.users || []));
    if (!data?.users?.length || data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    return res.status(503).json({
      error: 'Faltan variables de Supabase para el dashboard. Configura SUPABASE_SERVICE_ROLE_KEY y SUPABASE_URL en Vercel.'
    });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Sesion requerida' });

  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Sesion invalida' });
  }

  const email = (authData.user.email || '').toLowerCase();
  if (!OWNER_EMAILS.has(email)) {
    return res.status(403).json({ error: 'Este panel es solo para el dueno del producto.' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const authUsers = await listAuthUsers(admin);

  await optionalQuery(admin
    .from('profiles')
    .upsert({
      id: authData.user.id,
      username: authData.user.user_metadata?.username || email.split('@')[0],
      email,
      role: 'owner'
    }, { onConflict: 'id' }));

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    profilesResult,
    events24hResult,
    recentEventsResult,
    paymentsResult,
    purchasesResult
  ] = await Promise.all([
    optionalQuery(admin.from('profiles').select('id, username, email, role, created_at')),
    optionalQuery(admin.from('app_events').select('id', { count: 'exact', head: true }).gte('created_at', since)),
    optionalQuery(admin.from('app_events').select('event_name, metadata, created_at, profiles(username, email)').order('created_at', { ascending: false }).limit(20)),
    optionalQuery(admin.from('payments').select('user_id, amount_cents, status').eq('status', 'paid')),
    optionalQuery(admin.from('payments').select('product_id, amount_cents, status, product_type').eq('status', 'paid').eq('product_type', 'character'))
  ]);

  const error = profilesResult.error ||
    events24hResult.error ||
    recentEventsResult.error ||
    paymentsResult.error ||
    purchasesResult.error;

  if (error) return res.status(500).json({ error: error.message || 'No se pudo leer el dashboard.' });

  const profilesById = new Map((profilesResult.data || []).map(profile => [profile.id, profile]));
  const recentUsers = authUsers
    .map(user => {
      const profile = profilesById.get(user.id);
      return {
        id: user.id,
        username: profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Usuario',
        email: profile?.email || user.email || 'sin email',
        role: profile?.role || (OWNER_EMAILS.has((user.email || '').toLowerCase()) ? 'owner' : 'player'),
        created_at: profile?.created_at || user.created_at
      };
    })
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 12);

  const paidPayments = paymentsResult.data || [];
  const uniquePayingUsers = new Set(paidPayments.map(row => row.user_id).filter(Boolean));
  const revenueCents = paidPayments.reduce((total, row) => total + (row.amount_cents || 0), 0);
  const purchasesMap = new Map();

  for (const row of purchasesResult.data || []) {
    const key = row.product_id || 'personaje';
    const current = purchasesMap.get(key) || { character_id: key, sales: 0, revenue_cents: 0 };
    current.sales += 1;
    current.revenue_cents += row.amount_cents || 0;
    purchasesMap.set(key, current);
  }

  return res.status(200).json({
    totals: {
      users: authUsers.length,
      paying_users: uniquePayingUsers.size,
      payments: paidPayments.length,
      revenue_cents: revenueCents,
      events_24h: events24hResult.count || 0
    },
    recent_users: recentUsers,
    recent_events: (recentEventsResult.data || []).map(event => ({
      event_name: event.event_name,
      metadata: event.metadata,
      created_at: event.created_at,
      username: event.profiles?.username,
      email: event.profiles?.email
    })),
    purchases_by_character: Array.from(purchasesMap.values()).sort((a, b) => b.sales - a.sales)
  });
}
