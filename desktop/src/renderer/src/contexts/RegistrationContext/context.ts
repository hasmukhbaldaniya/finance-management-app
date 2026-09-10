import { createContext } from "react";

export type RegistrationState = {
  organizationName: string;
  gstNumber: string;
  email: string;
  registrationToken: string;
  mobileNumber: string;
  setOrganizationName: (organizationName: string) => void;
  setGstNumber: (gstNumber: string) => void;
  setEmail: (email: string) => void;
  setRegistrationToken: (registrationToken: string) => void;
  setMobileNumber: (mobileNumber: string) => void;
  reset: () => void;
};

export const RegistrationContext = createContext<RegistrationState | null>(null);
