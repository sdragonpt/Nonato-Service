import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import generateServiceOrderPDF from "./generatePDF";
import generateServiceOrderPDFPlus from "./generatePDFPlus";

const OrderDetail = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [workdays, setWorkdays] = useState([]); // For storing workdays

  // Navigate to AddWorkday page
  const handleAddWorkdayClick = () => {
    navigate(`/app/order/${serviceId}/add-workday`, { state: { serviceId } });
  };

  const deleteServiceOrder = async () => {
    const confirmDelete = window.confirm(
      "Tem certeza de que deseja apagar esta ordem de serviço e todos os dias de trabalho associados?"
    );

    if (confirmDelete) {
      try {
        // Delete all associated workdays
        const workdaysCollectionRef = collection(db, "workdays");
        const q = query(
          workdaysCollectionRef,
          where("serviceId", "==", serviceId)
        );
        const workdaysSnapshot = await getDocs(q);
        const deletePromises = workdaysSnapshot.docs.map(
          (doc) => deleteDoc(doc.ref) // Corrigido: usar deleteDoc para excluir cada documento
        );

        await Promise.all(deletePromises);

        // Delete the service order
        const serviceRef = doc(db, "servicos", serviceId);
        await deleteDoc(serviceRef); // Certifique-se de usar deleteDoc aqui também

        {
          if (order.status === "Aberto") {
            navigate("/app/open-services");
          } else {
            navigate("/app/closed-services");
          }
        }
      } catch (error) {
        console.error("Error deleting service order:", error);
      }
    }
  };

  const fetchClient = async () => {
    if (order?.clientId) {
      const clientDoc = doc(db, "clientes", order.clientId);
      const clientData = await getDoc(clientDoc);
      if (clientData.exists()) {
        setClient({ id: clientData.id, ...clientData.data() });
      }
    }
  };

  const fetchEquipment = async () => {
    if (order?.equipmentId) {
      const equipmentDoc = doc(db, "equipamentos", order.equipmentId);
      const equipmentData = await getDoc(equipmentDoc);
      if (equipmentData.exists()) {
        setEquipment({ id: equipmentData.id, ...equipmentData.data() });
      }
    }
  };

  const fetchWorkdays = async () => {
    try {
      const workdaysCollectionRef = collection(db, "workdays");
      const q = query(
        workdaysCollectionRef,
        where("serviceId", "==", serviceId)
      );
      const workdaysSnapshot = await getDocs(q);
      const workdaysList = workdaysSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setWorkdays(workdaysList); // Updates the workdays state
    } catch (error) {
      console.error("Error fetching workdays:", error);
    }
  };

  const handleGeneratePDF = async () => {
    if (order && client && equipment && workdays) {
      // Verifica se o número de workdays é maior que 3
      if (workdays.length > 3) {
        // Chama a função para mais de 3 workdays
        await generateServiceOrderPDFPlus(order, client, equipment, workdays);
      } else {
        // Chama a função para 3 workdays ou menos
        await generateServiceOrderPDF(order, client, equipment, workdays);
      }
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      const orderDoc = doc(db, "servicos", serviceId);
      const orderData = await getDoc(orderDoc);
      if (orderData.exists()) {
        setOrder({ id: orderData.id, ...orderData.data() });
      } else {
        console.log("Service order not found");
      }
    };

    fetchOrder();
  }, [serviceId]);

  const closeServiceOrder = async () => {
    try {
      const serviceRef = doc(db, "servicos", serviceId);
      await updateDoc(serviceRef, {
        status: "Fechado", // Update the status to "Fechado"
      });
      // Optionally, navigate or provide feedback after closing the service
      navigate("/app/open-services");
    } catch (error) {
      console.error("Error closing service order:", error);
    }
  };

  const generatePDF = () => {
    // Functionality to generate the PDF
    console.log("Generating PDF for the service order...");
  };

  useEffect(() => {
    if (order) {
      fetchClient();
      fetchEquipment();
      fetchWorkdays(); // Fetch workdays after the order is loaded
    }
  }, [order]);

  if (!order) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full max-w-3xl mx-auto rounded-lg">
      <h2 className="text-2xl font-medium mb-2 text-white text-center">
        Ordem de Serviço
      </h2>

      <div className="flex justify-center mb-4">
        {order.status === "Aberto" ? (
          <>
            <button
              onClick={closeServiceOrder}
              className="h-10 px-3 bg-purple-600 mt-2 text-white text-lg flex items-center justify-center rounded-lg"
              aria-label="Fechar Ordem de Serviço"
            >
              Fechar Ordem de Serviço
            </button>

            <button
              onClick={deleteServiceOrder}
              className="h-10 px-3 bg-red-600 mt-2 ml-4 text-white text-lg flex items-center justify-center rounded-lg"
              aria-label="Deletar Ordem de Serviço"
            >
              Deletar Ordem de Serviço
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleGeneratePDF}
              className="h-10 px-3 bg-green-600 mt-2 text-white text-lg flex items-center justify-center rounded-lg"
              aria-label="Gerar PDF"
            >
              Gerar PDF
            </button>

            <button
              onClick={deleteServiceOrder}
              className="h-10 px-3 bg-red-600 mt-2 ml-4 text-white text-lg flex items-center justify-center rounded-lg"
              aria-label="Deletar Ordem de Serviço"
            >
              Deletar Ordem de Serviço
            </button>
          </>
        )}
      </div>

      <div className="bg-zinc-800 py-4 px-4 my-6 rounded-lg">
        <p className="text-gray-300 mb-2">
          Data: {new Date(order.date).toLocaleDateString()}
        </p>
        <p className="text-gray-300 mb-2">
          Cliente: {client ? client.name : "N/A"}
        </p>
        <p className="text-gray-300 mb-2">
          Equipamento:{" "}
          {equipment ? `${equipment.brand} - ${equipment.model}` : "N/A"}
        </p>
        <p className="text-gray-300 mb-2">
          Tipo de Serviço: {order.serviceType}
        </p>
      </div>

      <h3 className="text-lg mb-2 text-white">Dias de Trabalho:</h3>
      <div className="space-y-4 mb-32">
        {workdays.length > 0 ? (
          workdays.map((day) => (
            <div
              key={day.id}
              className="p-4 bg-gray-700 rounded-lg text-white cursor-pointer"
              onClick={() =>
                navigate(`/app/edit-workday/${day.id}`, {
                  state: { serviceId },
                })
              }
            >
              <p>
                <strong>Data:</strong>{" "}
                {new Date(day.workDate).toLocaleDateString()}
              </p>
              <p>
                <strong>Pausa:</strong> {day.pause ? "Sim" : "Não"}
              </p>
              {day.pause && (
                <p>
                  <strong>Horas de Pausa:</strong> {day.pauseHours}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500">Nenhum dia de trabalho registrado</p>
        )}
      </div>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center">
        <p className="absolute bottom-24 text-white mb-2 text-center">
          Clique aqui para adicionar novo dia de trabalho:
        </p>

        <button
          className="w-32 h-16 bg-[#1d2d50] mr-4 text-white text-lg flex items-center justify-center rounded-lg"
          onClick={() => navigate(-1)}
          aria-label="Voltar atrás"
        >
          Voltar
        </button>

        <button
          onClick={handleAddWorkdayClick}
          className="h-20 w-20 -mt-8 bg-[#9df767] text-white font-bold text-3xl flex items-center justify-center rounded-full shadow-lg"
          aria-label="Adicionar Trabalho"
        >
          +
        </button>

        <button
          className="w-32 h-16 bg-[#1d2d50] ml-4 text-white text-lg flex items-center justify-center rounded-lg"
          onClick={() => navigate(`/app/edit-service-order/${serviceId}`)} // Fixed to navigate to the service order edit page
          aria-label="Editar Ordem de Serviço"
        >
          Editar
        </button>
      </div>
    </div>
  );
};

export default OrderDetail;
