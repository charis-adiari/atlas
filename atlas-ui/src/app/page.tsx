'use client';

import { Workspace } from '@/components/Workspace/Workspace';
import { getStore } from '@/lib/storage';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [showEmpty, setShowEmpty] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const redirect = async () => {
      const store = getStore();
      const lastLogIn = await store.getLastVisit();

      if (!lastLogIn) {
        const vault = await store.createVault();
        const now = new Date(Date.now());
        await store.setLastLogIn(now.toISOString());
        router.replace(`/vault/${vault.id}`);
        return;
      }

      setShowEmpty(true);
    };

    redirect();
  }, [router]);

  return showEmpty ? <Workspace /> : null;
}
