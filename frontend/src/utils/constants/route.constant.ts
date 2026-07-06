export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  REGISTER: {
    ORGANIZATION: "/register",
    DETAILS: "/register/details",
    VERIFY_EMAIL: "/register/verify-email",
    MOBILE: "/register/mobile",
    VERIFY_MOBILE: "/register/verify-mobile",
  },
  FORGOT_PASSWORD: {
    REQUEST: "/forgot-password",
    VERIFY: "/forgot-password/verify",
    RESET: "/forgot-password/reset",
  },
} as const;
