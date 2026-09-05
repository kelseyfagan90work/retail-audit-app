import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// undefined = loading, null = not logged in, 'unprovisioned' = logged in but
// no profile row yet, 'needs-password' = logged in but hasn't set a password
// yet (fresh invite), otherwise the user object.
export function useCurrentUser() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api.me().then((res) => {
      if (!res.authenticated) setUser(null);
      else if (!res.provisioned) setUser('unprovisioned');
      else if (!res.passwordSet) setUser('needs-password');
      else setUser(res);
    }).catch(() => setUser(null));
  }, []);

  return user;
}
