import React, { useState } from 'react';
import { collection, setDoc, doc, getDoc, increment } from "firebase/firestore";
import { db } from '../firebase.jsx'; // Importe o Firestore que configuramos

const AddClient = () => {
  const [name, setName] = useState('');

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
        name: name
      });
      setName(''); // Limpa o campo após salvar
    } catch (e) {
      console.error("Erro ao adicionar cliente: ", e);
    }
  };

  return (
    <div className="w-full lg:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Nome do Cliente" 
          required
          className="w-full p-2 mb-4 text-gray-900 bg-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
