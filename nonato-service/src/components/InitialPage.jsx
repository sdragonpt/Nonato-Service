import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Wrench,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FeatureCard = ({ icon: Icon, title, description }) => (
  <Card className="bg-zinc-800/50 border-zinc-700 backdrop-blur-sm">
    <CardContent className="p-6">
      <Icon className="h-8 w-8 text-green-500 mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm">{description}</p>
    </CardContent>
  </Card>
);

const InitialPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "Gestão de Clientes",
      description:
        "Gerencie seus clientes e mantenha todos os dados organizados.",
    },
    {
      icon: Wrench,
      title: "Controle de Serviços",
      description: "Acompanhe todos os serviços e manutenções em andamento.",
    },
    {
      icon: ClipboardCheck,
      title: "Inspeções e Checklists",
      description:
        "Realize inspeções detalhadas e mantenha o controle de qualidade.",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-900 overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-zinc-900 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

      <div className="relative max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-block"
          >
            <Building2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-4xl sm:text-5xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500"
          >
            Bem-vindo à Nonato Service
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto"
          >
            Sistema completo para gestão de serviços e manutenção
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => navigate("/app")}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 rounded-full text-lg font-semibold"
            >
              Acessar Sistema
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.2 }}
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-16 text-zinc-500 text-sm"
        >
          © {new Date().getFullYear()} Nonato Service. Todos os direitos
          reservados.
        </motion.footer>
      </div>
    </div>
  );
};

export default InitialPage;
