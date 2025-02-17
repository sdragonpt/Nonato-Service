export const calculateTotalsWithIVA = (services, ivaRate) => {
  const subtotal = services.reduce((acc, curr) => acc + curr.total, 0);
  const ivaAmount = (subtotal * ivaRate) / 100;
  const total = subtotal + ivaAmount;

  return {
    subtotal,
    ivaAmount,
    total,
    ivaRate,
  };
};

export const formatCurrency = (value) => {
  return value.toFixed(2);
};
