import { useState, useEffect } from "react";
import { getAuth, updateProfile, updateEmail } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Building2,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import { useNavigate } from "react-router-dom";

const UserProfile = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phoneNumber: "",
    company: "",
    role: "",
  });

  const [, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!user) {
          setError("Usuário não encontrado");
          return;
        }

        // Fetch additional user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data() || {};

        setFormData({
          displayName: user.displayName || "",
          email: user.email || "",
          phoneNumber: userData.phoneNumber || "",
          company: userData.company || "",
          role: userData.role || "",
        });

        setProfilePicPreview(user.photoURL || "");
      } catch (err) {
        console.error("Erro ao carregar dados do usuário:", err);
        setError("Erro ao carregar dados do usuário");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("A imagem deve ter menos de 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setProfilePic(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      // Update Authentication Profile
      const updateData = {
        displayName: formData.displayName,
      };

      if (profilePicPreview !== user.photoURL) {
        updateData.photoURL = profilePicPreview;
      }

      await updateProfile(user, updateData);

      // Update email if changed
      if (formData.email !== user.email) {
        await updateEmail(user, formData.email);
      }

      // Update additional data in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        phoneNumber: formData.phoneNumber,
        company: formData.company,
        role: formData.role,
        lastUpdate: new Date(),
      });

      // Show success message or redirect
      navigate("/app/manage-clients"); // or wherever you want to redirect after success
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      setError("Erro ao atualizar perfil. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Perfil do Usuário</h1>
          <p className="text-sm text-zinc-400">
            Gerencie suas informações pessoais
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Foto de Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-24 h-24">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profilePicPreview} />
                <AvatarFallback className="bg-zinc-700 text-white">
                  {formData.displayName?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-8 w-8 text-white" />
                <input
                  type="file"
                  className="hidden"
                  onChange={handlePhotoChange}
                  accept="image/*"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* User Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu.email@exemplo.com"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Empresa
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Nome da empresa"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default UserProfile;
