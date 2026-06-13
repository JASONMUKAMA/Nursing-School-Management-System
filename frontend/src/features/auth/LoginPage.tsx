import { FormEvent, useState } from 'react';

import { Link, Navigate } from 'react-router-dom';

import { ApiClientError } from '../../api/client';

import { Alert } from '../../components/ui/Alert';

import { Button } from '../../components/ui/Button';

import { Input } from '../../components/ui/Input';

import { useAuth } from '../../hooks/useAuth';



export function LoginPage() {

  const { login, login2Fa, isAuthenticated, isLoading } = useAuth();

  const [userNameOrEmail, setUserNameOrEmail] = useState('admin');

  const [password, setPassword] = useState('Admin@123');

  const [twoFactorCode, setTwoFactorCode] = useState('');

  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);

  const [error, setError] = useState('');

  const [submitting, setSubmitting] = useState(false);



  if (!isLoading && isAuthenticated) {

    return <Navigate to="/app/dashboard" replace />;

  }



  const handleSubmit = async (e: FormEvent) => {

    e.preventDefault();

    setError('');

    setSubmitting(true);

    try {

      if (twoFactorUserId) {

        await login2Fa(twoFactorUserId, twoFactorCode);

        return;

      }

      const result = await login({ userNameOrEmail, password });

      if (result.requiresTwoFactor && result.twoFactorUserId) {

        setTwoFactorUserId(result.twoFactorUserId);

      }

    } catch (err) {

      const message =

        err instanceof ApiClientError ? err.message : 'Login failed. Please try again.';

      setError(message);

    } finally {

      setSubmitting(false);

    }

  };



  const reset2Fa = () => {

    setTwoFactorUserId(null);

    setTwoFactorCode('');

    setError('');

  };



  return (

    <div className="login-page">

      <div className="login-card">

        <div className="login-header">

          <span className="login-logo">➕</span>

          <h1>Excellence in Healthcare Education</h1>

          <p>Staff & Student Portal</p>

        </div>



        {error && <Alert type="error" message={error} onClose={() => setError('')} />}



        {twoFactorUserId ? (

          <form onSubmit={handleSubmit} className="login-form">

            <p className="text-muted login-2fa-hint">

              Enter the 6-digit code from your authenticator app.

            </p>

            <Input

              label="Authentication Code"

              value={twoFactorCode}

              onChange={(e) => setTwoFactorCode(e.target.value)}

              placeholder="000000"

              required

              autoComplete="one-time-code"

              inputMode="numeric"

            />

            <Button type="submit" disabled={submitting} className="login-btn">

              {submitting ? 'Verifying...' : 'Verify & Sign In'}

            </Button>

            <Button type="button" variant="ghost" onClick={reset2Fa} className="login-btn">

              Back to login

            </Button>

          </form>

        ) : (

          <form onSubmit={handleSubmit} className="login-form">

            <Input

              label="Username or Email"

              value={userNameOrEmail}

              onChange={(e) => setUserNameOrEmail(e.target.value)}

              required

              autoComplete="username"

            />

            <Input

              label="Password"

              type="password"

              value={password}

              onChange={(e) => setPassword(e.target.value)}

              required

              autoComplete="current-password"

            />

            <Button type="submit" disabled={submitting} className="login-btn">

              {submitting ? 'Signing in...' : 'Sign In'}

            </Button>

          </form>

        )}



        <p className="login-hint">

          Default: admin / Admin@123 · student1 / Student@123 ·{' '}

          <Link to="/" className="login-back-link">

            Back to home

          </Link>

        </p>

      </div>

    </div>

  );

}


