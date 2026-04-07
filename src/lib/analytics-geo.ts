export interface VisitorLocation {
  lat: number;
  lng: number;
  city: string | null;
  country: string;
  count: number;
}

export interface GeographyFilters {
  country: string;
  query: string;
  minVisitors: number;
  sort: "Most visitors" | "City (A-Z)" | "Country (A-Z)";
}

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function getVisitorCountries(locations: VisitorLocation[]) {
  return [...new Set(locations.map((location) => location.country).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getVisibleVisitorCount(locations: VisitorLocation[]) {
  return locations.reduce((total, location) => total + location.count, 0);
}

export function filterVisitorLocations(
  locations: VisitorLocation[],
  filters: GeographyFilters,
) {
  const query = normalizeText(filters.query);

  return [...locations]
    .filter((location) =>
      filters.country === "All countries" ? true : location.country === filters.country,
    )
    .filter((location) => location.count >= filters.minVisitors)
    .filter((location) => {
      if (!query) return true;

      const searchableText = normalizeText(
        [location.city, location.country].filter(Boolean).join(" "),
      );
      return searchableText.includes(query);
    })
    .sort((left, right) => {
      if (filters.sort === "City (A-Z)") {
        return (left.city || left.country).localeCompare(right.city || right.country);
      }

      if (filters.sort === "Country (A-Z)") {
        return left.country.localeCompare(right.country) || (left.city || "").localeCompare(right.city || "");
      }

      return right.count - left.count || left.country.localeCompare(right.country);
    });
}
