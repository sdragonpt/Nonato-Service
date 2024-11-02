import React, { useState } from "react";
import { collection, setDoc, doc, getDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";

const AddClient = () => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [nif, setNif] = useState("");
  const [profilePic, setProfilePic] = useState(null);

  const navigate = useNavigate();

  const getNextClientId = async () => {
    const counterRef = doc(db, "counters", "clientsCounter");
    const counterSnapshot = await getDoc(counterRef);

    if (counterSnapshot.exists()) {
      const currentCounter = counterSnapshot.data().count;
      await setDoc(counterRef, { count: increment(1) }, { merge: true });
      return currentCounter + 1;
    } else {
      await setDoc(counterRef, { count: 1 });
      return 1;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newClientId = await getNextClientId();
      await setDoc(doc(db, "clientes", newClientId.toString()), {
        name,
        address,
        postalCode,
        phone,
        nif,
        profilePic,
      });
      setName("");
      setAddress("");
      setPostalCode("");
      setPhone("");
      setNif("");
      setProfilePic(null);
    } catch (e) {
      console.error("Erro ao adicionar cliente: ", e);
    }
  };

  const handleProfilePicChange = (e) => {
    setProfilePic(e.target.files[0]);
  };

  return (
    <div>
      {/* Botão de Voltar no canto superior direito */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition transform hover:scale-105"
        aria-label="Voltar"
      >
        Voltar
      </button>

      <h2 className="text-2xl text-center text-white mb-4">Novo Cliente</h2>
      <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg mt-10">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do Cliente"
            required
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Endereço"
            required
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="Código Postal"
            required
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Número de Telefone"
            required
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={nif}
            onChange={(e) => setNif(e.target.value)}
            placeholder="NIF"
            required
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Campo de upload de foto de perfil */}
          <div className="w-full mb-4">
            <label className="flex flex-col items-center px-4 py-6 bg-gray-700 rounded-lg tracking-wide uppercase cursor-pointer hover:bg-blue-500 hover:text-white text-gray-300 transition duration-300">
              <img
                src="/image-regular.svg"
                alt="Foto de Perfil"
                width="20"
                height="20"
              />

              {/* Ícone da imagem */}
              <span className="text-sm">Selecionar Foto de Perfil</span>
              <input
                type="file"
                className="hidden"
                onChange={handleProfilePicChange}
              />
            </label>
          </div>

          <button
            type="submit"
            className="w-full p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            Adicionar Cliente
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddClient;
