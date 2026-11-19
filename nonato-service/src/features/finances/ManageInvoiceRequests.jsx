// ManageInvoiceRequests.jsx
// Página "Pedidos de Fatura" (menu Orçamentos & Financeiro): todos os pedidos
// de fatura de todos os clientes, e um botão para criar um pedido novo — para
// um cliente registado ou para um cliente ainda não registado. Usa a mesma
// janela e o mesmo histórico dos Detalhes do Cliente.

import { useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { PageHeader, FilterBar, SearchInput, Fab } from "../../components/app";
import SolicitarFaturaDialog from "../clients/components/SolicitarFaturaDialog.jsx";
import ClientInvoiceRequests from "../clients/components/ClientInvoiceRequests.jsx";

const ManageInvoiceRequests = () => {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      <PageHeader
        icon={Receipt}
        title="Pedidos de Fatura"
        description="Pedidos de fatura avulsos, de orçamentos de peças e de ordens de serviço — também para clientes não registados"
        actions={
          <Button onClick={() => setOpen(true)} className="hidden sm:inline-flex">
            <Plus /> Novo pedido de fatura
          </Button>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Procurar por cliente, nº do documento ou nota…"
          className="lg:max-w-none"
        />
      </FilterBar>

      <ClientInvoiceRequests refreshKey={refreshKey} search={search} />

      <SolicitarFaturaDialog
        open={open}
        onOpenChange={setOpen}
        client={null}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <Fab actions={[{ icon: Plus, label: "Novo pedido de fatura", onClick: () => setOpen(true) }]} />
    </div>
  );
};

export default ManageInvoiceRequests;
