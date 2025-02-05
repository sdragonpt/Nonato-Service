// formatEuroNumber.jsx
const formatEuroNumber = (number) => {
  if (number === null || number === undefined) return "0,00";
  return number
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default formatEuroNumber;
