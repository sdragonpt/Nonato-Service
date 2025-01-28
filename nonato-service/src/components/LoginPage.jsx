import React, { useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { firebaseApp } from "../firebase";
import {
  Mail,
  Lock,
  Loader2,
  AlertTriangle,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "framer-motion";
import ConnectionDiagnostic from "./ConnectionDiagnostic";

// UI Components
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const auth = getAuth(firebaseApp);

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      navigate("/app");
    } catch (err) {
      console.error("Erro de login:", err);
      // ... resto do código de erro ...
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();

    // Configurações adicionais para o provider
    provider.setCustomParameters({
      prompt: "select_account", // Força sempre mostrar seleção de conta
    });

    try {
      setIsGoogleLoading(true);
      setError("");

      // Tenta primeiro com popup
      try {
        await signInWithPopup(auth, provider);
        navigate("/app");
      } catch (popupError) {
        console.log("Popup bloqueado, tentando redirect...");

        // Se falhar com popup, tenta com redirect
        if (
          popupError.code === "auth/popup-blocked" ||
          popupError.code === "auth/popup-closed-by-user"
        ) {
          await signInWithRedirect(auth, provider);
        } else {
          throw popupError; // Re-throw outros erros
        }
      }
    } catch (err) {
      console.error("Erro detalhado no login Google:", err);

      // Tratamento mais específico de erros
      if (err.code === "auth/network-request-failed") {
        setError(
          "Erro de conexão. Verifique se há bloqueadores ativos no navegador."
        );
      } else if (err.code === "auth/cancelled-popup-request") {
        setError(
          "Login cancelado. Tente novamente ou use outro método de login."
        );
      } else if (err.code === "auth/popup-blocked") {
        setError(
          "Popup bloqueado. Desative bloqueadores de popup ou use outro método."
        );
      } else {
        setError("Falha no login com Google. Por favor, tente novamente.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo/Nome */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Nonato Service</h1>
          <p className="text-zinc-400 mt-2">Sistema de Gestão</p>
        </div>

        {/* Card do Login */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConnectionDiagnostic />
            {error && (
              <Alert
                variant="destructive"
                className="mb-6 border-red-500 bg-red-500/10"
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-400">
                  {error}
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
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
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
                    className="pl-10 pr-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                    placeholder="Sua senha"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-white"
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
                  variant="destructive"
                  className="w-full"
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
