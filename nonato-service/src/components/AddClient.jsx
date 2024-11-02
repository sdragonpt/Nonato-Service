import React, { useState } from "react";
import { collection, setDoc, doc, getDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx"; // Importe o Firestore que configuramos

const AddClient = () => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState(""); // Novo estado para Código Postal
  const [phone, setPhone] = useState("");
  const [nif, setNif] = useState("");

  const getNextClientId = async () => {
    const counterRef = doc(db, "counters", "clientsCounter");
    const counterSnapshot = await getDoc(counterRef);

    if (counterSnapshot.exists()) {
      const currentCounter = counterSnapshot.data().count;

      await setDoc(counterRef, { count: increment(1) }, { merge: true });

      return currentCounter + 1; // Retorna o próximo ID numérico
    } else {
      await setDoc(counterRef, { count: 1 });
      return 1;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newClientId = await getNextClientId(); // Gera um ID sequencial
      await setDoc(doc(db, "clientes", newClientId.toString()), {
        name: name,
        address: address,
        postalCode: postalCode, // Adiciona o Código Postal
        phone: phone,
        nif: nif,
      });
      // Limpa os campos após salvar
      setName("");
      setAddress("");
      setPostalCode(""); // Limpa o campo do Código Postal
      setPhone("");
      setNif("");
    } catch (e) {
      console.error("Erro ao adicionar cliente: ", e);
    }
  };

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
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
          value={postalCode} // Novo campo para Código Postal
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
        <button
          type="submit"
          className="w-full p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-300"
        >
          Adicionar Cliente
        </button>
      </form>
    </div>
  );
};

export default AddClient;
