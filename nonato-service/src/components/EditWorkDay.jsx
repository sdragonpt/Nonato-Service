import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";

const EditWorkday = () => {
  const { workdayId } = useParams();
  const navigate = useNavigate();
  const [workday, setWorkday] = useState(null);

  useEffect(() => {
    const fetchWorkday = async () => {
      try {
        const workdayDoc = await getDoc(doc(db, "workdays", workdayId));
        if (workdayDoc.exists()) {
          setWorkday(workdayDoc.data());
        } else {
          console.log("Workday não encontrado");
        }
      } catch (error) {
        console.error("Erro ao buscar workday:", error);
      }
    };
    fetchWorkday();
  }, [workdayId]);

  const handleWorkdayChange = (e) => {
    const { name, value, type, checked } = e.target;
    setWorkday((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdateWorkday = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "workdays", workdayId), workday);
      console.log("Workday atualizado com sucesso!");
      navigate(-1); // Voltar para a página anterior
    } catch (error) {
      console.error("Erro ao atualizar workday:", error);
    }
  };

  const handleDeleteWorkday = async () => {
    if (
      window.confirm("Tem certeza de que deseja excluir este dia de trabalho?")
    ) {
      try {
        await deleteDoc(doc(db, "workdays", workdayId));
        navigate(-1); // Voltar para a página anterior
      } catch (error) {
        console.error("Erro ao excluir workday:", error);
      }
    }
  };

  if (!workday) return <p>Carregando...</p>;

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
        Editar Dia de Trabalho
      </h2>
      <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg mt-10">
        {/* Campos de Entrada */}
        <div className="mb-4">
          <label className="text-lg text-white">Data</label>
          <input
            type="date"
            name="workDate"
            value={workday.workDate || ""}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>
        <div className="mb-4">
          <h3 className="text-lg text-white">Ida</h3>
          <input
            type="time"
            name="departureTime"
            value={workday.departureTime || ""}
            onChange={handleWorkdayChange}
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
          <input
            type="time"
            name="arrivalTime"
            value={workday.arrivalTime || ""}
            onChange={handleWorkdayChange}
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
        </div>
        <div className="mb-4">
          <h3 className="text-lg text-white">KM's</h3>
          <input
            type="number"
            name="kmDeparture"
            value={workday.kmDeparture || ""}
            onChange={handleWorkdayChange}
            placeholder="Ida"
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
          <input
            type="number"
            name="kmReturn"
            value={workday.kmReturn || ""}
            onChange={handleWorkdayChange}
            placeholder="Retorno"
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
        </div>

        <div className="mb-4">
          <h3 className="text-lg text-white">Retorno</h3>
          <input
            type="time"
            name="returnDepartureTime"
            value={workday.returnDepartureTime || ""}
            onChange={handleWorkdayChange}
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
          <input
            type="time"
            name="returnArrivalTime"
            value={workday.returnArrivalTime || ""}
            onChange={handleWorkdayChange}
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
        </div>

        <div className="mb-4">
          <h3 className="text-lg text-white">Horas</h3>
          <input
            type="time"
            name="startHour"
            value={workday.startHour || ""}
            onChange={handleWorkdayChange}
            placeholder="Hora de Início"
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
          <input
            type="time"
            name="endHour"
            value={workday.endHour || ""}
            onChange={handleWorkdayChange}
            placeholder="Hora de Término"
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
        </div>

        <div className="mb-4">
          <label className="text-white flex items-center space-x-2 mb-2">
            <input
              type="checkbox"
              name="pause"
              checked={workday.pause}
              onChange={handleWorkdayChange}
              className="w-6 h-6 text-violet-600"
            />
            <span>Pausa</span>
          </label>
          {workday.pause && (
            <input
              type="text"
              name="pauseHours"
              value={workday.pauseHours || ""}
              onChange={handleWorkdayChange}
              placeholder="Horas de Pausa"
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            />
          )}
        </div>

        <div className="mb-4">
          <h3 className="text-lg text-white">Descrição</h3>
          <textarea
            type="description"
            name="description"
            value={workday.description || ""}
            onChange={handleWorkdayChange}
            placeholder="Descrição do Trabalho"
            rows="4" // Define o número de linhas visíveis
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
        </div>

        <button
          onClick={handleUpdateWorkday}
          className="mt-4 bg-blue-600 text-white py-2 px-4 rounded w-full hover:bg-blue-700 transition"
        >
          Atualizar Dia de Trabalho
        </button>

        <button
          onClick={handleDeleteWorkday}
          className="mt-4 bg-red-600 text-white py-2 px-4 rounded w-full hover:bg-red-700 transition"
        >
          Excluir Dia de Trabalho
        </button>
      </div>
    </div>
  );
};

export default EditWorkday;
