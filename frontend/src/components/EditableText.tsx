import { useState, useRef, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
  inputClassName?: string;
  emptyText?: string;
}

export default function EditableText({
  value,
  onSave,
  placeholder = 'Click to edit',
  multiline = false,
  maxLength,
  className = '',
  inputClassName = '',
  emptyText = 'Not set',
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at end
      const length = editValue.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    // Don't save if unchanged
    if (trimmedValue === value) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch {
      // Keep editing mode open on error, reset to original
      setEditValue(value);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    const inputProps = {
      ref: inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>,
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setEditValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      placeholder,
      maxLength,
      disabled: saving,
      className: `input ${inputClassName} ${saving ? 'opacity-50' : ''}`,
    };

    return (
      <div className={className}>
        {multiline ? (
          <textarea {...inputProps} rows={3} className={`input resize-none ${inputClassName}`} />
        ) : (
          <input type="text" {...inputProps} />
        )}
        {maxLength && (
          <div className="text-xs text-gray-400 mt-1">
            {editValue.length}/{maxLength}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`group flex items-start gap-2 text-left hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors ${className}`}
    >
      <span className={value ? '' : 'text-gray-400 italic'}>
        {value || emptyText}
      </span>
      <svg
        className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    </button>
  );
}
