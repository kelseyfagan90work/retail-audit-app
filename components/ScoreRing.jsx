export default function ScoreRing({ score, size = 64 }) {
  if (score == null) return <div className="score-ring" style={{ width: size, height: size }}>—</div>;
  const tier = score >= 90 ? 'good' : score >= 75 ? 'mid' : 'low';
  return (
    <div className={`score-ring ${tier}`} style={{ width: size, height: size }}>
      {Math.round(score)}%
    </div>
  );
}
