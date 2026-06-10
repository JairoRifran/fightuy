import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FREE_CHARACTERS = new Set(['orsi', 'lacalle', 'humano']);

class AuthManager {
  constructor() {
    this.enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
    this.allowLocalMode = !import.meta.env.PROD && !this.enabled;
    this.supabase = this.enabled ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
    this.session = null;
    this.profile = null;
    this.entitlements = new Set();
    this.localUser = null;
    this.ownerDashboard = null;
  }

  async init() {
    if (!this.enabled) {
      if (!this.allowLocalMode) {
        throw new Error('Faltan las variables publicas de Supabase en Vercel. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para habilitar usuarios reales.');
      }
      const savedUser = localStorage.getItem('fightuy_local_user');
      this.localUser = savedUser ? JSON.parse(savedUser) : null;
      return this.getCurrentUser();
    }

    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw error;

    this.session = data.session;
    if (this.session?.user) {
      await this.loadAccountData();
    }

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      this.session = session;
      if (session?.user) {
        await this.loadAccountData();
      } else {
        this.profile = null;
        this.entitlements.clear();
      }
    });

    return this.getCurrentUser();
  }

  getCurrentUser() {
    if (this.allowLocalMode) return this.localUser;
    return this.session?.user || null;
  }

  getDisplayName() {
    if (this.allowLocalMode) return this.localUser?.username || 'Jugador';
    return this.profile?.username || this.session?.user?.email || 'Jugador';
  }

  isOwner() {
    if (this.allowLocalMode) return true;
    return this.profile?.role === 'owner';
  }

  async signUp({ email, password, username }) {
    if (this.allowLocalMode) {
      this.localUser = {
        id: `local_${Date.now()}`,
        email,
        username: username || email.split('@')[0]
      };
      localStorage.setItem('fightuy_local_user', JSON.stringify(this.localUser));
      return this.localUser;
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0]
        }
      }
    });

    if (error) throw error;
    this.session = data.session;

    if (data.user) {
      if (!data.session) {
        return { user: data.user, needsEmailConfirmation: true };
      }

      await this.ensureProfile(data.user, username || email.split('@')[0]);
      await this.loadAccountData();
    }

    return { user: data.user, needsEmailConfirmation: false };
  }

  async signIn({ email, password }) {
    if (this.allowLocalMode) {
      const savedUser = localStorage.getItem('fightuy_local_user');
      if (!savedUser) throw new Error('Crea un usuario local primero.');
      this.localUser = JSON.parse(savedUser);
      return this.localUser;
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    this.session = data.session;
    await this.loadAccountData();
    return data.user;
  }

  async signOut() {
    if (this.allowLocalMode) {
      this.localUser = null;
      localStorage.removeItem('fightuy_local_user');
      return;
    }

    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    this.session = null;
    this.profile = null;
    this.entitlements.clear();
  }

  async ensureProfile(user, fallbackUsername) {
    const username = user.user_metadata?.username || fallbackUsername || user.email?.split('@')[0] || 'jugador';

    await this.supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username,
        email: user.email
      }, { onConflict: 'id' });
  }

  async loadAccountData() {
    const user = this.session?.user;
    if (!user) return;

    await this.ensureProfile(user);

    const [{ data: profile }, { data: entitlements }] = await Promise.all([
      this.supabase.from('profiles').select('id, username, email, role').eq('id', user.id).single(),
      this.supabase.from('character_entitlements').select('character_id').eq('user_id', user.id)
    ]);

    this.profile = profile || null;
    this.entitlements = new Set((entitlements || []).map(row => row.character_id));
  }

  canUseCharacter(characterId) {
    if (FREE_CHARACTERS.has(characterId)) return true;
    if (!this.enabled) return false;
    return this.entitlements.has(characterId);
  }

  async trackEvent(eventName, metadata = {}) {
    if (!this.enabled || !this.session?.user) return;

    await this.supabase.from('app_events').insert({
      user_id: this.session.user.id,
      event_name: eventName,
      metadata
    });
  }

  async getOwnerDashboard() {
    if (this.allowLocalMode) {
      return {
        totals: {
          users: 1,
          paying_users: 0,
          payments: 0,
          revenue_cents: 0,
          events_24h: 0
        },
        recent_users: this.localUser ? [this.localUser] : [],
        recent_events: [],
        purchases_by_character: []
      };
    }

    if (!this.isOwner()) throw new Error('No tenés permisos de dueño para ver este panel.');

    const { data, error } = await this.supabase.rpc('get_owner_dashboard');
    if (error) throw error;

    this.ownerDashboard = data;
    return data;
  }

  async getPlayerProfile() {
    if (this.allowLocalMode) {
      return {
        profile: this.localUser ? {
          username: this.localUser.username,
          email: this.localUser.email,
          role: 'local'
        } : null,
        free_characters: Array.from(FREE_CHARACTERS),
        entitlements: [],
        payments: [],
        recent_events: []
      };
    }

    if (!this.session?.user) throw new Error('Tenés que iniciar sesión.');

    const userId = this.session.user.id;
    const [{ data: profile, error: profileError }, { data: entitlements, error: entitlementsError }, { data: payments, error: paymentsError }, { data: events, error: eventsError }] = await Promise.all([
      this.supabase.from('profiles').select('id, username, email, role, created_at').eq('id', userId).single(),
      this.supabase.from('character_entitlements').select('character_id, source, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      this.supabase.from('payments').select('product_type, product_id, amount_cents, currency, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(12),
      this.supabase.from('app_events').select('event_name, metadata, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(12)
    ]);

    const error = profileError || entitlementsError || paymentsError || eventsError;
    if (error) throw error;

    return {
      profile,
      free_characters: Array.from(FREE_CHARACTERS),
      entitlements: entitlements || [],
      payments: payments || [],
      recent_events: events || []
    };
  }
}

export default new AuthManager();
