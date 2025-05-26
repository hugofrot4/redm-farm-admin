"use client";

import {
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Eye, ListPlus, Save, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
}
interface IngredientInput {
  id: string;
  name: string;
  quantity: string;
}
interface CraftData {
  id: string;
  name: string;
  ingredients: Ingredient[];
  type: string;
  quantityProduced: number;
  margin: number;
  totalCost: number;
  unitCost: number;
  totalProfit: number;
  unitProfit: number;
  totalSellingPrice: number;
  unitSellingPrice: number;
}
interface FarmData {
  name: string;
  owner: string;
  crafts?: CraftData[];
}
interface IngredientCost {
  [ingredientName: string]: number;
}

const initialIngredientInput: () => IngredientInput = () => ({
  id: crypto.randomUUID(),
  name: "",
  quantity: "",
});

const initialCraftState: Omit<CraftData, "id" | "ingredients" | "totalCost" | "unitCost" | "totalProfit" | "unitProfit" | "totalSellingPrice" | "unitSellingPrice"> & { ingredients: IngredientInput[] } = {
  name: "",
  ingredients: [initialIngredientInput()],
  type: "",
  quantityProduced: 1,
  margin: 0,
};

export default function Crafts() {
  const [farms, setFarms] = useState<FarmData[]>([]);
  const [newCraft, setNewCraft] = useState(initialCraftState);
  const [isCraftDialogOpen, setIsCraftDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editingCraftId, setEditingCraftId] = useState<string | null>(null);
  const [isViewIngredientsDialogOpen, setIsViewIngredientsDialogOpen] = useState(false);
  const [selectedCraftForIngredients, setSelectedCraftForIngredients] = useState<CraftData | null>(null);
  const [ingredientCosts, setIngredientCosts] = useState<IngredientCost>({});
  const [editableStringCosts, setEditableStringCosts] = useState<{ [name: string]: string; }>({});
  const [isIngredientCostDialogOpen, setIsIngredientCostDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [craftToDeleteId, setCraftToDeleteId] = useState<string | null>(null);
  const router = useRouter();

  const calculateCraftDetails = useCallback(
    (
      ingredients: Ingredient[],
      quantityProduced: number,
      marginPercent: number,
      costs: IngredientCost
    ): Pick<CraftData, "totalCost" | "unitCost" | "totalProfit" | "unitProfit" | "totalSellingPrice" | "unitSellingPrice"> => {
      let totalCostCalculated = 0;
      ingredients.forEach((ing) => {
        const costPerUnit = costs[ing.name.trim()] || 0;
        totalCostCalculated += costPerUnit * ing.quantity;
      });
      const unitCostCalculated = quantityProduced > 0 ? totalCostCalculated / quantityProduced : 0;
      const marginDecimal = marginPercent / 100;
      const totalProfitCalculated = totalCostCalculated * marginDecimal;
      const unitProfitCalculated = unitCostCalculated * marginDecimal;
      const totalSellingPriceCalculated = totalCostCalculated + totalProfitCalculated;
      const unitSellingPriceCalculated = unitCostCalculated + unitProfitCalculated;
      return {
        totalCost: totalCostCalculated, unitCost: unitCostCalculated,
        totalProfit: totalProfitCalculated, unitProfit: unitProfitCalculated,
        totalSellingPrice: totalSellingPriceCalculated, unitSellingPrice: unitSellingPriceCalculated,
      };
    },
    []
  );

  useEffect(() => {
    const farmsStringLs = localStorage.getItem("farms");
    if (!farmsStringLs && typeof window !== 'undefined') {
        router.push("/");
        return;
    }

    let currentIngredientCosts: IngredientCost = {};
    const costsString = localStorage.getItem("ingredientCosts");
    if (costsString) {
      try { currentIngredientCosts = JSON.parse(costsString); setIngredientCosts(currentIngredientCosts); }
      catch (error) { console.error("Erro ao carregar custos de ingredientes:", error); }
    }

    if (farmsStringLs) {
      try {
        let loadedFarms: FarmData[] = JSON.parse(farmsStringLs);
        loadedFarms = loadedFarms.map(farm => {
          if (!farm.crafts || farm.crafts.length === 0) return farm;
          const migratedCrafts = farm.crafts.map(craft => {
            const qP = (typeof craft.quantityProduced === 'number' && craft.quantityProduced > 0) ? craft.quantityProduced : 1;
            const m = typeof craft.margin === 'number' ? craft.margin : 0;
            const ings = craft.ingredients || [];
            const needsRecalcOrInitialization =
              typeof craft.totalCost !== 'number' || typeof craft.unitCost !== 'number' ||
              typeof craft.totalProfit !== 'number' || typeof craft.unitProfit !== 'number' ||
              typeof craft.totalSellingPrice !== 'number' || typeof craft.unitSellingPrice !== 'number' ||
              craft.quantityProduced !== qP || craft.margin !== m;
            if (needsRecalcOrInitialization) {
              const details = calculateCraftDetails(ings, qP, m, currentIngredientCosts);
              return { ...craft, ingredients: ings, quantityProduced: qP, margin: m, ...details };
            }
            return craft;
          });
          return { ...farm, crafts: migratedCrafts };
        });
        setFarms(loadedFarms);
      } catch (error) { console.error("Erro ao carregar ou migrar fazendas:", error); setFarms([]); }
    }
  }, [calculateCraftDetails, router]);

  const getUniqueIngredientsFromAllCrafts = useCallback((): string[] => {
    const allIngredientNames = new Set<string>();
    farms.forEach(farm => {
      farm.crafts?.forEach(craft => {
        (craft.ingredients || []).forEach(ingredient => allIngredientNames.add(ingredient.name.trim()));
      });
    });
    return Array.from(allIngredientNames).sort();
  }, [farms]);

  useEffect(() => {
    if (isIngredientCostDialogOpen) {
      const initialStringCosts: { [name: string]: string } = {};
      const uniqueIngNames = getUniqueIngredientsFromAllCrafts();
      uniqueIngNames.forEach(name => {
        const numericValue = ingredientCosts[name];
        initialStringCosts[name] = (numericValue !== undefined && numericValue !== null) ? numericValue.toString() : "";
      });
      setEditableStringCosts(initialStringCosts);
    }
  }, [isIngredientCostDialogOpen, ingredientCosts, getUniqueIngredientsFromAllCrafts]);

  const handleCraftInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setNewCraft(prev => ({ ...prev, [name]: type === "number" ? parseFloat(value) || 0 : value }));
  };
  const handleIngredientChange = (id: string, field: "name" | "quantity", value: string) => {
    setNewCraft(prev => ({ ...prev, ingredients: prev.ingredients.map(ing => ing.id === id ? { ...ing, [field]: value } : ing) }));
  };
  const addIngredientField = () => {
    setNewCraft(prev => ({ ...prev, ingredients: [...prev.ingredients, initialIngredientInput()] }));
  };
  const removeIngredientField = (id: string) => {
    setNewCraft(prev => ({ ...prev, ingredients: prev.ingredients.filter(ing => ing.id !== id) }));
  };

  const handleSaveCraft = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentFarm) { toast.error("Nenhuma fazenda selecionada."); return; }
    if (newCraft.quantityProduced <= 0) { toast.error("Qtd. produzida deve ser > 0."); return; }

    const processedIngredients: Ingredient[] = newCraft.ingredients
      .filter(ing => ing.name.trim() !== "" && parseFloat(ing.quantity) > 0)
      .map(ing => ({ id: ing.id, name: ing.name.trim(), quantity: parseFloat(ing.quantity) }));

    if (processedIngredients.length === 0) { toast.error("Adicione ingredientes válidos."); return; }

    const calculatedDetails = calculateCraftDetails(processedIngredients, newCraft.quantityProduced, newCraft.margin, ingredientCosts);
    
    let updatedFarms = [...farms];
    const farmIndex = farms.findIndex(f => f.name === currentFarm.name);
    if (farmIndex === -1) { toast.error("Fazenda não encontrada."); return; }

    const farmToUpdate = { ...farms[farmIndex] };
    let farmCrafts = [...(farmToUpdate.crafts || [])];

    if (dialogMode === "edit" && editingCraftId) {
      const craftIndex = farmCrafts.findIndex(c => c.id === editingCraftId);
      if (craftIndex === -1) { toast.error("Craft para editar não encontrado."); return; }
      const updatedCraft: CraftData = {
        ...farmCrafts[craftIndex],
        name: newCraft.name.trim(),
        type: newCraft.type.trim(),
        quantityProduced: newCraft.quantityProduced,
        margin: newCraft.margin,
        ingredients: processedIngredients,
        ...calculatedDetails,
      };
      farmCrafts[craftIndex] = updatedCraft;
      toast.success("Craft atualizado!");
    } else {
      const craftToAdd: CraftData = {
        id: crypto.randomUUID(),
        name: newCraft.name.trim(), type: newCraft.type.trim(),
        quantityProduced: newCraft.quantityProduced, margin: newCraft.margin,
        ingredients: processedIngredients, ...calculatedDetails,
      };
      farmCrafts.push(craftToAdd);
      toast.success("Craft adicionado!");
    }
    
    farmToUpdate.crafts = farmCrafts;
    updatedFarms[farmIndex] = farmToUpdate;

    try {
      localStorage.setItem("farms", JSON.stringify(updatedFarms));
      setFarms(updatedFarms);
      setNewCraft(initialCraftState);
      setIsCraftDialogOpen(false);
      setEditingCraftId(null);
    } catch (error) { 
      console.error("Erro ao salvar craft:", error);
      toast.error("Erro ao salvar craft.");
    }
  };

  const openAddCraftDialog = () => {
    setDialogMode("add");
    setNewCraft(initialCraftState);
    setEditingCraftId(null);
    setIsCraftDialogOpen(true);
  };

  const openEditCraftDialog = (craftToEdit: CraftData) => {
    setDialogMode("edit");
    setEditingCraftId(craftToEdit.id);
    const ingredientsForForm = (craftToEdit.ingredients || []).map(ing => ({
      id: ing.id || crypto.randomUUID(), 
      name: ing.name,
      quantity: ing.quantity.toString(),
    }));

    setNewCraft({
      name: craftToEdit.name,
      type: craftToEdit.type,
      quantityProduced: craftToEdit.quantityProduced,
      margin: craftToEdit.margin,
      ingredients: ingredientsForForm.length > 0 ? ingredientsForForm : [initialIngredientInput()],
    });
    setIsCraftDialogOpen(true);
  };
  
  const confirmDeleteCraft = () => {
    if (!currentFarm || !craftToDeleteId) return;
    const farmIndex = farms.findIndex(f => f.name === currentFarm.name);
    if (farmIndex === -1) {toast.error("Fazenda não encontrada para deletar o craft."); return;}

    const farmToUpdate = { ...farms[farmIndex] };
    farmToUpdate.crafts = (farmToUpdate.crafts || []).filter(c => c.id !== craftToDeleteId);
    
    const updatedFarms = [...farms];
    updatedFarms[farmIndex] = farmToUpdate;

    try {
      localStorage.setItem("farms", JSON.stringify(updatedFarms));
      setFarms(updatedFarms);
      toast.success("Craft deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar craft:", error);
      toast.error("Erro ao deletar craft.");
    } finally {
      setIsDeleteDialogOpen(false);
      setCraftToDeleteId(null);
    }
  };

  const handleDeleteCraftClick = (craftId: string) => {
    setCraftToDeleteId(craftId);
    setIsDeleteDialogOpen(true);
  };

  const handleEditableStringCostChange = (name: string, inputValue: string) => {
    setEditableStringCosts(prev => ({ ...prev, [name]: inputValue }));
  };

  const handleSaveIngredientCosts = () => {
    const newNumericCosts: IngredientCost = {};
    let allCostsValid = true;
    for (const name in editableStringCosts) {
      const stringValue = editableStringCosts[name];
      if (stringValue === "" || stringValue === ".") { newNumericCosts[name] = 0; continue; }
      const parsedValue = parseFloat(stringValue);
      if (isNaN(parsedValue) || parsedValue < 0) {
        toast.error(`Custo inválido para "${name}": "${stringValue}".`);
        allCostsValid = false; break;
      }
      newNumericCosts[name] = parsedValue;
    }
    if (!allCostsValid) return;
    try {
      localStorage.setItem("ingredientCosts", JSON.stringify(newNumericCosts));
      setIngredientCosts(newNumericCosts);
      const updatedFarmsWithRecalculatedCrafts = farms.map(farm => {
        if (!farm.crafts || farm.crafts.length === 0) return farm;
        const recalculatedCrafts = farm.crafts.map(craft => {
          const newDetails = calculateCraftDetails(craft.ingredients, craft.quantityProduced, craft.margin, newNumericCosts);
          return { ...craft, ...newDetails };
        });
        return { ...farm, crafts: recalculatedCrafts };
      });
      setFarms(updatedFarmsWithRecalculatedCrafts);
      localStorage.setItem("farms", JSON.stringify(updatedFarmsWithRecalculatedCrafts));
      setIsIngredientCostDialogOpen(false);
      toast.success("Custos dos ingredientes salvos e crafts atualizados!");
    } catch (error) { 
      console.error("Erro ao salvar custos:", error);
      toast.error("Erro ao salvar custos.");
    }
  };
  
  const openViewIngredientsDialog = (craft: CraftData) => {
    setSelectedCraftForIngredients(craft); setIsViewIngredientsDialogOpen(true);
  };

  const currentFarm = farms.length > 0 ? farms[0] : null;
  const uniqueIngredientsForCostDialog = getUniqueIngredientsFromAllCrafts();

  return (
    <div className="p-4">
      <Toaster richColors position="bottom-right" />
      <div className="flex items-center justify-between pb-4 border-b border-secondary mb-4">
        <h2 className="font-bold text-xl">Crafts | {currentFarm ? currentFarm.name : "Nenhuma fazenda"}</h2>
        <div className="flex gap-2">
          {currentFarm && ( <Button onClick={() => setIsIngredientCostDialogOpen(true)}><ListPlus className="mr-2 h-4 w-4" /> Lista de Ingredientes</Button> )}
          {currentFarm && ( <Button onClick={openAddCraftDialog}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Craft</Button> )}
        </div>
      </div>

      <Dialog open={isCraftDialogOpen} onOpenChange={(isOpen) => { setIsCraftDialogOpen(isOpen); if (!isOpen) { setEditingCraftId(null); setNewCraft(initialCraftState); }}}>
        <DialogContent className="sm:max-w-[725px]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" ? "Adicionar Novo Craft" : "Editar Craft"} para {currentFarm?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCraft} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nome do Craft</Label>
              <Input id="name" name="name" value={newCraft.name} onChange={handleCraftInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Tipo</Label>
              <Input id="type" name="type" value={newCraft.type} onChange={handleCraftInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-start gap-x-4">
              <Label className="text-right pt-2 font-semibold">Ingredientes do Craft</Label>
              <div className="col-span-3 space-y-3">
                {(newCraft.ingredients || []).map(ing => (
                  <div key={ing.id} className="grid grid-cols-12 items-center gap-2">
                    <Input placeholder="Nome Ing." value={ing.name} onChange={e => handleIngredientChange(ing.id, "name", e.target.value)} className="col-span-6"/>
                    <Input type="number" placeholder="Qtd" value={ing.quantity} onChange={e => handleIngredientChange(ing.id, "quantity", e.target.value)} className="col-span-3" min="0.01" step="0.01"/>
                    <div className="col-span-3 flex justify-end">
                      {newCraft.ingredients.length > 1 && <Button type="button" variant="destructive" size="icon" onClick={() => removeIngredientField(ing.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addIngredientField} className="mt-1"><PlusCircle className="mr-2 h-4 w-4" /> Ingrediente</Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantityProduced" className="text-right">Qtd. Produzida</Label>
              <Input id="quantityProduced" name="quantityProduced" type="number" value={newCraft.quantityProduced} onChange={handleCraftInputChange} className="col-span-3" min="1"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="margin" className="text-right">Margem Lucro (%)</Label>
              <Input id="margin" name="margin" type="number" value={newCraft.margin} onChange={handleCraftInputChange} className="col-span-3" placeholder="Ex: 50 para 50%" min="0"/>
            </div>
            <DialogFooter className="mt-6 pt-6 border-t">
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => { setIsCraftDialogOpen(false); setEditingCraftId(null); setNewCraft(initialCraftState);}}>Cancelar</Button></DialogClose>
              <Button type="submit">{dialogMode === "add" ? "Salvar Craft" : "Salvar Alterações"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mt-4">
        <Table>
          <TableCaption>{currentFarm?.crafts?.length ? `Crafts de ${currentFarm.name}.` : `Nenhum craft.`}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead>Ingredientes</TableHead><TableHead>QTD Prod.</TableHead>
              <TableHead>Margem</TableHead><TableHead>Custo Total</TableHead><TableHead>Custo UN</TableHead>
              <TableHead>Lucro Total</TableHead><TableHead>Lucro UN</TableHead>
              <TableHead>Preço Venda Total</TableHead><TableHead>Preço Venda UN</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentFarm?.crafts?.map(craft => (
              <TableRow key={craft.id}>
                <TableCell className="font-medium">{craft.name}</TableCell>
                <TableCell><Button variant="outline" size="sm" onClick={() => openViewIngredientsDialog(craft)}><Eye className="mr-2 h-4 w-4" /> Ver ({(craft.ingredients || []).length})</Button></TableCell>
                <TableCell>{craft.quantityProduced ?? 0}</TableCell><TableCell>{craft.margin ?? 0}%</TableCell>
                <TableCell>${(craft.totalCost ?? 0).toFixed(2)}</TableCell><TableCell>${(craft.unitCost ?? 0).toFixed(2)}</TableCell>
                <TableCell>${(craft.totalProfit ?? 0).toFixed(2)}</TableCell><TableCell>${(craft.unitProfit ?? 0).toFixed(2)}</TableCell>
                <TableCell>${(craft.totalSellingPrice ?? 0).toFixed(2)}</TableCell><TableCell className="text-right">${(craft.unitSellingPrice ?? 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEditCraftDialog(craft)} className="mr-2">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCraftClick(craft.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!currentFarm?.crafts || currentFarm.crafts.length === 0) && (
                <TableRow><TableCell colSpan={11} className="text-center">Nenhum craft para exibir.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este craft? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCraftToDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCraft}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedCraftForIngredients && (
        <Dialog open={isViewIngredientsDialogOpen} onOpenChange={setIsViewIngredientsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Ingredientes de: {selectedCraftForIngredients.name}</DialogTitle></DialogHeader>
            <div className="py-4 max-h-[60vh] overflow-y-auto">
              {(selectedCraftForIngredients.ingredients || []).length > 0 ? (
                <ul className="space-y-2">
                  {(selectedCraftForIngredients.ingredients || []).map(ing => ( <li key={ing.id} className="flex justify-between p-2 border rounded"><span>{ing.name}</span><span className="font-semibold">{ing.quantity}</span></li> ))}
                </ul>
              ) : <p>Nenhum ingrediente.</p>}
            </div>
            <DialogFooter><Button onClick={() => setIsViewIngredientsDialogOpen(false)}>Fechar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isIngredientCostDialogOpen} onOpenChange={setIsIngredientCostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Definir Custos dos Ingredientes</DialogTitle>
            <DialogDescription>Informe o custo unitário para cada ingrediente.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {uniqueIngredientsForCostDialog.length > 0 ? uniqueIngredientsForCostDialog.map(name => (
              <div key={name} className="grid grid-cols-3 items-center gap-3">
                <Label htmlFor={`cost-${name}`} className="col-span-1 truncate" title={name}>{name}</Label>
                <Input
                  id={`cost-${name}`} type="text" inputMode="decimal"
                  value={editableStringCosts[name] ?? ""}
                  onChange={e => { const val = e.target.value; if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) { handleEditableStringCostChange(name, val); }}}
                  placeholder="Custo (ex: 0.50)" className="col-span-2"
                />
              </div>
            )) : <p>Nenhum ingrediente para definir custos.</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSaveIngredientCosts}><Save className="mr-2 h-4 w-4"/> Salvar Custos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}