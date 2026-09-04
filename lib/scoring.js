// Computes an audit's overall score: percentage of "yes" answers out of
// (yes + no). Questions marked N/A or left unanswered don't count toward
// the denominator at all — this is the standard scoring model for
// checklist-style audits.
export function computeScore(questions) {
  const scored = questions.filter((q) => q.answer === 'yes' || q.answer === 'no');
  if (scored.length === 0) return null;
  const yesCount = scored.filter((q) => q.answer === 'yes').length;
  return Math.round((yesCount / scored.length) * 1000) / 10; // one decimal place
}
