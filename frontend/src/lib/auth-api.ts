import { apiFetch } from "@/lib/api";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
};

export function login(identifier: string, password: string): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export function logout(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/logout", { method: "POST" });
}

export function getMe(): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/auth/me", { method: "GET" });
}

export function requestOtp(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/forgot-password/request-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyOtp(email: string, otp: string): Promise<{ resetToken: string }> {
  return apiFetch<{ resetToken: string }>("/auth/forgot-password/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export function resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/forgot-password/reset-password", {
    method: "POST",
    body: JSON.stringify({ resetToken, newPassword }),
  });
}
