"use client";

import { useMemo, useState, type ReactNode } from "react";
import { RegistrationContext, type RegistrationState } from "./context";

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [organizationName, setOrganizationName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [email, setEmail] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  const value = useMemo<RegistrationState>(
    () => ({
      organizationName,
      gstNumber,
      email,
      registrationToken,
      mobileNumber,
      setOrganizationName,
      setGstNumber,
      setEmail,
      setRegistrationToken,
      setMobileNumber,
      reset: () => {
        setOrganizationName("");
        setGstNumber("");
        setEmail("");
        setRegistrationToken("");
        setMobileNumber("");
      },
    }),
    [organizationName, gstNumber, email, registrationToken, mobileNumber]
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}
