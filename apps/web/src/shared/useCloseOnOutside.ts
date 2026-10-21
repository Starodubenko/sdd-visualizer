import { useEffect, useRef, type RefObject } from 'react';

export const useCloseOnOutside = (
  open: boolean,
  onClose: () => void,
): RefObject<HTMLDivElement | null> => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && ref.current && !ref.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onClose]);
  return ref;
};
