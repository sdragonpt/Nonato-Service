import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from '../firebase.jsx';

const ClientDetail = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [equipments, setEquipments] = useState([]);

  useEffect(() => {
    const fetchClient = async () => {
      const clientDoc = doc(db, "clientes", clientId);
      const clientData = await getDoc(clientDoc);
      if (clientData.exists()) {
        setClient({ id: clientData.id, ...clientData.data() });
      } else {
        console.log("Cliente não encontrado");
      }
    };

    const fetchServices = async () => {
      const servicesSnapshot = await getDocs(collection(db, "servicos"));
      const servicesData = servicesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(service => service.clientId === clientId);
      setServices(servicesData);
    };

    const fetchEquipments = async () => {
      const equipmentsSnapshot = await getDocs(collection(db, "equipamentos"));
      const equipmentsData = equipmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEquipments(equipmentsData);
    };

    fetchClient();
    fetchServices();
    fetchEquipments();
  }, [clientId]);

  if (!client) {
    return <div>Carregando...</div>;
  }

  const getEquipmentName = (equipmentId) => {
    const equipment = equipments.find(e => e.id === equipmentId);
    return equipment ? equipment.name : 'Equipamento não encontrado';
  };

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-2 text-white">{client.name}</h2>
      
      {/* Novos campos adicionados aqui */}
      <p className="text-gray-400 mb-2">Endereço: {client.address}</p>
      <p className="text-gray-400 mb-2">Código Postal: {client.postalCode}</p> {/* Adicionado Código Postal */}
      <p className="text-gray-400 mb-2">Número de Telefone: {client.phone}</p>
      <p className="text-gray-400 mb-4">NIF: {client.nif}</p>

      <h3 className="text-lg mb-2 text-white">Serviços Realizados:</h3>
      <ul>
        {services.map(service => (
          <li key={service.id} className="mb-2">
            <span className="text-yellow-400">{getEquipmentName(service.equipmentId)}</span>
            <br />
            <span className="text-gray-300">{service.serviceName} - {service.date}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClientDetail;
