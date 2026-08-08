import { useState, useEffect } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  getRedirectResult,
  signInWithCredential,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { firebaseApp } from "../../firebase";
import {
  Mail,
  Lock,
  Loader2,
  AlertTriangle,
  LogIn,
  Eye,
  EyeOff,
  Building2,
  Home,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { Capacitor } from "@capacitor/core";

const auth = getAuth(firebaseApp);

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // Login bem sucedido após redirecionamento
          navigate("/app/dashboard");
        }
      } catch (err) {
        console.error("Erro após redirecionamento:", err);
        setError("Erro ao fazer login com Google. Por favor, tente novamente.");
      } finally {
        setIsGoogleLoading(false);
      }
    };

    handleRedirectResult();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError("");

      // Tentar login normal primeiro
      try {
        await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        navigate("/app/dashboard");
        return;
      } catch (emailError) {
        // Se falhar, verificar se é uma conta Google
        const methods = await fetchSignInMethodsForEmail(auth, formData.email);

        if (methods.includes("google.com")) {
          setError(
            "Esta conta foi criada com Google. Por favor, use o botão 'Entrar com Google'."
          );
        } else {
          setError("Email ou senha incorretos.");
        }
      }
    } catch (err) {
      console.error("Erro de login:", err);
      setError("Erro ao fazer login. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError("");

      if (Capacitor.isNativePlatform()) {
        const result = await GoogleAuth.signIn();

        if (!result) {
          throw new Error("Login cancelado");
        }

        // Use apenas o idToken
        const credential = GoogleAuthProvider.credential(
          result.authentication.idToken,
          null // não use o accessToken por enquanto
        );

        await signInWithCredential(auth, credential);
        navigate("/app/dashboard");
      } else {
        // Web login
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(auth, provider);
        navigate("/app/dashboard");
      }
    } catch (err) {
      console.error("Erro:", err);
      setError(err.message || "Erro ao fazer login com Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4 relative overflow-hidden select-none touch-manipulation">
      {/* Efeitos de fundo animados */}
      <div className="absolute inset-0 bg-zinc-900 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

      {/* Partículas flutuantes */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-green-500/20 rounded-full"
            initial={{
              x:
                Math.random() *
                (typeof window !== "undefined" ? window.innerWidth : 1200),
              y:
                Math.random() *
                (typeof window !== "undefined" ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, -20, 20, -20],
              x: [null, 10, -10, 10],
              opacity: [0.2, 0.5, 0.2, 0.5],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Botão para página inicial */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-4 left-4 z-10"
      >
        <Button
          onClick={() => navigate("/start")}
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 text-xs sm:text-sm px-2 sm:px-3 py-2"
        >
          <ArrowLeft className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Voltar ao início</span>
          <span className="sm:hidden">Voltar</span>
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo/Branding */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block relative"
          >
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur-xl"
            />
            <Building2 className="h-12 sm:h-16 w-12 sm:w-16 text-green-500 mx-auto mb-4 relative z-10" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl sm:text-4xl font-bold text-white mb-2"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-emerald-500 to-green-600">
              Nonato Service
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 text-zinc-400 text-sm sm:text-base"
          >
            <span>Sistema de Gestão Empresarial</span>
          </motion.div>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-zinc-800/90 border-zinc-700/50 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <CardHeader className="relative z-10">
              <CardTitle className="text-xl sm:text-2xl text-center text-white flex items-center justify-center gap-2">
                <LogIn className="w-5 sm:w-6 h-5 sm:h-6 text-green-500" />
                Entrar no Sistema
              </CardTitle>
              <CardDescription className="text-center text-zinc-400 text-sm sm:text-base">
                Acesse sua conta para gerenciar seus serviços
              </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10">
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6"
                >
                  <Alert
                    variant="destructive"
                    className="border-red-500/50 bg-red-500/10 backdrop-blur-sm"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-400 font-medium">
                      {error}
                      {error.includes("não autorizado") && (
                        <p className="text-sm font-normal mt-1 text-red-300">
                          Apenas usuários autorizados podem acessar o sistema.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Mail className="w-3 sm:w-4 h-3 sm:h-4 text-green-500" />
                    Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-green-500 transition-colors w-4 h-4" />
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 bg-zinc-900/80 border-zinc-600 text-white [&::placeholder]:text-zinc-500 focus:border-green-500 focus:ring-green-500/20 transition-all text-sm sm:text-base"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Lock className="w-3 sm:w-4 h-3 sm:h-4 text-green-500" />
                    Senha
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-green-500 transition-colors w-4 h-4" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10 pr-10 bg-zinc-900/80 border-zinc-600 text-white [&::placeholder]:text-zinc-500 focus:border-green-500 focus:ring-green-500/20 transition-all text-sm sm:text-base"
                      placeholder="••••••••"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-green-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-3 sm:h-4 w-3 sm:w-4" />
                      ) : (
                        <Eye className="h-3 sm:h-4 w-3 sm:w-4" />
                      )}
                    </Button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-4"
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 transition-all transform hover:scale-[1.02] text-sm sm:text-base"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-3 sm:w-4 h-3 sm:h-4 mr-2" />
                        Entrar no Sistema
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-zinc-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-zinc-800 px-2 text-zinc-400">
                        ou continue com
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    variant="outline"
                    className="w-full text-white border-red-600/50 hover:text-white hover:bg-red-600/10 hover:border-red-500 bg-red-600/5 backdrop-blur-sm font-semibold py-3 transition-all transform hover:scale-[1.02] text-sm sm:text-base"
                  >
                    {isGoogleLoading ? (
                      <>
                        <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 mr-2 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <img
                          src="/google.svg"
                          alt="Google"
                          className="w-4 sm:w-5 h-4 sm:h-5 mr-2"
                        />
                        Entrar com Google
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Link para página inicial */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-6 text-center"
              >
                <Button
                  onClick={() => navigate("/start")}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-green-400 hover:bg-green-500/10 text-xs sm:text-sm px-3 py-2"
                >
                  <Home className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">
                    Ir para página inicial do sistema
                  </span>
                  <span className="sm:hidden">Página inicial</span>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center text-zinc-500 text-xs sm:text-sm mt-6 sm:mt-8"
        >
          © {new Date().getFullYear()} Nonato Service. Todos os direitos
          reservados.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
