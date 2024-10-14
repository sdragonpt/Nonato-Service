import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from '../firebase.jsx';

const ManageServices = () => {
  const [date, setDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [serviceName, setServiceName] = useState('');
  const [serviceValue, setServiceValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      const querySnapshot = await getDocs(collection(db, "clientes"));
      const clientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientsData);
    };

    const fetchEquipments = async () => {
      const querySnapshot = await getDocs(collection(db, "equipamentos"));
      const equipmentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEquipments(equipmentsData);
      setFilteredEquipments(equipmentsData); // Inicia com todos os equipamentos
    };

    fetchClients();
    fetchEquipments();
  }, []);

  const handleClientChange = (e) => {
    const selectedClientId = e.target.value;
    setClientId(selectedClientId);
    setEquipmentId('');

    if (selectedClientId) {
      const filtered = equipments.filter(equipment => equipment.clientId === selectedClientId);
      setFilteredEquipments(filtered);
    } else {
      setFilteredEquipments(equipments); // Mostra todos os equipamentos se nenhum cliente estiver selecionado
    }
  };

  const handleEquipmentChange = (e) => {
    const selectedEquipmentId = e.target.value;
    setEquipmentId(selectedEquipmentId);
    
    const selectedEquipment = equipments.find(equipment => equipment.id === selectedEquipmentId);
    if (selectedEquipment) {
      setClientId(selectedEquipment.clientId);
      const filtered = equipments.filter(equipment => equipment.clientId === selectedEquipment.clientId);
      setFilteredEquipments(filtered);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "servicos"), {
        date,
        clientId,
        equipmentId,
        serviceName,
        serviceValue: serviceValue.replace(',', '.'),
        status: "Aberto"
      });
      resetForm();
    } catch (e) {
      console.error("Erro ao adicionar serviço: ", e);
    }
  };

  const resetForm = () => {
    setDate('');
    setClientId('');
    setEquipmentId('');
    setServiceName('');
    setServiceValue('');
    setIsExpanded(false);
    setFilteredEquipments(equipments);
  };

  const handleServiceValueChange = (e) => {
    const value = e.target.value;
    if (/^\d*[,]?\d*$/.test(value) || value === '') {
      setServiceValue(value);
    }
  };

  return (
    <div className="w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Gerenciar Serviços</h2>
      <form onSubmit={handleAddService}>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
          required
        />
        <select 
          value={clientId} 
          onChange={handleClientChange}
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
          required
        >
          <option value="">Selecione um Cliente</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.id} - {client.name}
            </option>
          ))}
        </select>
        <select 
          value={equipmentId} 
          onChange={handleEquipmentChange} 
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
          required
        >
          <option value="">Selecione um Equipamento</option>
          {filteredEquipments.map(equipment => (
            <option key={equipment.id} value={equipment.id}>
              {equipment.id} - {equipment.name}
            </option>
          ))}
        </select>
        <button 
          type="button" 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="w-full px-6 py-3 mb-4 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition duration-300"
        >
          {isExpanded ? "Cancelar" : "Adicionar Serviço"}
        </button>

        {isExpanded && (
          <div>
            <input 
              type="text" 
              value={serviceName} 
              onChange={(e) => setServiceName(e.target.value)} 
              placeholder="Nome do Serviço" 
              className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
              required
            />
            <input 
              type="text" 
              value={serviceValue} 
              onChange={handleServiceValueChange}
              placeholder="Valor do Serviço - €" 
              className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
              required
            />
          </div>
        )}

        <button type="submit" className="w-full px-6 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 transition duration-300">
          Salvar Serviço
        </button>
      </form>
    </div>
  );
};

export default ManageServices;
