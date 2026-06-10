import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FREE_CHARACTERS = new Set(['orsi', 'lacalle']);

class AuthManager {
  constructor() {
    this.enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
    this.supabase = this.enabled ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
    this.session = null;
    this.profile = null;
    this.entitlements = new Set();
    this.localUser = null;
  }

  async init() {
    if (!this.enabled) {
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
    if (!this.enabled) return this.localUser;
    return this.session?.user || null;
  }

  getDisplayName() {
    if (!this.enabled) return this.localUser?.username || 'Jugador local';
    return this.profile?.username || this.session?.user?.email || 'Jugador';
  }

  async signUp({ email, password, username }) {
    if (!this.enabled) {
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
    if (!this.enabled) {
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
    if (!this.enabled) {
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
      this.supabase.from('profiles').select('id, username, email').eq('id', user.id).single(),
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
}

export default new AuthManager();
