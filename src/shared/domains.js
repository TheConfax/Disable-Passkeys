function isExactHost(d) {
  return d === 'localhost'
    || (d.startsWith('[') && d.endsWith(']') && d.includes(':'))
    || /^\d{1,3}(\.\d{1,3}){3}$/.test(d);
}

export function getMatchPatterns(domains) {
  if (!Array.isArray(domains)) return [];
  return domains
    .filter(Boolean)
    .map(d => isExactHost(d) ? `*://${d}/*` : `*://*.${d}/*`);
}

export function hostMatchesDomain(host, d) {
  if (!host || !d) return false;
  if (isExactHost(d)) return host === d;
  return host === d || host.endsWith('.' + d);
}
