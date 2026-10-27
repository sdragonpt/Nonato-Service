// LanguageDialog.jsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Languages, Loader2 } from "lucide-react";

const LanguageDialog = ({
  open,
  onOpenChange,
  onSelectLanguage,
  isGeneratingPDF,
}) => {
  const [selectedLang, setSelectedLang] = React.useState(null);

  const languages = [
    { code: "pt", name: "Português", flag: "🇧🇷" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
  ];

  const handleSelectLanguage = (langCode) => {
    setSelectedLang(langCode);
    onSelectLanguage(langCode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-md sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Languages className="w-5 h-5" />
            Selecione o Idioma do PDF
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Escolha o idioma em que o PDF será gerado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4">
          {languages.map((lang) => (
            <Button
              key={lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              disabled={isGeneratingPDF}
              className={`flex items-center justify-between p-4 h-auto min-h-[3rem] ${
                isGeneratingPDF && selectedLang === lang.code
                  ? "bg-primary hover:bg-primary"
                  : "bg-muted hover:bg-accent"
              } text-white`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <span className="text-base">{lang.name}</span>
              </div>
              {isGeneratingPDF && selectedLang === lang.code && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LanguageDialog;
