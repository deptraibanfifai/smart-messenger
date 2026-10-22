import React, { useEffect, useRef, useState } from 'react';

export default function GoogleSignIn({ onCredential, disabled }) {
  const container = useRef(null);
  const callback = useRef(onCredential);
  const [error, setError] = useState('');
  callback.current = onCredential;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !container.current || !window.google?.accounts?.id) return;
      container.current.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => credential && callback.current(credential),
      });
      window.google.accounts.id.renderButton(container.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
        shape: 'pill', width: Math.min(container.current.clientWidth, 350),
      });
    };
    if (window.google?.accounts?.id) render();
    else {
      const script = document.querySelector('script[data-google-identity]') || document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.dataset.googleIdentity = 'true';
      script.addEventListener('load', render);
      script.addEventListener('error', () => !cancelled && setError('Không tải được đăng nhập Google'));
      if (!script.isConnected) document.head.appendChild(script);
      return () => { cancelled = true; script.removeEventListener('load', render); };
    }
    return () => { cancelled = true; };
  }, [clientId]);

  return <div className="google-signin">
    {clientId ? <div ref={container} style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }} />
      : <p className="auth-hint">Cần cấu hình VITE_GOOGLE_CLIENT_ID để bật Google.</p>}
    {error && <p role="alert" className="auth-error">{error}</p>}
  </div>;
}
