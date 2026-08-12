// ClientCombobox.jsx - Seletor de cliente pesquisável, com foto e por ordem
// alfabética. Substitui o <Select> simples (lista sem imagem, sem pesquisa,
// pela ordem de chegada da Firestore) usado em todos os formulários onde é
// preciso escolher um cliente (ordens, agendamentos, orçamentos, etc.).
//
// API pensada para ser um substituto direto do <Select>: value/onValueChange
// com o clientId, mais a lista de clientes (normalmente vinda do
// ClientsContext partilhado).
import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, User, Ban } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import { cn } from "@/lib/utils";
import { searchIncludes } from "@/utils/normalizeSearch.js";

const getInitials = (name) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

export const ClientCombobox = ({
  clients = [],
  value,
  onValueChange,
  placeholder = "Selecione um Cliente",
  disabled = false,
  className,
  // ✅ Alguns formulários permitem não associar nenhum cliente (ex: peças
  // desmontadas, ordens de preparação). Quando allowNone está ativo, mostra
  // uma opção extra no topo da lista com o valor `noneValue`.
  allowNone = false,
  noneValue = "none",
  noneLabel = "Sem cliente",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // ✅ Sempre por ordem alfabética (pt-PT), independentemente da ordem em
  // que os clientes vieram da Firestore.
  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-PT")),
    [clients]
  );

  // ✅ Pesquisa insensível a acentos/maiúsculas, por nome ou telefone —
  // mesmo utilitário usado no resto da app (searchIncludes).
  const filteredClients = useMemo(() => {
    if (!search.trim()) return sortedClients;
    return sortedClients.filter(
      (client) =>
        searchIncludes(client.name, search) ||
        (client.phone && client.phone.includes(search))
    );
  }, [sortedClients, search]);

  const selectedClient = clients.find((c) => c.id === value);
  const isNoneSelected = allowNone && value === noneValue;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-zinc-900 border-zinc-700 text-white font-normal hover:bg-zinc-900 hover:text-white",
            !selectedClient && "text-zinc-500",
            className
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            {selectedClient ? (
              <>
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={selectedClient.profilePic} alt={selectedClient.name} />
                  <AvatarFallback className="bg-zinc-700 text-zinc-300 text-[10px]">
                    {getInitials(selectedClient.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedClient.name}</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="truncate">
                  {isNoneSelected ? noneLabel : placeholder}
                </span>
              </>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0 bg-zinc-800 border-zinc-700 text-white"
      >
        <Command shouldFilter={false} className="bg-zinc-800">
          <CommandInput
            placeholder="Pesquisar cliente por nome ou telefone..."
            value={search}
            onValueChange={setSearch}
            className="text-white placeholder:text-zinc-500"
          />
          <CommandList>
            <CommandEmpty className="py-4 text-sm text-zinc-400">
              Nenhum cliente encontrado
            </CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value={noneValue}
                  onSelect={() => {
                    onValueChange(noneValue);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="text-zinc-400 aria-selected:bg-zinc-700 aria-selected:text-white cursor-pointer"
                >
                  <Ban className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{noneLabel}</span>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isNoneSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              )}
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={() => {
                    onValueChange(client.id);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="text-white aria-selected:bg-zinc-700 aria-selected:text-white cursor-pointer"
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={client.profilePic} alt={client.name} />
                    <AvatarFallback className="bg-zinc-700 text-zinc-300 text-[10px]">
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{client.name}</span>
                    {client.phone && (
                      <span className="block truncate text-xs text-zinc-400">
                        {client.phone}
                      </span>
                    )}
                  </span>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ClientCombobox;
