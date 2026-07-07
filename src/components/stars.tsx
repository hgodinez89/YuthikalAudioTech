"use client";

/* Estrella del prototipo: rellena en cian, vacía con trazo gris. */
export function Star({ filled, size = 15 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "var(--accent)" : "none"}
      stroke={filled ? "var(--accent)" : "var(--disabled)"}
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 21.5 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}

export function StarsRow({ value, size }: { value: number; size?: number }) {
  return (
    <span className="flex gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= value} size={size} />
      ))}
    </span>
  );
}

export function StarsInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div>
      <span className="mb-[9px] block text-[12.5px] font-semibold text-sub">{label}</span>
      <div className="flex gap-[5px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            aria-label={`${label}: ${i}`}
            className="cursor-pointer leading-none"
          >
            <Star filled={i <= value} size={26} />
          </button>
        ))}
      </div>
    </div>
  );
}
