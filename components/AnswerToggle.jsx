const OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'n_a', label: 'N/A' },
];

export default function AnswerToggle({ value, onChange, disabled }) {
  return (
    <div className="answer-toggle">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          className={value === opt.value ? `selected ${opt.value}` : ''}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
