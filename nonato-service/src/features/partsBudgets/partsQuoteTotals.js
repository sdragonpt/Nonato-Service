// src/features/partsBudgets/partsQuoteTotals.js
// Totais de um orçamento de peças, numa só conta usada no detalhe do
// orçamento e na Solicitação de Fatura (igual à da lista de orçamentos):
//   peças (com margem de lucro, se houver) + portes = sem IVA; + IVA se o
//   orçamento incluir IVA.

const num = (v) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
};

export function partsQuoteTotals(quote = {}) {
  const margin =
    quote.includeProfitMargin !== false && num(quote.profitMargin) > 0 ? num(quote.profitMargin) : 0;
  const pecas = (quote.partsQuoteItems || quote.items || []).reduce((t, item) => {
    const price = num(item.price) * (1 + margin / 100);
    return t + (num(item.quantity) || 1) * price;
  }, 0);
  const portes = num(quote.shippingPrice);
  const semIva = pecas + portes;
  const taxaIva = quote.includeVat ? num(quote.vatRate) || 23 : 0;
  const iva = (semIva * taxaIva) / 100;
  const round = (v) => Math.round(v * 100) / 100;
  return {
    pecas: round(pecas),
    portes: round(portes),
    semIva: round(semIva),
    taxaIva,
    iva: round(iva),
    total: round(semIva + iva),
  };
}
