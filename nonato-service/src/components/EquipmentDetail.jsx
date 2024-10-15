import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from '../firebase.jsx';

const EquipmentDetail = () => {
  const { equipmentId } = useParams();
  const [equipment, setEquipment] = useState(null);
  const [services, setServices] = useState([]);
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    const fetchEquipment = async () => {
      const equipmentDoc = doc(db, "equipamentos", equipmentId);
      const equipmentData = await getDoc(equipmentDoc);
      if (equipmentData.exists()) {
        setEquipment({ id: equipmentData.id, ...equipmentData.data() });
        // Fetch the client name based on clientId from equipment data
        const clientDoc = doc(db, "clientes", equipmentData.data().clientId);
        const clientData = await getDoc(clientDoc);
        if (clientData.exists()) {
          setClientName(clientData.data().name);
        } else {
          console.log("Cliente não encontrado");
        }
      } else {
        console.log("Equipamento não encontrado");
      }
    };

    const fetchServices = async () => {
      const servicesSnapshot = await getDocs(collection(db, "servicos"));
      const servicesData = servicesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(service => service.equipmentId === equipmentId);
      setServices(servicesData);
    };

    fetchEquipment();
    fetchServices();
  }, [equipmentId]);

  if (!equipment) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-2 text-white">{equipment.name}</h2>
      <span className="text-gray-400 mb-2 block">{clientName}</span> {/* Nome do cliente em cor neutra */}
      
      {/* Novos campos adicionados aqui */}
      <p className="text-gray-400 mb-2">Tipo: {equipment.type}</p>
      <p className="text-gray-400 mb-2">Marca: {equipment.brand}</p>
      <p className="text-gray-400 mb-2">Modelo: {equipment.model}</p>
      <p className="text-gray-400 mb-4">Número de Série: {equipment.serialNumber}</p>
      
      <h3 className="text-lg mb-2 text-white">Serviços Realizados:</h3>
      <ul>
        {services.map(service => (
          <li key={service.id} className="mb-2">
            <span>{service.serviceName} - {service.date}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EquipmentDetail;
