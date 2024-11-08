import React from "react";
import { useNavigate } from "react-router-dom";

const ManageServices = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-3xl mx-auto rounded-lg">
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Ordens de Serviço
      </h2>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center">
        <button
          className="w-32 h-16 bg-[#1d2d50] mr-4 text-white text-lg flex items-center justify-center rounded-lg"
          onClick={() => navigate(`/app/open-services`)}
          aria-label="Serviços Abertos"
        >
          Abertas
        </button>

        <button
          onClick={() => navigate(`/app/add-service`)}
          className="h-20 w-20 -mt-8 bg-[#9df767] text-white font-bold text-3xl flex items-center justify-center rounded-full shadow-lg"
          aria-label="Adicionar Serviço"
        >
          +
        </button>

        <button
          className="w-32 h-16 bg-[#1d2d50] ml-4 text-white text-lg flex items-center justify-center rounded-lg"
          onClick={() => navigate(`/app/closed-services`)}
          aria-label="Serviços Fechados"
        >
          Fechadas
        </button>
      </div>
    </div>
  );
};

export default ManageServices;
