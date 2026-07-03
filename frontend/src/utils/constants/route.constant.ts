export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  FORGOT_PASSWORD: {
    REQUEST: "/forgot-password",
    VERIFY: "/forgot-password/verify",
    RESET: "/forgot-password/reset",
  },
} as const;
