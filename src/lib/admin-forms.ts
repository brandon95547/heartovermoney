// Reading admin form fields: trimmed text, dollars as cents, whole numbers, checkboxes and ids.
// Each returns null when the field is empty or not valid, for the action to report.
export const text = (form: FormData, key: string, max = 2000) => {
  const v = String(form.get(key) ?? "").trim();
  return v ? v.slice(0, max) : null;
};

// "12.50" -> 1250
export const cents = (form: FormData, key: string) => {
  const v = String(form.get(key) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

export const whole = (form: FormData, key: string, min = 0) => {
  const n = Number(String(form.get(key) ?? "").trim());
  return Number.isInteger(n) && n >= min ? n : null;
};

export const checked = (form: FormData, key: string) => form.get(key) === "on";

export const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

// A plain web address (http or https), or null.
export const url = (form: FormData, key: string) => {
  const v = text(form, key, 500);
  if (!v) return null;
  try {
    const u = new URL(v, "https://placeholder.invalid");
    return u.protocol === "https:" || u.protocol === "http:" ? v : null;
  } catch {
    return null;
  }
};
