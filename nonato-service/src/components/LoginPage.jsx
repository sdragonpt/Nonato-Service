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
  AlertCircle,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "framer-motion";

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
      setError("Falha no login. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();

    try {
      setIsGoogleLoading(true);
      setError("");
      const result = await signInWithPopup(auth, provider);
      navigate("/app");
    } catch (err) {
      setError("Falha no login com Google.");
      console.error("Erro no login Google:", err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
          <p className="text-gray-400 mt-2">Sistema de Gestão</p>
        </div>

        {/* Card do Login */}
        <div className="bg-zinc-800 rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Login
          </h2>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500 rounded-lg flex items-center text-sm">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <p className="text-red-500">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="Seu email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 bg-zinc-700 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="Sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Entrar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <img
                      src="/google.svg"
                      alt="Google"
                      className="w-5 h-5 mr-2"
                    />
                    Entrar com Google
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          © {new Date().getFullYear()} Nonato Service. Todos os direitos
          reservados.
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
