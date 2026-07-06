export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;
export const OTP_REGEX = /^\d{6}$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const NAME_REGEX = /^[A-Za-z' -]{1,50}$/;
// Kept byte-identical to backend/src/utils/constants/regex.constant.ts.
export const EMPLOYEE_NAME_REGEX = /^[A-Za-z ]{2,50}$/;
export const CONTACT_NUMBER_REGEX = /^\d{7,15}$/;
