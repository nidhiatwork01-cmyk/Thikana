import { create } from "zustand";
import type { TravelMode } from "@thikana/shared-types";

export interface DestinationPreset {
  name: string;
  shortName: string;
  locality: string;
  lat: number;
  lng: number;
}

export const HYDERABAD_HUBS: DestinationPreset[] = [
  {
    name: "Cyber Towers, HITEC City",
    shortName: "Cyber Towers",
    locality: "HITEC City",
    lat: 17.4504,
    lng: 78.3808,
  },
  {
    name: "Financial District, Nanakramguda",
    shortName: "Financial Dist",
    locality: "Gachibowli",
    lat: 17.4156,
    lng: 78.3427,
  },
  {
    name: "Mindspace IT Park, Madhapur",
    shortName: "Mindspace",
    locality: "Madhapur",
    lat: 17.4428,
    lng: 78.3812,
  },
  {
    name: "DivyaSree Orion, Raidurg",
    shortName: "DivyaSree Orion",
    locality: "Raidurg",
    lat: 17.4241,
    lng: 78.3755,
  },
  {
    name: "DLF Cybercity, Gachibowli",
    shortName: "DLF Cybercity",
    locality: "Gachibowli",
    lat: 17.4475,
    lng: 78.3582,
  },
  {
    name: "Ameerpet Metro Interchange",
    shortName: "Ameerpet Metro",
    locality: "Ameerpet",
    lat: 17.4375,
    lng: 78.4482,
  },
  {
    name: "Wipro Circle, Gachibowli",
    shortName: "Wipro Circle",
    locality: "Gachibowli",
    lat: 17.4285,
    lng: 78.3392,
  },
];

export type BottomSheetSnap = "peek" | "half" | "full";

interface CommuteState {
  destination: {
    lat: number;
    lng: number;
    name: string;
  };
  arrivalTime: string;
  travelMode: TravelMode;
  maxMinutes: number;
  gender?: "MEN" | "WOMEN" | "CO_LIVING";
  maxBudget?: number;
  sharingType?: "SINGLE" | "DOUBLE" | "TRIPLE" | "FOUR_PLUS";
  foodType?: "VEG" | "NON_VEG" | "BOTH" | "NONE";
  sortBy: "commute" | "price" | "newest" | "rating";

  // Map & UI Interaction
  selectedPgId: string | null;
  hoveredPgId: string | null;
  bottomSheetSnap: BottomSheetSnap;

  // Actions
  setDestination: (dest: { lat: number; lng: number; name: string }) => void;
  setArrivalTime: (time: string) => void;
  setTravelMode: (mode: TravelMode) => void;
  setMaxMinutes: (mins: number) => void;
  setGender: (gender?: "MEN" | "WOMEN" | "CO_LIVING") => void;
  setMaxBudget: (budget?: number) => void;
  setSharingType: (type?: "SINGLE" | "DOUBLE" | "TRIPLE" | "FOUR_PLUS") => void;
  setFoodType: (food?: "VEG" | "NON_VEG" | "BOTH" | "NONE") => void;
  setSortBy: (sort: "commute" | "price" | "newest" | "rating") => void;
  setSelectedPgId: (id: string | null) => void;
  setHoveredPgId: (id: string | null) => void;
  setBottomSheetSnap: (snap: BottomSheetSnap) => void;
}

export const useCommuteStore = create<CommuteState>((set) => ({
  destination: {
    lat: HYDERABAD_HUBS[0]!.lat,
    lng: HYDERABAD_HUBS[0]!.lng,
    name: HYDERABAD_HUBS[0]!.name,
  },
  arrivalTime: "09:30",
  travelMode: "bike",
  maxMinutes: 30,
  sortBy: "commute",

  selectedPgId: null,
  hoveredPgId: null,
  bottomSheetSnap: "half",

  setDestination: (destination) => set({ destination }),
  setArrivalTime: (arrivalTime) => set({ arrivalTime }),
  setTravelMode: (travelMode) => set({ travelMode }),
  setMaxMinutes: (maxMinutes) => set({ maxMinutes }),
  setGender: (gender) => set({ gender }),
  setMaxBudget: (maxBudget) => set({ maxBudget }),
  setSharingType: (sharingType) => set({ sharingType }),
  setFoodType: (foodType) => set({ foodType }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSelectedPgId: (selectedPgId) => set({ selectedPgId }),
  setHoveredPgId: (hoveredPgId) => set({ hoveredPgId }),
  setBottomSheetSnap: (bottomSheetSnap) => set({ bottomSheetSnap }),
}));
