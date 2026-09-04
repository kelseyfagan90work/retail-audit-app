'use client';

import { useRouter } from 'next/navigation';

export default function BackButton({ fallbackHref }) {
  const router = useRouter();
  return (
    <button
      className="ghost small"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else if (fallbackHref) router.push(fallbackHref);
      }}
      style={{ marginBottom: 12 }}
    >
      ← Back
    </button>
  );
}
