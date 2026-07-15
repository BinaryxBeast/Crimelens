import { create } from 'zustand';

export const useFiltersStore = create((set) => ({
  selectedDistrict: 'All',
  selectedCrimeType: 'All',
  dateRange: { start: null, end: null },
  severityRange: [1, 5],

  setDistrict: (d) => set({ selectedDistrict: d }),
  setCrimeType: (t) => set({ selectedCrimeType: t }),
  setDateRange: (r) => set({ dateRange: r }),
  setSeverityRange: (r) => set({ severityRange: r }),
  resetFilters: () => set({
    selectedDistrict: 'All',
    selectedCrimeType: 'All',
    dateRange: { start: null, end: null },
    severityRange: [1, 5],
  }),
}));
