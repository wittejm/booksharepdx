interface NotificationToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  loading?: boolean;
  indeterminate?: boolean;
}

export default function NotificationToggle({
  label,
  description,
  enabled,
  onChange,
  loading = false,
  indeterminate = false,
}: NotificationToggleProps) {
  // When indeterminate, clicking will enable all
  const handleClick = () => {
    if (indeterminate) {
      onChange(true);
    } else {
      onChange(!enabled);
    }
  };

  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1 pr-4">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={indeterminate ? "mixed" : enabled}
        disabled={loading}
        onClick={handleClick}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          ${indeterminate ? "bg-primary-300" : enabled ? "bg-primary-600" : "bg-gray-200"}
          ${loading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${indeterminate ? "translate-x-2.5" : enabled ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}
