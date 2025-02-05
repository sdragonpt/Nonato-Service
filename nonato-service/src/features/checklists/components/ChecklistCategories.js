// ChecklistCategories.js - novo arquivo
export const CHECKLIST_CATEGORIES = [
    {
      value: "maintenance",
      label: "Checklist de Manutenção",
      description: "Para acompanhamento e registro de manutenções regulares"
    },
    {
      value: "operational_training",
      label: "Checklist de Treinamento Operacional",
      description: "Para acompanhamento do treinamento operacional dos equipamentos"
    },
    {
      value: "receiving",
      label: "Checklist de Recebimento do Equipamento",
      description: "Para verificação inicial de equipamentos recebidos"
    },
    {
      value: "programming",
      label: "Checklist de Programação",
      description: "Para verificação e configuração da programação dos equipamentos"
    },
    {
      value: "installation",
      label: "Checklist de Instalação",
      description: "Para acompanhamento do processo de instalação dos equipamentos"
    }
  ];
  
  export const CHECKLIST_CATEGORIES_MAP = CHECKLIST_CATEGORIES.reduce(
    (acc, category) => {
      acc[category.value] = category;
      return acc;
    },
    {}
  );