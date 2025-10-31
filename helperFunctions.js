export function validateRequiredFields(body, fields) {
  const missing = fields.filter((f) => !body[f]);
  return {
    isValid: missing.length === 0,
    missing,
  };
}
