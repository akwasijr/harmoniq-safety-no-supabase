/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 15,
  WORK_ORDERS_PAGE_SIZE: 15,
} as const;

/** Timeouts in milliseconds */
export const TIMEOUTS = {
  GPS_LOCATION: 10_000,
  AUTH_SUPABASE: 15_000,
  FORGOT_PASSWORD_DELAY: 1_500,
  ANIMATION_DURATION: 1_500,
} as const;

/** Input limits */
export const LIMITS = {
  MAX_DESCRIPTION_LENGTH: 5_000,
  MAX_FILE_SIZE_MB: 5,
} as const;
