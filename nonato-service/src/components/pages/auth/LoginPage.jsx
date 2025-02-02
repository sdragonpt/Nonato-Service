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
import { firebaseApp } from "../../../firebase";
import {
  Mail,
  Lock,
  Loader2,
  AlertTriangle,
  LogIn,
  Eye,
  EyeOff,
  Building2,
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
          navigate("/app");
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
        navigate("/app");
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
        navigate("/app");
      } else {
        // Web login
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(auth, provider);
        navigate("/app");
      }
    } catch (err) {
      console.error("Erro:", err);
      setError(err.message || "Erro ao fazer login com Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-zinc-900 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block"
          >
            <Building2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500"
          >
            Nonato Service
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400 mt-2"
          >
            Sistema de Gestão Empresarial
          </motion.p>
        </div>

        {/* Login Card */}
        <Card className="bg-zinc-800/50 border-zinc-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              Login
            </CardTitle>
            <CardDescription className="text-center text-zinc-400">
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert
                variant="destructive"
                className="mb-6 border-red-500/50 bg-red-500/10"
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
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 bg-zinc-900/50 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                    placeholder="Seu email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 bg-zinc-900/50 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                    placeholder="Sua senha"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-zinc-40"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  variant="outline"
                  className="w-full text-white border-red-600 hover:text-white hover:bg-red-700 bg-red-600"
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <img
                        src="/google.svg"
                        alt="Google"
                        className="w-4 h-4 mr-2"
                      />
                      Entrar com Google
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-zinc-500 text-sm mt-8">
          © {new Date().getFullYear()} Nonato Service. Todos os direitos
          reservados.
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
