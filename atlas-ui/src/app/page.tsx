'use client';

import { Workspace } from "@/components/Workspace";
import { getStore } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [showEmpty, setShowEmpty] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    // prevents this code from running 2ce (which react does by default for some reason) and creating 2 vaults
    if (ran.current) return;
    ran.current = true;

    async function decide() {
      const store = getStore();
      const lastLogIn = await store.getLastLogIn();

      if (!lastLogIn) {
        const vault = await store.createVault();
        await store.setLastLogIn(Date.now().toString());
        router.replace(`/vault/${vault.id}`);
        return;
      }

      setShowEmpty(true);
    }

    decide();
  }, [router]);

  return showEmpty ? <Workspace /> : null;
}
