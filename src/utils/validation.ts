export function validateRequired(
  value: string,
  fieldLabel: string,
): string | null {
  if (!value.trim()) {
    return `${fieldLabel} обязательно для заполнения.`;
  }

  return null;
}

export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldLabel: string,
): string | null {
  const trimmed = value.trim();

  if (trimmed.length < min) {
    return `${fieldLabel} должен содержать не менее ${min} символов.`;
  }

  if (trimmed.length > max) {
    return `${fieldLabel} не должен превышать ${max} символов.`;
  }

  return null;
}
