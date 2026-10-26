import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './ProfileStyles.css';

export default function ModalDialog({ title, onClose, children }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = () => [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
      .filter(element => !element.hidden && element.type !== 'file');
    (focusable()[0] || dialog).focus();
    const onKey = (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0], last = items[items.length - 1];
      if (!items.length) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', onKey);
    return () => { dialog.removeEventListener('keydown', onKey); previous?.focus(); };
  }, []);
  return createPortal(
    <div className="messenger-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="messenger-dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header className="messenger-dialog-heading"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Đóng cửa sổ"><X size={22} /></button></header>
        {children}
      </section>
    </div>, document.body,
  );
}
