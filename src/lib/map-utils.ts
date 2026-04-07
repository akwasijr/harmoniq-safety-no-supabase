export function hasValidCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): lat is number {
  return Number.isFinite(lat) && Number.isFinite(lng);
}
