import React, { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";

const ConnectionDiagnostic = () => {
  const [hasBlocker, setHasBlocker] = useState(false);

  useEffect(() => {
    const checkForBlockers = async () => {
      try {
        // Tenta fazer uma requisição para o Firebase
        const testUrl =
          "https://www.googleapis.com/identitytoolkit/v3/relyingparty/test";
        const response = await fetch(testUrl);
        setHasBlocker(!response.ok);
      } catch (error) {
        setHasBlocker(true);
      }
    };

    checkForBlockers();
  }, []);

  if (!hasBlocker) return null;

  return (
    <Alert
      variant="destructive"
      className="mb-4 border-yellow-500/50 bg-yellow-500/10"
    >
      <Shield className="h-4 w-4" />
      <AlertDescription className="text-yellow-200">
        Detectamos que seu navegador pode estar bloqueando algumas conexões
        necessárias. Por favor, verifique:
        <ul className="mt-2 ml-4 list-disc">
          <li>Se há extensões de ad-block ativas</li>
          <li>Se há bloqueadores de pop-up ativos</li>
          <li>Se as configurações de privacidade estão muito restritivas</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export default ConnectionDiagnostic;
