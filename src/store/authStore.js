import { create } from 'zustand';
import { supabase } from '../supabaseClient';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  profileLoading: false,
  loading: true,

  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      set({ user, loading: false });
      if (user) {
        get().fetchProfile(user.id);
      }
    } catch (e) {
      console.error('Failed to get session from Supabase:', e);
      set({ user: null, loading: false });
    }

    try {
      supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user ?? null;
        set({ user });
        if (user) {
          get().fetchProfile(user.id);
        } else {
          set({ profile: null });
        }
      });
    } catch (e) {
      console.error('Failed to register auth state change listener:', e);
    }
  },

  fetchProfile: async (userId) => {
    set({ profileLoading: true });
    try {
      const { data, error } = await supabase
        .from('officer_profiles')
        .select(`
          *,
          rank:Rank(RankID, RankName),
          unit:Unit(UnitID, UnitName, DistrictID),
          district:District(DistrictID, DistrictName),
          designation:Designation(DesignationID, DesignationName)
        `)
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No profile found — user hasn't set up their profile yet
        set({ profile: null, profileLoading: false });
        return;
      }

      if (error) {
        console.error('Error fetching officer profile:', error);
        set({ profile: null, profileLoading: false });
        return;
      }

      set({ profile: data, profileLoading: false });
    } catch (e) {
      console.error('Failed to fetch officer profile:', e);
      set({ profile: null, profileLoading: false });
    }
  },

  updateProfile: async (profileData) => {
    const user = get().user;
    if (!user) throw new Error('Not authenticated');

    const payload = {
      id: user.id,
      officer_name: profileData.officer_name || '',
      rank_id: profileData.rank_id || null,
      kgid: profileData.kgid || '',
      unit_id: profileData.unit_id || null,
      district_id: profileData.district_id || null,
      designation_id: profileData.designation_id || null,
      mobile_no: profileData.mobile_no || '',
      photo_url: profileData.photo_url || '',
    };

    const { data, error } = await supabase
      .from('officer_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select(`
        *,
        rank:Rank(RankID, RankName),
        unit:Unit(UnitID, UnitName, DistrictID),
        district:District(DistrictID, DistrictName),
        designation:Designation(DesignationID, DesignationName)
      `)
      .single();

    if (error) throw error;
    set({ profile: data });
    return data;
  },

  uploadPhoto: async (file) => {
    const user = get().user;
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('officer-photos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('officer-photos')
      .getPublicUrl(filePath);

    // Add cache-busting parameter
    const photoUrl = `${publicUrl}?t=${Date.now()}`;

    return photoUrl;
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ user: data.user });
    // Profile will be fetched by onAuthStateChange
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));
