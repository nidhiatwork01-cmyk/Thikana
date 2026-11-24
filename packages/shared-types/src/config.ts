/**
 * Global Brand & Regional Configuration
 * Update this single file to rename or reconfigure regional defaults across the app.
 */
export const APP_CONFIG = {
  name: "Thikana",
  tagline: "Find where to live by commute time, plan your visits, and protect your deposit",
  city: "Hyderabad",
  state: "Telangana",
  country: "India",
  currency: "INR",
  currencySymbol: "₹",
  defaultCenter: {
    lat: 17.4483, // Cyber Towers, HITEC City
    lng: 78.3742
  },
  defaultZoom: 13,
  supportEmail: "hello@thikana.local",
  safetyMaxBuddyFeeSoftCap: 500 // Suggested soft cap in INR per session to discourage extortion/brokers
} as const;

export type AppConfig = typeof APP_CONFIG;
