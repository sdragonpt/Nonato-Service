import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Wrench,
  Users,
  ClipboardCheck,
  Star,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle2,
  Zap,
  Globe,
  LogIn,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.6 }}
    whileHover={{
      scale: 1.05,
      y: -10,
      transition: { duration: 0.2 },
    }}
    className="group"
  >
    <Card className="bg-zinc-800/50 border-zinc-700/50 backdrop-blur-xl hover:border-green-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 relative overflow-hidden">
      {/* Efeito de hover animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-emerald-500/0 group-hover:from-green-500/5 group-hover:to-emerald-500/5 transition-all duration-300" />

      <CardContent className="p-4 sm:p-6 relative z-10">
        <motion.div
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Icon className="h-10 sm:h-12 w-10 sm:w-12 text-green-500 mb-3 sm:mb-4 group-hover:text-emerald-400 transition-colors" />
        </motion.div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3 group-hover:text-green-100">
          {title}
        </h3>
        <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300">
          {description}
        </p>
      </CardContent>
    </Card>
  </motion.div>
);

const StatsCard = ({ value, label, icon: Icon, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.5 }}
    className="text-center"
  >
    <div className="flex items-center justify-center mb-2">
      <Icon className="h-4 sm:h-6 w-4 sm:w-6 text-green-500 mr-1 sm:mr-2" />
      <span className="text-xl sm:text-3xl font-bold text-white">{value}</span>
    </div>
    <p className="text-zinc-400 text-xs sm:text-sm">{label}</p>
  </motion.div>
);

const InitialPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "Gestão de Clientes",
      description:
        "Sistema completo para gerenciar clientes, histórico de serviços e manter todos os dados organizados de forma inteligente.",
    },
    {
      icon: Wrench,
      title: "Controle de Serviços",
      description:
        "Acompanhe todos os serviços e manutenções em tempo real, com relatórios detalhados e controle de status.",
    },
    {
      icon: ClipboardCheck,
      title: "Inspeções e Checklists",
      description:
        "Realize inspeções detalhadas com checklists personalizados e mantenha o controle de qualidade automatizado.",
    },
    {
      icon: TrendingUp,
      title: "Relatórios Avançados",
      description:
        "Análises completas de performance e insights do negócio para tomada de decisões estratégicas.",
    },
    {
      icon: Shield,
      title: "Segurança Total",
      description:
        "Proteção avançada de dados com criptografia, backup automático e controle de acesso granular.",
    },
    {
      icon: Globe,
      title: "Acesso Multiplataforma",
      description:
        "Acesse o sistema de qualquer lugar, em qualquer dispositivo, com sincronização em tempo real.",
    },
  ];

  const stats = [
    { value: "99.9%", label: "Uptime", icon: CheckCircle2 },
    { value: "24/7", label: "Suporte", icon: Clock },
    { value: "500+", label: "Clientes", icon: Users },
    { value: "Fast", label: "Performance", icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 overflow-hidden relative select-none touch-manipulation">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-zinc-900 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

      {/* Efeito de gradiente animado */}
      <motion.div
        animate={{
          background: [
            "radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
      />

      {/* Partículas flutuantes */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-green-500/30 rounded-full"
            initial={{
              x:
                Math.random() *
                (typeof window !== "undefined" ? window.innerWidth : 1200),
              y:
                Math.random() *
                (typeof window !== "undefined" ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, -30, 30, -30],
              x: [null, 15, -15, 15],
              opacity: [0.1, 0.8, 0.1, 0.8],
            }}
            transition={{
              duration: 10 + Math.random() * 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Botão de Login */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20"
      >
        <Button
          onClick={() => navigate("/login")}
          variant="outline"
          size="sm"
          className="bg-zinc-800/80 border-zinc-600 text-white hover:bg-green-600 hover:border-green-500 backdrop-blur-sm text-xs sm:text-sm px-3 sm:px-4 py-2"
        >
          <LogIn className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
          Login
        </Button>
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="inline-block relative mb-6 sm:mb-8"
          >
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur-xl scale-150"
            />
            <Building2 className="h-16 sm:h-20 w-16 sm:w-20 text-green-500 relative z-10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-4"
          >
            <Badge
              variant="outline"
              className="text-green-400 border-green-500/50 bg-green-500/10 px-3 sm:px-4 py-1 text-xs sm:text-sm"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Sistema Completo de Gestão
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-emerald-500 to-green-600">
              Nonato Service
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-lg sm:text-xl text-zinc-300 mb-12 max-w-3xl mx-auto leading-relaxed px-4"
          >
            A solução definitiva para gestão de serviços e manutenção.
            Transforme sua empresa com tecnologia de ponta e automação
            inteligente.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center items-center mb-12 sm:mb-16 px-4"
          >
            <Button
              onClick={() => navigate("/login")}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-2xl shadow-green-500/25 transition-all transform hover:scale-105 w-full sm:w-auto max-w-xs"
            >
              <Zap className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
              Acessar Sistema
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
            </Button>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-2xl mx-auto mb-16 sm:mb-20 px-4"
          >
            {stats.map((stat, index) => (
              <StatsCard key={stat.label} {...stat} delay={0.8 + index * 0.1} />
            ))}
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mb-16 sm:mb-20 px-4"
        >
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Recursos que Fazem a Diferença
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base">
              Descubra as funcionalidades que vão revolucionar a forma como você
              gerencia seus serviços
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                {...feature}
                delay={1 + index * 0.2}
              />
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="text-center border-t border-zinc-800 pt-6 sm:pt-8 px-4"
        >
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 sm:h-6 w-5 sm:w-6 text-green-500" />
              <span className="text-white font-semibold text-sm sm:text-base">
                Nonato Service
              </span>
            </div>
            <p className="text-zinc-500 text-xs sm:text-sm order-3 sm:order-2">
              © {new Date().getFullYear()} Nonato Service. Todos os direitos
              reservados.
            </p>
            <div className="flex gap-1 order-2 sm:order-3">
              <Star className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-500 fill-yellow-500" />
              <Star className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-500 fill-yellow-500" />
              <Star className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-500 fill-yellow-500" />
              <Star className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-500 fill-yellow-500" />
              <Star className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-500 fill-yellow-500" />
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default InitialPage;
