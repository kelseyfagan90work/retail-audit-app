// Standard "natural sort": splits each string into number/non-number chunks
// and compares number chunks numerically. Fixes the classic bug where plain
// string sort puts "10" before "2" (it doesn't here), while still handling
// non-numeric store numbers like "N-01" sensibly.
export function naturalCompare(a, b) {
  const chunk = (s) => {
    const out = [];
    String(s).replace(/(\d+)|(\D+)/g, (_, digits, rest) => {
      out.push(digits !== undefined ? [1, parseInt(digits, 10)] : [0, rest]);
      return '';
    });
    return out;
  };
  const ax = chunk(a);
  const bx = chunk(b);
  const len = Math.max(ax.length, bx.length);
  for (let i = 0; i < len; i++) {
    if (!ax[i]) return -1;
    if (!bx[i]) return 1;
    const [aType, aVal] = ax[i];
    const [bType, bVal] = bx[i];
    if (aType !== bType) return aType - bType;
    if (aType === 1) { if (aVal !== bVal) return aVal - bVal; }
    else { const c = aVal.localeCompare(bVal); if (c) return c; }
  }
  return 0;
}
