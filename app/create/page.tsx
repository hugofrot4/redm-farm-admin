"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FarmData {
    name: string;
    owner: string;
}

export default function Home() {
    const [formData, setFormData] = useState<FarmData>({
        name: "",
        owner: "",
    });
    
    const [message, setMessage] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: type === "number" ? parseFloat(value) : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const existingFarmsString = localStorage.getItem("farms");
            let existingFarms: FarmData[] = [];

            if (existingFarmsString) {
                existingFarms = JSON.parse(existingFarmsString);
            }

            existingFarms.push(formData);

            localStorage.setItem("farms", JSON.stringify(existingFarms));

            setFormData({
                name: "",
                owner: "",
            });
            setMessage("Fazenda salva localmente com sucesso!");

            console.log("Dados salvos no localStorage:", existingFarms);

            router.push("/crafts");
        } catch (error) {
            console.error("Erro ao salvar no localStorage:", error);
            setMessage("Erro ao salvar a fazenda.");
        }
    };

    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-10">
            <div className="w-full max-w-2xl">
                <h2 className="text-2xl font-bold">Criar nova fazenda</h2>

                <form onSubmit={handleSubmit}>
                  <div className="mt-4 flex flex-col gap-2">
                      <Input
                          type="text"
                          placeholder="Nome da fazenda"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                      />
                      <Input
                          type="text"
                          placeholder="Proprietario"
                          name="owner"
                          id="owner"
                          value={formData.owner}
                          onChange={handleChange}
                          required
                      />
                  </div>

                  {message && (
                      <div className={`mt-4 p-2 rounded ${message.includes("sucesso") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {message}
                      </div>
                  )}

                  <div className="flex justify-between mt-6">
                      <Button
                          className="uppercase"
                          variant="secondary"
                          onClick={() => router.push("/")}
                      >
                          Cancelar
                      </Button>
                      <Button className="uppercase" variant="default" type="submit">
                          Criar Fazenda
                      </Button>
                  </div>
                </form>
            </div>
        </div>
    );
}
