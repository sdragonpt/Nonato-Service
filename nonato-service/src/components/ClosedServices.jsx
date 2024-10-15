import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase.jsx';
import jsPDF from 'jspdf';

const ClosedServices = () => {
  const [closedServices, setClosedServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [expandedService, setExpandedService] = useState(null);

  useEffect(() => {
    const fetchClosedServices = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "servicos"));
        const servicesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const filteredClosedServices = servicesData
          .filter(service => service.status === "Fechado")
          .sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordena pela data

        setClosedServices(filteredClosedServices);
      } catch (e) {
        console.error("Erro ao buscar serviços fechados: ", e);
      }
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

    fetchClosedServices();
    fetchClients();
    fetchEquipments();
  }, []);

  const handleGeneratePDF = (service) => {
    const doc = new jsPDF();
    doc.text("Serviço Detalhado", 10, 10);
    doc.text(`Nome: ${service.serviceName}`, 10, 20);
    doc.text(`Valor: ${service.serviceValue} €`, 10, 30);
    doc.text(`Data: ${new Date(service.date).toLocaleDateString()}`, 10, 40); // Adiciona a data ao PDF
    doc.save(`${service.serviceName}.pdf`);
  };

  const toggleDetails = (serviceId) => {
    setExpandedService(prev => (prev === serviceId ? null : serviceId));
  };

  return (
    <div className="w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Serviços Fechados</h2>
      {closedServices.map(service => {
        const client = clients.find(c => c.id === service.clientId);
        const equipment = equipments.find(e => e.id === service.equipmentId);
        return (
          <div key={service.id} className="bg-gray-700 p-4 mb-2 rounded text-white">
            <h4>{service.serviceName} - {service.serviceValue} €</h4>
            <p className="text-gray-400">Data: {new Date(service.date).toLocaleDateString()}</p>
            <button 
              onClick={() => handleGeneratePDF(service)} 
              className="text-blue-500 hover:underline mr-2"
            >
              Gerar PDF
            </button>
            <button 
              onClick={() => toggleDetails(service.id)} 
              className="text-blue-500 hover:underline mr-2"
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
      })}
    </div>
  );
};

export default ClosedServices;
