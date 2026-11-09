export function Logo() {
  return <div className="ptl-brand"><span>PTL</span><p>Content studio</p></div>;
}
export function Icon() {
  return <span className="ptl-brand-icon" aria-label="PTL home">PTL</span>;
}
export function LoginHelp() {
  // Without email delivery the reset link leads nowhere, so it is replaced by who to ask.
  const email = Boolean(process.env.SMTP_HOST);
  return <>
    <p className="ptl-login-help">Sign in to manage PTL’s events, stories and songbook.</p>
    {!email && <>
      <style>{`.login__form a[href$="/forgot"], .login a[href$="/forgot"] { display: none; }`}</style>
      <p className="ptl-login-help ptl-login-help--small">Forgot your password? Ask a super admin to set a new one.</p>
    </>}
  </>;
}
