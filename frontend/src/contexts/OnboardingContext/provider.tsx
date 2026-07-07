"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { EmployeeTitle } from "@/types/employee.type";
import { OnboardingContext, type OnboardingState } from "./context";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState<EmployeeTitle | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [contactNumber, setContactNumber] = useState("");

  const value = useMemo<OnboardingState>(
    () => ({
      token,
      email,
      title,
      firstName,
      lastName,
      countryCode,
      contactNumber,
      setToken,
      setEmail,
      setTitle,
      setFirstName,
      setLastName,
      setCountryCode,
      setContactNumber,
      reset: () => {
        setToken("");
        setEmail("");
        setTitle("");
        setFirstName("");
        setLastName("");
        setCountryCode("+91");
        setContactNumber("");
      },
    }),
    [token, email, title, firstName, lastName, countryCode, contactNumber]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
