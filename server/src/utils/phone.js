/**
 * Normalizes Pakistani phone numbers to standard E.164 (+923XXXXXXXXX)
 */
export const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('03')) {
    return '+92' + cleaned.substring(1);
  } else if (cleaned.startsWith('923')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('+923')) {
    return cleaned;
  }

  return cleaned;
};
