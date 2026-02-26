import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const API_URL = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Load user from localStorage on refresh
  useEffect(() => {
    const storedUser = localStorage.getItem("civicUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // REGISTER
  const register = async (data) => {
    const res = await axios.post(
      `${API_URL}/api/auth/register`,
      data,
      { withCredentials: true }
    );

    setUser(res.data);
    localStorage.setItem("civicUser", JSON.stringify(res.data));
    return res.data;
  };

  // LOGIN
  const login = async (data) => {
    const res = await axios.post(
      `${API_URL}/api/auth/login`,
      data,
      { withCredentials: true }
    );

    setUser(res.data);
    localStorage.setItem("civicUser", JSON.stringify(res.data));
    return res.data;
  };

  // LOGOUT
  const logout = () => {
    setUser(null);
    localStorage.removeItem("civicUser");
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
