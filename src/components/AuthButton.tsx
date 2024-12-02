// components/authbutton.tsx
import { useSession, signIn, signOut } from 'next-auth/react';
import { LogoutIcon } from './icons/logout';

export const AuthButton = () => {
  const { data: session } = useSession();

  if (session) {
    return (
      <button
        onClick={() => signOut()}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        aria-label="Logout"
      >
        <LogoutIcon />
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
      aria-label="Login"
    >
      Sign in
    </button>
  );
};
