import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Role = "dev" | "gestao" | "consultor" | "mecanico" | "cliente" | null;

interface RoleInfo {
  role: Role;
  nome: string;
  login: string;
  colaboradorId?: number;
  primeiroAcesso?: boolean;
}

interface RoleContextValue {
  roleInfo: RoleInfo | null;
  role: Role;
  setRoleInfo: (info: RoleInfo | null) => void;
  logout: () => void;
  isDevMode: boolean;
}

const RoleContext = createContext<RoleContextValue>({
  roleInfo: null,
  role: null,
  setRoleInfo: () => {},
  logout: () => {},
  isDevMode: false,
});

const STORAGE_KEY = "dap_role_session";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [roleInfo, setRoleInfoState] = useState<RoleInfo | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setRoleInfo = useCallback((info: RoleInfo | null) => {
    setRoleInfoState(info);
    if (info) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    setRoleInfo(null);
  }, [setRoleInfo]);

  return (
    <RoleContext.Provider
      value={{
        roleInfo,
        role: roleInfo?.role ?? null,
        setRoleInfo,
        logout,
        isDevMode: roleInfo?.role === "dev",
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
