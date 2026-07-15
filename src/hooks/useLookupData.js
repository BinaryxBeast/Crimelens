import { useState, useEffect, useCallback, useMemo } from 'react';
import { create } from 'zustand';
import { supabase } from '../supabaseClient';

// ── Zustand store for cached lookup data ────────────────────
const useLookupStore = create((set) => ({
  districts: [],
  crimeHeads: [],
  crimeSubHeads: [],
  statuses: [],
  gravityLevels: [],
  caseCategories: [],
  acts: [],
  sections: [],
  occupations: [],
  units: [],
  loaded: false,
  loading: false,
  error: null,

  setData: (key, data) => set({ [key]: data }),
  setLoaded: () => set({ loaded: true, loading: false }),
  setLoading: () => set({ loading: true }),
  setError: (err) => set({ error: err, loading: false }),
}));

// ── District coordinate map (for map page — lat/lng not in DB) ──
const DISTRICT_COORDS = {
  1:  { latitude: 12.9716, longitude: 77.5946 },
  2:  { latitude: 12.2958, longitude: 76.6394 },
  3:  { latitude: 12.8438, longitude: 75.2479 },
  4:  { latitude: 15.8497, longitude: 74.4977 },
  5:  { latitude: 17.3297, longitude: 76.8343 },
  6:  { latitude: 15.4589, longitude: 75.0078 },
  7:  { latitude: 13.3379, longitude: 77.1173 },
  8:  { latitude: 13.9299, longitude: 75.5681 },
  9:  { latitude: 15.1394, longitude: 76.9214 },
  10: { latitude: 13.0033, longitude: 76.0998 },
  11: { latitude: 16.8302, longitude: 75.7100 },
  12: { latitude: 16.2120, longitude: 77.3439 },
  13: { latitude: 13.3161, longitude: 75.7720 },
  14: { latitude: 14.7958, longitude: 74.6963 },
  15: { latitude: 12.5218, longitude: 76.8951 },
  16: { latitude: 13.3409, longitude: 74.7421 },
  17: { latitude: 14.2226, longitude: 76.3989 },
  18: { latitude: 15.4298, longitude: 75.6256 },
  19: { latitude: 15.3520, longitude: 76.1547 },
  20: { latitude: 16.7713, longitude: 77.1383 },
  21: { latitude: 11.9261, longitude: 76.9434 },
  22: { latitude: 16.1826, longitude: 75.6960 },
  23: { latitude: 17.9104, longitude: 77.5199 },
  24: { latitude: 12.4215, longitude: 75.7418 },
  25: { latitude: 14.7954, longitude: 75.4005 },
  26: { latitude: 14.4644, longitude: 75.9218 },
  27: { latitude: 13.2257, longitude: 77.5733 },
  28: { latitude: 12.7162, longitude: 77.2820 },
  29: { latitude: 13.4355, longitude: 77.7315 },
  30: { latitude: 13.1362, longitude: 78.1293 },
};

