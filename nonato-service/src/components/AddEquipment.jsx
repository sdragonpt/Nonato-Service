import React, { useState, useEffect } from 'react';
import { collection, getDocs, setDoc, doc, getDoc, increment } from "firebase/firestore";
import { db } from '../firebase.jsx';

const AddEquipment = () => {
  const [clientId, setClientId] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "clientes"));
        const clientsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClients(clientsData);
      } catch (e) {
        console.error("Erro ao buscar clientes: ", e);
      }
    };

    fetchClients();
  }, []);

  const getNextEquipmentId = async () => {
    const counterRef = doc(db, "counters", "equipmentsCounter");
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
      const newEquipmentId = await getNextEquipmentId(); // Gera um ID sequencial
      await setDoc(doc(db, "equipamentos", newEquipmentId.toString()), {
        name: equipmentName,
        clientId: clientId,
        type: type,
        brand: brand,
        model: model,
        serialNumber: serialNumber,
        createdAt: new Date(), // Adiciona a data de criação
      });

      // Limpa os campos após adicionar
      setEquipmentName('');
      setClientId('');
      setType('');
      setBrand('');
      setModel('');
      setSerialNumber('');
    } catch (e) {
      console.error("Erro ao adicionar equipamento: ", e);
    }
  };

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={equipmentName}
          onChange={(e) => setEquipmentName(e.target.value)}
          placeholder="Nome do Equipamento"
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <select 
          value={clientId} 
          onChange={(e) => setClientId(e.target.value)} 
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Selecione um Cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.id} - {client.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Tipo"
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Marca"
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Modelo"
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="text"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="Número de Série"
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button 
          type="submit" 
          className="w-full p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-300"
        >
          Adicionar Equipamento
        </button>
      </form>
    </div>
  );
};

export default AddEquipment;
