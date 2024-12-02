// components/authbutton.tsx
import { useSession, signIn, signOut } from 'next-auth/react';
import { LogoutIcon } from './icons/logout';

export const AuthButton = () => {
  const { data: session } = useSession();

  if (session) {
    return (
      <button
        onClick={() => signOut()}
        className="text-base font-medium 
          rounded-full shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 
          hover:from-blue-700 hover:to-indigo-700 px-0 mr-2 py-0 transition-all duration-300 ease-in-out"
        aria-label="Logout"
      >
        <LogoutIcon />
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
      aria-label="Login"
    >
      Sign in
    </button>
  );
};
