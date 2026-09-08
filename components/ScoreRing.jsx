export default function ScoreRing({ score, size = 64 }) {
  const fontSize = Math.max(9, Math.round(size * 0.3));
  const borderWidth = Math.max(4, Math.round(size * 0.06));
  const style = { width: size, height: size, fontSize, borderWidth };

  if (score == null) return <div className="score-ring" style={style}>—</div>;
  const tier = score >= 90 ? 'good' : score >= 75 ? 'mid' : 'low';
  return (
    <div className={`score-ring ${tier}`} style={style}>
      {Math.round(score)}%
    </div>
  );
}
