// InitialPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const InitialPage = ({ onEnter }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const navigate = useNavigate();

  const handleEnter = () => {
    navigate("/app"); // Redireciona para a rota do aplicativo
  };

  useEffect(() => {
    // Timer para simular carregamento
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-900">
      {/* Camada para a imagem de fundo */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isLoaded ? "opacity-60" : "opacity-100"
        }`}
        style={{
          backgroundImage: "url('/background3.png')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      ></div>

      {/* Camada para o botão "Entrar" */}
      {isLoaded && (
        <button
          className="relative z-10 px-6 py-3 bg-[#9df767] text-white font-semibold rounded-full animate-bounce"
          onClick={handleEnter}
        >
          Entrar
        </button>
      )}
    </div>
  );
};

export default InitialPage;