// ── Hook: fetch and cache all lookup tables ─────────────────
export function useLookupData() {
  const store = useLookupStore();

  const fetchAll = useCallback(async () => {
    if (store.loaded || store.loading) return;
    useLookupStore.getState().setLoading();

    try {
      const [
        { data: districts },
        { data: crimeHeads },
        { data: crimeSubHeads },
        { data: statuses },
        { data: gravityLevels },
        { data: caseCategories },
        { data: acts },
        { data: sections },
        { data: occupations },
        { data: units },
      ] = await Promise.all([
        supabase.from('District').select('*').eq('Active', '1').order('DistrictName'),
        supabase.from('CrimeHead').select('*').eq('Active', '1').order('CrimeGroupName'),
        supabase.from('CrimeSubHead').select('*').order('SeqID'),
        supabase.from('CaseStatusMaster').select('*').order('CaseStatusID'),
        supabase.from('GravityOffence').select('*').order('GravityOffenceID'),
        supabase.from('CaseCategory').select('*').order('CaseCategoryID'),
        supabase.from('Act').select('*').eq('Active', '1').order('ShortName'),
        supabase.from('Section').select('*').eq('Active', '1').order('SectionCode'),
        supabase.from('OccupationMaster').select('*').order('OccupationName'),
        supabase.from('Unit').select('*').eq('Active', '1').order('UnitName'),
      ]);

      // Enrich districts with coordinates
      const enrichedDistricts = (districts || []).map(d => ({
        ...d,
        ...(DISTRICT_COORDS[d.DistrictID] || {}),
        // Compatibility: keep 'name' for existing consumers
        id: d.DistrictID,
        name: d.DistrictName,
      }));

      const s = useLookupStore.getState();
      s.setData('districts', enrichedDistricts);
      s.setData('crimeHeads', crimeHeads || []);
      s.setData('crimeSubHeads', crimeSubHeads || []);
      s.setData('statuses', statuses || []);
      s.setData('gravityLevels', gravityLevels || []);
      s.setData('caseCategories', caseCategories || []);
      s.setData('acts', acts || []);
      s.setData('sections', sections || []);
      s.setData('occupations', occupations || []);
      s.setData('units', units || []);
      s.setLoaded();
    } catch (err) {
      console.error('Failed to fetch lookup data:', err);
      useLookupStore.getState().setError(err.message);
    }
  }, [store.loaded, store.loading]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Resolver helpers (ID → name) ──────────────────────────
  const getDistrictName = useCallback((id) => {
    const d = store.districts.find(d => d.DistrictID === id);
    return d?.DistrictName || String(id || '—');
  }, [store.districts]);

  const getDistrictCoords = useCallback((id) => {
    const d = store.districts.find(d => d.DistrictID === id);
    return d ? { latitude: d.latitude, longitude: d.longitude } : null;
  }, [store.districts]);

  const getCrimeTypeName = useCallback((id) => {
    const c = store.crimeHeads.find(c => c.CrimeHeadID === id);
    return c?.CrimeGroupName || String(id || '—');
  }, [store.crimeHeads]);

  const getStatusName = useCallback((id) => {
    const s = store.statuses.find(s => s.CaseStatusID === id);
    return s?.CaseStatusName || String(id || '—');
  }, [store.statuses]);

  const getGravityName = useCallback((id) => {
    const g = store.gravityLevels.find(g => g.GravityOffenceID === id);
    return g?.LookupValue || String(id || '—');
  }, [store.gravityLevels]);

  const getUnitName = useCallback((id) => {
    const u = store.units.find(u => u.UnitID === id);
    return u?.UnitName || String(id || '—');
  }, [store.units]);

  const getCategoryName = useCallback((id) => {
    const c = store.caseCategories.find(c => c.CaseCategoryID === id);
    return c?.LookupValue || String(id || '—');
  }, [store.caseCategories]);

  const getOccupationName = useCallback((id) => {
    const o = store.occupations.find(o => o.OccupationID === id);
    return o?.OccupationName || String(id || '—');
  }, [store.occupations]);

  const getActName = useCallback((code) => {
    const a = store.acts.find(a => a.ActCode === code);
    return a?.ShortName || String(code || '—');
  }, [store.acts]);

  const getSectionDesc = useCallback((code) => {
    const s = store.sections.find(s => s.SectionCode === code);
    return s?.SectionDescription || String(code || '—');
  }, [store.sections]);

  // ── Filtered list helpers ─────────────────────────────────
  const getUnitsByDistrict = useCallback((districtId) => {
    if (!districtId) return store.units;
    return store.units.filter(u => u.DistrictID === districtId);
  }, [store.units]);

  const getSubHeadsByCrimeHead = useCallback((crimeHeadId) => {
    if (!crimeHeadId) return [];
    return store.crimeSubHeads.filter(s => s.CrimeHeadID === crimeHeadId);
  }, [store.crimeSubHeads]);

  const getSectionsByAct = useCallback((actCode) => {
    if (!actCode) return [];
    return store.sections.filter(s => s.ActCode === actCode);
  }, [store.sections]);

  return {
    // Raw lists
    districts: store.districts,
    crimeHeads: store.crimeHeads,
    crimeSubHeads: store.crimeSubHeads,
    statuses: store.statuses,
    gravityLevels: store.gravityLevels,
    caseCategories: store.caseCategories,
    acts: store.acts,
    sections: store.sections,
    occupations: store.occupations,
    units: store.units,
    loaded: store.loaded,
    loading: store.loading,

    // Resolvers (ID → name)
    getDistrictName,
    getDistrictCoords,
    getCrimeTypeName,
    getStatusName,
    getGravityName,
    getUnitName,
    getCategoryName,
    getOccupationName,
    getActName,
    getSectionDesc,

    // Filtered lists
    getUnitsByDistrict,
    getSubHeadsByCrimeHead,
    getSectionsByAct,
  };
}
