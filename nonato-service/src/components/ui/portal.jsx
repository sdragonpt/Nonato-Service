// src/components/ui/portal.jsx
import React from "react";
import ReactDOM from "react-dom";

export const Portal = ({ children }) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return ReactDOM.createPortal(
    children,
    document.getElementById("portal-root") || document.body
  );
};
