import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Hook that detects clicks outside of the referenced element
 * @param onClickOutside - Callback to run when click outside is detected
 * @param isActive - Whether the listener is active (e.g., when menu is open)
 * @returns ref to attach to the element
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  onClickOutside: () => void,
  isActive: boolean = true
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClickOutside();
      }
    };

    // Use setTimeout to avoid triggering on the same click that opened the menu
    const timeoutId = setTimeout(() => {
      window.addEventListener('click', handleClick);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('click', handleClick);
    };
  }, [onClickOutside, isActive]);

  return ref;
}
