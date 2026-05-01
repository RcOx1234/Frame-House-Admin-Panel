import { useEffect } from 'react';

const MQ = '(max-width: 767px)';

let lockCount = 0;
let savedOverflow = '';

function acquire(mq: MediaQueryList) {
  if (!mq.matches) return;
  lockCount += 1;
  if (lockCount === 1) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
}

function release() {
  const mq = window.matchMedia(MQ);
  lockCount = Math.max(0, lockCount - 1);
  if (!mq.matches || lockCount === 0) {
    document.body.style.overflow = savedOverflow;
  } else {
    document.body.style.overflow = 'hidden';
  }
}

/**
 * En viewport móvil (max 767px), bloquea el scroll del documento mientras un overlay
 * está abierto. En escritorio no bloquea el body (comportamiento actual del sitio).
 * Varios overlays: contador hasta que todos cierren.
 */
export function useLockBodyScrollMobile(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const mq = window.matchMedia(MQ);

    acquire(mq);

    const onChange = () => {
      if (mq.matches) {
        if (lockCount > 0) document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = savedOverflow;
      }
    };

    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      release();
    };
  }, [locked]);
}
