import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";

const OpenServices = () => {
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      const querySnapshot = await getDocs(collection(db, "servicos"));
      const servicesData = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((service) => service.status === "Aberto")
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setServices(servicesData);
    };

    const fetchClients = async () => {
      const querySnapshot = await getDocs(collection(db, "clientes"));
      const clientsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClients(clientsData);
    };

    const fetchEquipments = async () => {
      const querySnapshot = await getDocs(collection(db, "equipamentos"));
      const equipmentsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEquipments(equipmentsData);
    };

    fetchServices();
    fetchClients();
    fetchEquipments();
  }, []);

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition transform hover:scale-105"
        aria-label="Voltar"
      >
        Voltar
      </button>

      <h2 className="text-2xl text-center text-white mb-4">
        Ordens de Serviço Abertas
      </h2>

      <div className="w-full xl:w-96 mx-auto py-6 rounded-lg">
        {services.length > 0 ? (
          services.map((service) => {
            const client = clients.find((c) => c.id === service.clientId);
            const equipment = equipments.find(
              (e) => e.id === service.equipmentId
            );
            return (
              <div
                key={service.id}
                className="bg-gray-700 p-4 mb-2 rounded cursor-pointer"
                onClick={() => navigate(`/app/order-detail/${service.id}`)}
              >
                <div className="text-white">
                  <h4 className="font-semibold">
                    {client ? client.name : "N/A"}
                  </h4>
                  <p className="text-gray-400">{service.serviceName}</p>
                  <p className="text-gray-400">
                    {new Date(service.date).toLocaleDateString()}
                  </p>
                  <p className="text-gray-400 mt-2">
                    <strong>Marca:</strong>{" "}
                    {equipment ? equipment.brand : "N/A"} |{" "}
                    <strong>Modelo:</strong>{" "}
                    {equipment ? equipment.model : "N/A"}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-white">Nenhum serviço aberto.</p>
        )}
      </div>
    </div>
  );
};

export default OpenServices;
