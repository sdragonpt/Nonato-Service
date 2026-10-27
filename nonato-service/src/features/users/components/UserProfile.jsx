import { useState, useEffect, useRef } from "react";
import { getAuth, updateProfile, updateEmail } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../../firebase.jsx";
import { compressImage } from "../../../utils/imageCompression.js";
import {
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
import { PageHeader } from "../../../components/app";

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

  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState("");
  const [existingStoragePath, setExistingStoragePath] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const previewUrlRef = useRef(null);

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
        setExistingStoragePath(userData.profilePicStoragePath || "");
      } catch (err) {
        console.error("Erro ao carregar dados do usuário:", err);
        setError("Erro ao carregar dados do usuário");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Liberta o object URL da pré-visualização quando deixa de ser preciso.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

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
      if (file.size > 8 * 1024 * 1024) {
        setError("A imagem deve ter menos de 8MB");
        return;
      }

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const objectUrl = URL.createObjectURL(file);
      previewUrlRef.current = objectUrl;
      setProfilePicPreview(objectUrl);
      setProfilePicFile(file);
      setError(null);
    }
  };

  // ✅ Mesmo princípio do AddClient — comprime e envia para o Storage em vez
  // de gravar um base64 gigante no `photoURL` do Firebase Auth (que tem um
  // limite de tamanho e ficava a rejeitar fotos maiores).
  const uploadProfilePic = async (file) => {
    const compressed = await compressImage(file, { maxDimension: 600, quality: 0.8 });
    const storagePath = `users/${user.uid}/perfil_${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
    const url = await getDownloadURL(storageRef);
    return { url, storagePath };
  };

  const deleteOldProfilePic = async () => {
    if (!existingStoragePath) return;
    try {
      await deleteObject(ref(storage, existingStoragePath));
    } catch {
      // foto antiga pode já não existir no storage
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
      const firestoreUpdate = {
        phoneNumber: formData.phoneNumber,
        company: formData.company,
        role: formData.role,
        lastUpdate: new Date(),
      };

      if (profilePicFile) {
        const uploaded = await uploadProfilePic(profilePicFile);
        await deleteOldProfilePic();
        updateData.photoURL = uploaded.url;
        firestoreUpdate.profilePicStoragePath = uploaded.storagePath;
        setExistingStoragePath(uploaded.storagePath);
        setProfilePicFile(null);
      }

      await updateProfile(user, updateData);

      // Update email if changed
      if (formData.email !== user.email) {
        await updateEmail(user, formData.email);
      }

      // Update additional data in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, firestoreUpdate);

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
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Perfil do Usuário"
        description="Gerencie suas informações pessoais"
        back
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Foto de Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-24 h-24">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profilePicPreview} />
                <AvatarFallback className="bg-muted text-foreground">
                  {formData.displayName?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-8 w-8 text-foreground" />
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu.email@exemplo.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Empresa
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Nome da empresa"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
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
