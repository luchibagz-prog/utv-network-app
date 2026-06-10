export function isFreeUploadWindow() {
  const endDate = process.env.NEXT_PUBLIC_FREE_UPLOAD_END_DATE;
  if (!endDate) return false;
  return new Date() <= new Date(endDate + 'T23:59:59');
}
