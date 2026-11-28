import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCommuteStore } from "../../store/commuteStore";
import type { CommutePGListing, IsochroneResponse } from "@thikana/shared-types";

// Free, fast, ultra-clean CartoDB Positron map style (no API key required)
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

interface CommuteMapProps {
  isochrone: IsochroneResponse | null;
  pgs: CommutePGListing[];
  isLoading?: boolean;
}

export const CommuteMap: React.FC<CommuteMapProps> = ({ isochrone, pgs }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const destinationMarker = useRef<maplibregl.Marker | null>(null);
  const pgMarkers = useRef<Map<string, maplibregl.Marker>>(new Map());

  const {
    destination,
    selectedPgId,
    hoveredPgId,
    travelMode,
    setDestination,
    setSelectedPgId,
  } = useCommuteStore();

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [destination.lng, destination.lat],
      zoom: 12.5,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.on("load", () => {
      // Add isochrone GeoJSON source
      map.addSource("commute-isochrone", {
        type: "geojson",
        data: isochrone || {
          type: "FeatureCollection",
          features: [],
        },
      });

      // Layer 1: Translucent Terracotta Fill
      map.addLayer({
        id: "commute-isochrone-fill",
        type: "fill",
        source: "commute-isochrone",
        paint: {
          "fill-color": "#D9532F",
          "fill-opacity": 0.16,
        },
      });

      // Layer 2: Clean Accent Outline
      map.addLayer({
        id: "commute-isochrone-line",
        type: "line",
        source: "commute-isochrone",
        paint: {
          "line-color": "#D9532F",
          "line-width": 2.5,
          "line-opacity": 0.85,
        },
      });
    });

    // Pin drop anywhere on map
    map.on("click", (e) => {
      // Ignore click if clicking on a marker
      if ((e.originalEvent.target as HTMLElement).closest(".pg-marker")) return;

      const lat = parseFloat(e.lngLat.lat.toFixed(5));
      const lng = parseFloat(e.lngLat.lng.toFixed(5));

      setDestination({
        lat,
        lng,
        name: `Custom Pin (${lat}, ${lng})`,
      });
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // 2. Update Destination Marker & Map Center
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (!destinationMarker.current) {
      // Create destination DOM marker with pulsing wave
      const el = document.createElement("div");
      el.className = "destination-pin-container cursor-pointer";
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-9 w-9 animate-ping rounded-full bg-[#D9532F] opacity-35"></span>
          <span class="relative inline-flex items-center justify-center h-7 w-7 rounded-full bg-[#D9532F] text-white shadow-lg border-2 border-white text-[12px] font-bold">
            📍
          </span>
        </div>
      `;

      destinationMarker.current = new maplibregl.Marker({ element: el })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);
    } else {
      destinationMarker.current.setLngLat([destination.lng, destination.lat]);
    }
  }, [destination]);

  // 3. Update Isochrone GeoJSON on map
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const source = map.getSource("commute-isochrone") as maplibregl.GeoJSONSource | undefined;
    if (source && isochrone) {
      source.setData(isochrone);

      // Fit map to isochrone bounds if coordinates exist
      const feature = isochrone.features[0];
      if (feature && feature.geometry && feature.geometry.coordinates) {
        const coords =
          feature.geometry.type === "Polygon"
            ? (feature.geometry.coordinates[0] as [number, number][])
            : (feature.geometry.coordinates[0]?.[0] as [number, number][]);

        if (coords && coords.length > 0) {
          const bounds = coords.reduce(
            (acc, coord) => acc.extend(coord),
            new maplibregl.LngLatBounds(coords[0], coords[0])
          );

          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 280, left: 60, right: 60 },
            duration: 800,
            maxZoom: 14.5,
          });
        }
      }
    }
  }, [isochrone]);

  // 4. Update PG Listing Markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const currentMarkers = pgMarkers.current;
    const incomingIds = new Set(pgs.map((p) => p.id));

    // Remove markers that are no longer in zone
    for (const [id, marker] of currentMarkers.entries()) {
      if (!incomingIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    }

    // Add or update markers
    pgs.forEach((pg) => {
      const isSelected = selectedPgId === pg.id;
      const isHovered = hoveredPgId === pg.id;
      const isActive = isSelected || isHovered;

      let marker = currentMarkers.get(pg.id);

      if (!marker) {
        const el = document.createElement("div");
        el.className = "pg-marker cursor-pointer transition-all duration-200 transform hover:scale-110";

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedPgId(pg.id);
        });

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([pg.location.lng, pg.location.lat])
          .addTo(map);

        currentMarkers.set(pg.id, marker);
      }

      // Update marker appearance
      const el = marker.getElement();
      el.style.zIndex = isActive ? "50" : "10";
      const rentK = `₹${(pg.minRent / 1000).toFixed(1).replace(".0", "")}k`;
      const commuteTime = `${pg.estimatedCommuteMinutes}m`;
      const modeEmoji = travelMode === "bike" ? "🏍️" : travelMode === "car" ? "🚗" : "🚇";

      el.innerHTML = `
        <div class="px-2.5 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 border transition-all ${
          isActive
            ? "bg-[#D9532F] text-white border-white scale-110 ring-2 ring-[#D9532F]/50 shadow-lg"
            : "bg-white text-[#1C1917] border-[#E7E5E4] hover:border-[#D9532F]"
        }">
          <span class="text-[11px] font-medium">${modeEmoji} ${commuteTime}</span>
          <span class="opacity-40">|</span>
          <span class="font-display font-black">${rentK}</span>
        </div>
      `;
    });
  }, [pgs, selectedPgId, hoveredPgId, travelMode, setSelectedPgId]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainer} className="w-full h-full absolute inset-0" />
    </div>
  );
};
