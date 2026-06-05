export function getSeasonalContext(now = new Date()) {
  const month = now.getUTCMonth() + 1;

  if (month === 10) {
    return { seasonKey: 'halloween', label: 'Halloween Season', accent: '#f97316' };
  }

  if (month === 12) {
    return { seasonKey: 'christmas', label: 'Christmas Season', accent: '#dc2626' };
  }

  if (month >= 6 && month <= 8) {
    return { seasonKey: 'summer', label: 'Summer Rewatch Season', accent: '#f59e0b' };
  }

  return { seasonKey: 'standard', label: 'Current Highlights', accent: '#0ea5e9' };
}
