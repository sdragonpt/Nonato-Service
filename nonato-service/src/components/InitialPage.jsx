import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";

const InitialPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-900 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{
          scale: isLoaded ? 1 : 1.1,
          opacity: isLoaded ? 0.6 : 1,
        }}
        transition={{ duration: 1.5 }}
        style={{
          backgroundImage: "url('/background3.png')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "40%",
          maxWidth: "100%",
          margin: "0 auto",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {!isLoaded ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-white flex flex-col items-center"
          >
            <Loader2 className="w-12 h-12 mb-4 animate-spin" />
            <p className="text-lg font-medium">Carregando...</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl font-bold text-white mb-8 text-center"
            >
              Bem-vindo à Nonato Service
            </motion.h1>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-[#9df767] hover:bg-[#8be656] text-zinc-900 font-bold rounded-full shadow-lg flex items-center text-lg transition-colors"
              onClick={() => navigate("/app")}
            >
              Iniciar
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.button>
          </motion.div>
        )}
      </div>

      <motion.div
        className="absolute bottom-8 text-gray-400 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm">
          © 2025 Nonato Service. Todos os direitos reservados.
        </p>
      </motion.div>
    </div>
  );
};

export default InitialPage;
