import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from '../firebase.jsx';

const ManageServices = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientId, setClientId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [serviceName, setServiceName] = useState('');
  const [serviceValue, setServiceValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [services, setServices] = useState([]);
  const [expandedService, setExpandedService] = useState(null);

  // Fetch clients, equipments, and open services
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
      setFilteredEquipments(equipmentsData);
    };

    const fetchServices = async () => {
      const querySnapshot = await getDocs(collection(db, "servicos"));
      const servicesData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(service => service.status === "Aberto")
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setServices(servicesData);
    };

    fetchClients();
    fetchEquipments();
    fetchServices();
  }, []);

  const handleClientChange = (e) => {
    const selectedClientId = e.target.value;
    setClientId(selectedClientId);
    setEquipmentId('');

    if (selectedClientId) {
      const filtered = equipments.filter(equipment => equipment.clientId === selectedClientId);
      setFilteredEquipments(filtered);
    } else {
      setFilteredEquipments(equipments);
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
      const newService = {
        date,
        clientId,
        equipmentId,
        serviceName,
        serviceValue: serviceValue.replace(',', '.'),
        status: "Aberto"
      };
      
      const docRef = await addDoc(collection(db, "servicos"), newService);
      
      // Append the new service with its generated ID to the current services list
      setServices(prevServices => [
        { id: docRef.id, ...newService }, 
        ...prevServices
      ]);
  
      resetForm();
    } catch (e) {
      console.error("Erro ao adicionar serviço: ", e);
    }
  };
  
  

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
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

  const handleCloseService = async (serviceId) => {
    const serviceRef = doc(db, "servicos", serviceId);
    await updateDoc(serviceRef, { status: "Fechado" });
    setServices(services.filter(service => service.id !== serviceId));
  };

  const toggleDetails = (serviceId) => {
    setExpandedService(prev => (prev === serviceId ? null : serviceId));
  };

  return (
    <div className="w-full lg:w-96 mx-auto p-4 bg-gray-800 rounded-lg">
      <h2 className="text-lg mb-4 text-white">Gerenciar Serviços</h2>
      <form onSubmit={handleAddService} className="mb-6">
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          required
        />
        <select 
          value={clientId} 
          onChange={handleClientChange}
          className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
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
          className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
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
          className="w-full px-4 py-2 mb-4 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition duration-300"
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
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
              required
            />
            <input 
              type="text" 
              value={serviceValue} 
              onChange={handleServiceValueChange}
              placeholder="Valor do Serviço - €" 
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
              required
            />
          </div>
        )}

        <button type="submit" className="w-full px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition duration-300">
          Salvar Serviço
        </button>
      </form>

      <div className="mt-6">
        <h2 className="text-lg mb-4 text-white">Serviços Abertos</h2>
        {services.length > 0 ? (
          services.map(service => {
            const client = clients.find(c => c.id === service.clientId);
            const equipment = equipments.find(e => e.id === service.equipmentId);
            return (
              <div key={service.id} className="bg-gray-700 p-3 mb-2 rounded">
                <h4 className="text-white text-sm">{service.serviceName} - {service.serviceValue} €</h4>
                <p className="text-gray-400 text-xs">Data: {new Date(service.date).toLocaleDateString()}</p>
                <button 
                  onClick={() => handleCloseService(service.id)} 
                  className="mt-2 text-red-500 hover:underline text-xs"
                >
                  Fechar Serviço
                </button>
                <button 
                  onClick={() => toggleDetails(service.id)} 
                  className="mt-2 text-blue-500 hover:underline ml-2 text-xs"
                >
                  Detalhes
                </button>
                {expandedService === service.id && (
                  <div className="mt-2 text-gray-300 text-xs">
                    <p><strong>Cliente:</strong> {client ? client.name : 'N/A'}</p>
                    <p><strong>Equipamento:</strong> {equipment ? equipment.name : 'N/A'}</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-white text-sm">Nenhum serviço aberto.</p>
        )}
      </div>
    </div>
  );
};

export default ManageServices;
