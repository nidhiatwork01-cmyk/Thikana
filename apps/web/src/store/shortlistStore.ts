import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ShortlistState {
  shortlistedIds: string[];
  compareIds: string[];

  // Actions
  isShortlisted: (id: string) => boolean;
  toggleShortlist: (id: string) => void;
  isInCompare: (id: string) => boolean;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  clearShortlist: () => void;
}

export const useShortlistStore = create<ShortlistState>()(
  persist(
    (set, get) => ({
      shortlistedIds: [],
      compareIds: [],

      isShortlisted: (id) => get().shortlistedIds.includes(id),

      toggleShortlist: (id) =>
        set((state) => {
          const exists = state.shortlistedIds.includes(id);
          return {
            shortlistedIds: exists
              ? state.shortlistedIds.filter((item) => item !== id)
              : [...state.shortlistedIds, id],
          };
        }),

      isInCompare: (id) => get().compareIds.includes(id),

      toggleCompare: (id) =>
        set((state) => {
          const exists = state.compareIds.includes(id);
          if (exists) {
            return { compareIds: state.compareIds.filter((item) => item !== id) };
          }
          // Max 3 PGs for side-by-side comparison
          if (state.compareIds.length >= 3) {
            return state;
          }
          return { compareIds: [...state.compareIds, id] };
        }),

      clearCompare: () => set({ compareIds: [] }),
      clearShortlist: () => set({ shortlistedIds: [] }),
    }),
    {
      name: "thikana-shortlist-storage",
    }
  )
);
