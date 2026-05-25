import { createContext, useContext, useEffect, useState } from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  async function login(customerId, password) {
    const data = await apiLogin(customerId, password);
    setUser(data);
    return data;
  }

  async function logout() {
    await apiLogout().catch(() => {});
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
