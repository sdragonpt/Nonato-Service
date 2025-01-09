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
import generateServiceOrderPDF from "./generatePDF.jsx";
import generateServiceOrderPDFPlus from "./generatePDFPlus.jsx";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Edit2,
  CheckSquare,
  Calendar,
  Clock,
  User,
  Printer,
  Tag,
  PackageOpen,
} from "lucide-react";

const OrderDetail = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [workdays, setWorkdays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar ordem de serviço
      const orderDoc = doc(db, "servicos", serviceId);
      const orderData = await getDoc(orderDoc);

      if (!orderData.exists()) {
        setError("Ordem de serviço não encontrada");
        return;
      }

      const orderInfo = { id: orderData.id, ...orderData.data() };
      setOrder(orderInfo);

      // Buscar dados relacionados em paralelo
      const [clientData, equipmentData, workdaysSnapshot] = await Promise.all([
        getDoc(doc(db, "clientes", orderInfo.clientId)),
        getDoc(doc(db, "equipamentos", orderInfo.equipmentId)),
        getDocs(
          query(collection(db, "workdays"), where("serviceId", "==", serviceId))
        ),
      ]);

      // Processar cliente
      if (clientData.exists()) {
        setClient({ id: clientData.id, ...clientData.data() });
      }

      // Processar equipamento
      if (equipmentData.exists()) {
        setEquipment({ id: equipmentData.id, ...equipmentData.data() });
      }

      // Processar dias de trabalho
      const workdaysList = workdaysSnapshot.docs
        .map((doc) => {
          const workDateData = doc.data().workDate;
          let workDate;

          if (workDateData instanceof Date) {
            workDate = workDateData;
          } else if (typeof workDateData.toDate === "function") {
            workDate = workDateData.toDate();
          } else if (
            typeof workDateData === "string" ||
            typeof workDateData === "number"
          ) {
            workDate = new Date(workDateData);
          } else {
            console.warn("Invalid workDate format:", workDateData);
            workDate = null;
          }

          return {
            id: doc.id,
            ...doc.data(),
            workDate,
          };
        })
        .filter((workday) => workday.workDate !== null)
        .sort((a, b) => b.workDate - a.workDate);

      setWorkdays(workdaysList);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [serviceId]);

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      setError(null);

      const nonNullDescriptions = workdays.filter((day) =>
        day.description?.trim()
      ).length;

      // Escolher versão do PDF baseado nas condições
      if (
        (workdays.length <= 3 && nonNullDescriptions === 2) ||
        (workdays.length <= 6 && nonNullDescriptions === 1) ||
        (workdays.length <= 7 && nonNullDescriptions === 1) ||
        (workdays.length <= 8 && nonNullDescriptions === 0)
      ) {
        await generateServiceOrderPDF(
          serviceId,
          order,
          client,
          equipment,
          workdays
        );
      } else {
        await generateServiceOrderPDFPlus(
          serviceId,
          order,
          client,
          equipment,
          workdays
        );
      }
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      setError("Erro ao gerar PDF. Por favor, tente novamente.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const deleteServiceOrder = async () => {
    if (
      !window.confirm(
        "Tem certeza que deseja apagar esta ordem de serviço e todos os dias de trabalho associados? Esta ação não pode ser desfeita."
      )
    )
      return;

    try {
      setIsDeleting(true);
      setError(null);

      // Deletar dias de trabalho em paralelo
      const deletePromises = workdays.map((workday) =>
        deleteDoc(doc(db, "workdays", workday.id))
      );
      await Promise.all(deletePromises);

      // Deletar ordem de serviço
      await deleteDoc(doc(db, "servicos", serviceId));

      navigate(
        order.status === "Aberto"
          ? "/app/open-services"
          : "/app/closed-services"
      );
    } catch (err) {
      console.error("Erro ao deletar ordem:", err);
      setError("Erro ao deletar ordem. Por favor, tente novamente.");
      setIsDeleting(false);
    }
  };

  const closeServiceOrder = async () => {
    if (!window.confirm("Tem certeza que deseja fechar esta ordem de serviço?"))
      return;

    try {
      setIsClosing(true);
      setError(null);

      await updateDoc(doc(db, "servicos", serviceId), {
        status: "Fechado",
        closedAt: new Date(),
      });

      navigate("/app/open-services");
    } catch (err) {
      console.error("Erro ao fechar ordem:", err);
      setError("Erro ao fechar ordem. Por favor, tente novamente.");
      setIsClosing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 flex items-start max-w-md w-full">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-500">{error}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Voltar"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Ordem de Serviço #{serviceId}
      </h2>

      {/* Ações principais */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {order.status === "Aberto" ? (
          <>
            <button
              onClick={closeServiceOrder}
              disabled={isClosing}
              className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isClosing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckSquare className="w-4 h-4 mr-2" />
              )}
              Fechar Ordem
            </button>
          </>
        ) : (
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Gerar PDF
          </button>
          // <button className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50">
          //   <PDFDownloadLink
          //     document={
          //       <ServiceOrderPDF
          //         serviceId={order.id}
          //         order={order}
          //         client={client}
          //         equipment={equipment}
          //         workdays={workdays}
          //       />
          //     }
          //     fileName={`ordem_servico_${order.id}.pdf`}
          //   >
          //     {({ blob, url, loading, error }) => (
          //       <button
          //         className="flex items-center"
          //         disabled={loading}
          //       >
          //         {loading ? (
          //           <>
          //             <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          //             Gerando PDF...
          //           </>
          //         ) : (
          //           <>
          //             <FileText className="w-4 h-4 mr-2" />
          //             Download PDF
          //           </>
          //         )}
          //       </button>
          //     )}
          //   </PDFDownloadLink>
          // </button>
        )}

        <button
          onClick={deleteServiceOrder}
          disabled={isDeleting}
          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          Deletar
        </button>
      </div>

      {/* Detalhes da ordem */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4 mb-6">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-gray-400 mr-3" />
          <div>
            <p className="text-sm text-gray-400">Data</p>
            <p className="text-white">
              {new Date(order.date).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <User className="w-5 h-5 text-gray-400 mr-3" />
          <div>
            <p className="text-sm text-gray-400">Cliente</p>
            <p className="text-white">{client?.name || "N/A"}</p>
          </div>
        </div>

        <div className="flex items-center">
          <Printer className="w-5 h-5 text-gray-400 mr-3" />
          <div>
            <p className="text-sm text-gray-400">Equipamento</p>
            <p className="text-white">
              {equipment ? `${equipment.brand} - ${equipment.model}` : "N/A"}
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <Tag className="w-5 h-5 text-gray-400 mr-3" />
          <div>
            <p className="text-sm text-gray-400">Tipo de Serviço</p>
            <p className="text-white">{order.serviceType}</p>
          </div>
        </div>
      </div>

      {/* Dias de trabalho */}
      <div className="mb-32">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Dias de Trabalho:</h3>
          <span className="text-sm text-gray-400">
            {workdays.length} registro(s)
          </span>
        </div>

        <div className="space-y-4">
          {workdays.length > 0 ? (
            workdays.map((day) => (
              <div
                key={day.id}
                onClick={() =>
                  navigate(`/app/edit-workday/${day.id}`, {
                    state: { serviceId },
                  })
                }
                className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-white font-medium">
                        {day.workDate.toLocaleDateString()}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {day.pause
                          ? `${day.pauseHours}h de pausa`
                          : "Sem pausa"}
                      </p>
                    </div>
                  </div>
                  <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-gray-800 rounded-lg">
              <PackageOpen className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">Nenhum dia de trabalho registrado</p>
              <p className="text-sm text-gray-500">
                Clique no botão abaixo para adicionar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Botões de ação fixos */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center gap-4 md:left-64">
        <p className="absolute bottom-24 text-white mb-2 text-center">
          Clique + para adicionar novo dia de trabalho
        </p>

        <button
          className="h-16 px-6 bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center rounded-full transition-colors"
          onClick={() => navigate("/app/manage-services")}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </button>

        <button
          onClick={() => navigate(`/app/order/${serviceId}/add-workday`)}
          className="h-20 w-20 -mt-8 bg-[#117d49] hover:bg-[#0d6238] text-white flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-105"
          aria-label="Adicionar dia de trabalho"
        >
          <Plus className="w-8 h-8" />
        </button>

        <button
          className="h-16 px-6 bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center rounded-full transition-colors"
          onClick={() => navigate(`/app/edit-service-order/${serviceId}`)}
        >
          <Edit2 className="w-5 h-5 mr-2" />
          Editar
        </button>
      </div>
    </div>
  );
};

export default OrderDetail;
