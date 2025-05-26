"use client";

import { useEffect } from 'react'; // Importe o useEffect
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const farmsString = localStorage.getItem("farms");
      if (farmsString) {
        try {
          const farmsArray = JSON.parse(farmsString);
          if (Array.isArray(farmsArray) && farmsArray.length > 0) {
            router.push("/crafts");
          }
        } catch (error) {
          console.error("Erro ao parsear 'farms' do localStorage:", error);
        }
      }
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-10">
      <h2 className={`text-4xl font-bold uppercase tracking-wider`}>RedM Farm Admin</h2>
      <div className="flex gap-5">
        <Button className="uppercase" onClick={() => router.push("/create")}>Nova Fazenda +</Button>
      </div>
    </div>
  );
}