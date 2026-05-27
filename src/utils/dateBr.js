/** Máscara enquanto digita: só números → dd/mm/aaaa */
export function maskBrDateInput(raw) {
  const digits = String(raw).replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** ISO yyyy-mm-dd → dd/mm/aaaa para exibição */
export function isoToBr(iso) {
  if (!iso || typeof iso !== "string") return "";
  const parts = iso.trim().split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  if (!y || !m || !d) return "";
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

/** dd/mm/aaaa (ou só dígitos) → ISO yyyy-mm-dd ou "" se inválido */
export function brToIso(br) {
  const trimmed = String(br).trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 8) {
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    return validateAndFormatIso(y, m, d);
  }

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";

  const [, d, m, y] = match;
  return validateAndFormatIso(y, m, d);
}

function validateAndFormatIso(y, m, d) {
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (year < 1900 || year > 2100) return "";
  if (month < 1 || month > 12) return "";
  if (day < 1 || day > 31) return "";

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
