import type { LatLng, VisitRouteLeg } from "@thikana/shared-types";

export interface TspNode {
  id: string;
  name: string;
  location: LatLng;
}

/**
 * Haversine straight-line distance in kilometers
 */
function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const aVal =
    sinHalfLat * sinHalfLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinHalfLng *
      sinHalfLng;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

/**
 * Estimate road travel distance and duration between two Hyderabad points
 * Why: Indian urban roads have roughly 1.35x winding factor over straight-line Haversine
 */
export function estimateRoadTrip(
  from: LatLng,
  to: LatLng
): { distanceKm: number; minutes: number } {
  const straightLine = haversineKm(from, to);
  const roadFactor = 1.35;
  const distanceKm = parseFloat((straightLine * roadFactor).toFixed(2));

  // Average city traveling speed: 25 km/h for 2-wheeler / auto
  const avgSpeedKmh = 25;
  const minutes = Math.max(5, Math.round((distanceKm / avgSpeedKmh) * 60));

  return { distanceKm, minutes };
}

/**
 * 2-Opt TSP Heuristic Solver
 *
 * Solves the Traveling Salesperson Problem for visiting multiple PGs across Hyderabad.
 * 1. Generates an initial greedy nearest-neighbor tour starting at node 0.
 * 2. Systematically swaps pairs of edges (2-opt move) whenever untangling the route decreases distance.
 * 3. Converges to a high-quality local minimum in O(N^2) iterations.
 */
export function solve2Opt(startNode: TspNode, destinations: TspNode[]): TspNode[] {
  if (destinations.length <= 1) {
    return destinations;
  }

  // All nodes with startNode at index 0
  const allNodes = [startNode, ...destinations];
  const n = allNodes.length;

  // 1. Initial Nearest Neighbor Tour
  const visited = new Set<number>([0]);
  const tour: number[] = [0];

  while (tour.length < n) {
    const current = tour[tour.length - 1]!;
    let nearest = -1;
    let minDistance = Infinity;

    for (let candidate = 1; candidate < n; candidate++) {
      if (!visited.has(candidate)) {
        const d = haversineKm(allNodes[current]!.location, allNodes[candidate]!.location);
        if (d < minDistance) {
          minDistance = d;
          nearest = candidate;
        }
      }
    }

    if (nearest !== -1) {
      visited.add(nearest);
      tour.push(nearest);
    }
  }

  // 2. 2-Opt Edge Swap Optimization
  // Note: tour[0] is pinned (startLocation); we only reorder indices 1 to n-1
  let improved = true;
  let iterations = 0;
  const maxIterations = 100;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const currentDist =
          haversineKm(allNodes[tour[i - 1]!]!.location, allNodes[tour[i]!]!.location) +
          haversineKm(
            allNodes[tour[j]!]!.location,
            j + 1 < n ? allNodes[tour[j + 1]!]!.location : allNodes[tour[j]!]!.location
          );

        const newDist =
          haversineKm(allNodes[tour[i - 1]!]!.location, allNodes[tour[j]!]!.location) +
          haversineKm(
            allNodes[tour[i]!]!.location,
            j + 1 < n ? allNodes[tour[j + 1]!]!.location : allNodes[tour[i]!]!.location
          );

        if (newDist < currentDist - 0.001) {
          // Reverse segment between i and j
          const segment = tour.slice(i, j + 1).reverse();
          tour.splice(i, segment.length, ...segment);
          improved = true;
        }
      }
    }
  }

  // Return destinations in optimized sequence (excluding startNode index 0)
  return tour.slice(1).map((idx) => allNodes[idx]!);
}

/**
 * Format minutes offset from day start (e.g. 600 mins = "10:00")
 */
function minutesToTimeStr(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function timeStrToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 10) * 60 + (m ?? 0);
}

/**
 * Build step-by-step route itinerary and timeline
 */
export function buildItinerary(
  startNode: TspNode,
  orderedDestinations: TspNode[],
  dayStartTime: string,
  minutesPerVisit: number
): {
  timeline: Array<{
    huntItemId: string;
    name: string;
    arrivalTime: string;
    departureTime: string;
  }>;
  legs: VisitRouteLeg[];
  totalDistanceKm: number;
  totalTimeMinutes: number;
} {
  let currentTimeMinutes = timeStrToMinutes(dayStartTime);
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;

  const timeline: Array<{
    huntItemId: string;
    name: string;
    arrivalTime: string;
    departureTime: string;
  }> = [];

  const legs: VisitRouteLeg[] = [];

  let previousNode = startNode;

  for (const currentDest of orderedDestinations) {
    const { distanceKm, minutes } = estimateRoadTrip(
      previousNode.location,
      currentDest.location
    );

    totalDistanceKm += distanceKm;
    totalTravelMinutes += minutes;
    currentTimeMinutes += minutes;

    const arrivalTime = minutesToTimeStr(currentTimeMinutes);
    currentTimeMinutes += minutesPerVisit;
    const departureTime = minutesToTimeStr(currentTimeMinutes);

    timeline.push({
      huntItemId: currentDest.id,
      name: currentDest.name,
      arrivalTime,
      departureTime,
    });

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${previousNode.location.lat},${previousNode.location.lng}&destination=${currentDest.location.lat},${currentDest.location.lng}&travelmode=two_wheeler`;

    legs.push({
      fromName: previousNode.name,
      toName: currentDest.name,
      fromLocation: previousNode.location,
      toLocation: currentDest.location,
      distanceKm,
      travelMinutes: minutes,
      googleMapsUrl,
    });

    previousNode = currentDest;
  }

  const totalTimeMinutes =
    totalTravelMinutes + orderedDestinations.length * minutesPerVisit;

  return {
    timeline,
    legs,
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    totalTimeMinutes,
  };
}
