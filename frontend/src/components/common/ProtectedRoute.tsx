import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthContext from '@context/index';

/**
 * Gates routes that require an authenticated AND email-verified user.
 *
 * - Not signed in       → redirect home (login modal lives there).
 * - Signed in, email
 *   not yet verified    → redirect to /verify-required (the gate page).
 * - Both true           → render the protected route.
 *
 * `emailVerified === undefined` is treated as verified — covers Google OAuth
 * users (always verified server-side) and the brief window during first
 * render after login before the user object hydrates from the response.
 */
const ProtectedRoute = ({ children }) => {
  const { auth } = useContext(AuthContext);
  const location = useLocation();
  const isAuthed = auth && auth.token;

  if (!isAuthed) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  if (auth.user?.emailVerified === false) {
    return <Navigate to="/verify-required" replace />;
  }
  return children;
};

export default ProtectedRoute;
