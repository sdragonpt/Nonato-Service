import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { firebaseApp } from "../firebase"; // Make sure Firebase is initialized here

const auth = getAuth(firebaseApp);

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const allowedEmail = "sergionunoribeiro@gmail.com"; // Replace with your designated account email

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Check if the email matches the allowed account
    if (email !== allowedEmail) {
      setError("Access denied.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app"); // Redirect to the main page on successful login
    } catch (err) {
      setError("Failed to log in. Check your credentials.");
      console.error("Login error:", err);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-zinc-900">
      <div className="w-full max-w-xs p-8 bg-zinc-800 rounded-lg shadow-xl mx-6">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          Login
        </h2>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-white">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-700 text-white"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-white">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-700 text-white"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
