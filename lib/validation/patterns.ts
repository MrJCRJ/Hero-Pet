/**
 * Fonte única de verdade para regex de email e telefone (backend + frontend).
 */

export const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
export const PHONE_FIXED_REGEX = /^[1-9][0-9][2-9][0-9]{7}$/;
export const PHONE_MOBILE_REGEX = /^[1-9][0-9]9[0-9]{8}$/;
export const SQL_PHONE_FIXED = "^[1-9][0-9][2-9][0-9]{7}$";
export const SQL_PHONE_MOBILE = "^[1-9][0-9]9[0-9]{8}$";
export const SQL_EMAIL = "^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$";
