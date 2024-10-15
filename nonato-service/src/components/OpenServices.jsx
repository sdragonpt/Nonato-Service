import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from '../firebase.jsx';

const OpenServices = () => {
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [expandedService, setExpandedService] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      const querySnapshot = await getDocs(collection(db, "servicos"));
      const servicesData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(service => service.status === "Aberto")
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordena pela data

      setServices(servicesData);
    };

    const fetchClients = async () => {
      const querySnapshot = await getDocs(collection(db, "clientes"));
      const clientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientsData);
    };

    const fetchEquipments = async () => {
      const querySnapshot = await getDocs(collection(db, "equipamentos"));
      const equipmentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEquipments(equipmentsData);
    };

    fetchServices();
    fetchClients();
    fetchEquipments();
  }, []);

  const handleCloseService = async (serviceId) => {
    const serviceRef = doc(db, "servicos", serviceId);
    await updateDoc(serviceRef, { status: "Fechado" });
    setServices(services.filter(service => service.id !== serviceId));
  };

  const toggleDetails = (serviceId) => {
    setExpandedService(prev => (prev === serviceId ? null : serviceId));
  };

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Serviços Abertos</h2>
      {services.length > 0 ? (
        services.map(service => {
          const client = clients.find(c => c.id === service.clientId);
          const equipment = equipments.find(e => e.id === service.equipmentId);
          return (
            <div key={service.id} className="bg-gray-700 p-4 mb-2 rounded">
              <h4 className="text-white">{service.serviceName} - {service.serviceValue} €</h4>
              <p className="text-gray-400">Data: {new Date(service.date).toLocaleDateString()}</p>
              <button 
                onClick={() => handleCloseService(service.id)} 
                className="mt-2 text-red-500 hover:underline"
              >
                Fechar Serviço
              </button>
              <button 
                onClick={() => toggleDetails(service.id)} 
                className="mt-2 text-blue-500 hover:underline ml-2"
              >
                Detalhes
              </button>
              {expandedService === service.id && (
                <div className="mt-2 text-gray-300">
                  <p><strong>Cliente:</strong> {client ? client.name : 'N/A'}</p>
                  <p><strong>Equipamento:</strong> {equipment ? equipment.name : 'N/A'}</p>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <p className="text-white">Nenhum serviço aberto.</p>
      )}
    </div>
  );
};

export default OpenServices;
