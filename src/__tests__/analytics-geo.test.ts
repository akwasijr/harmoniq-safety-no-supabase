import { describe, expect, it } from "vitest";
import {
  filterVisitorLocations,
  getVisibleVisitorCount,
  getVisitorCountries,
  type VisitorLocation,
} from "@/lib/analytics-geo";

const locations: VisitorLocation[] = [
  { lat: 52.3676, lng: 4.9041, city: "Amsterdam", country: "NL", count: 6 },
  { lat: 51.5072, lng: -0.1276, city: "London", country: "GB", count: 4 },
  { lat: 40.7128, lng: -74.006, city: "New York", country: "US", count: 11 },
  { lat: 41.8781, lng: -87.6298, city: null, country: "US", count: 1 },
];

describe("analytics geo helpers", () => {
  it("returns sorted unique visitor countries", () => {
    expect(getVisitorCountries(locations)).toEqual(["GB", "NL", "US"]);
  });

  it("filters by country, query, and minimum visitors", () => {
    expect(
      filterVisitorLocations(locations, {
        country: "US",
        query: "new",
        minVisitors: 5,
        sort: "Most visitors",
      }),
    ).toEqual([locations[2]]);
  });

  it("sorts alphabetically when requested", () => {
    expect(
      filterVisitorLocations(locations, {
        country: "All countries",
        query: "",
        minVisitors: 1,
        sort: "City (A-Z)",
      }).map((location) => location.city || location.country),
    ).toEqual(["Amsterdam", "London", "New York", "US"]);
  });

  it("sums the visible visitor count", () => {
    expect(getVisibleVisitorCount([locations[0], locations[2]])).toBe(17);
  });
});
