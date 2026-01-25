interface NotificationToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  loading?: boolean;
}

export default function NotificationToggle({
  label,
  description,
  enabled,
  onChange,
  loading = false,
}: NotificationToggleProps) {
  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1 pr-4">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={loading}
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          ${enabled ? "bg-primary-600" : "bg-gray-200"}
          ${loading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${enabled ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}
