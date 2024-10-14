import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from '../firebase.jsx';

const ClientDetail = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);

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

    fetchClient();
    fetchServices();
  }, [clientId]);

  if (!client) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">{client.name}</h2>
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

export default ClientDetail;
