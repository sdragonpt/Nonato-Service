import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
          <label className="text-lg text-white">Horário de Início</label>
          <input
            type="time"
            name="startTime"
            value={workday.startTime || ""}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>
        <div className="mb-4">
          <label className="text-lg text-white">Horário de Chegada</label>
          <input
            type="time"
            name="arrivalTime"
            value={workday.arrivalTime || ""}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>
        <div className="mb-4">
          <label className="text-lg text-white">Horário de Saída</label>
          <input
            type="time"
            name="departureTime"
            value={workday.departureTime || ""}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>
        <div className="mb-4">
          <label className="text-lg text-white">Kilometragem de Saída</label>
          <input
            type="text"
            name="kmDeparture"
            value={workday.kmDeparture || ""}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>
        <div className="mb-4">
          <label className="text-lg text-white">Kilometragem de Retorno</label>
          <input
            type="text"
            name="kmReturn"
            value={workday.kmReturn || ""}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>
        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            name="pause"
            checked={workday.pause || false}
            onChange={handleWorkdayChange}
            className="mr-2"
          />
          <label className="text-lg text-white">Pausa</label>
        </div>

        {/* Exibir horas de pausa somente se a checkbox estiver marcada */}
        {workday.pause && (
          <div className="mb-4">
            <label className="text-lg text-white">Horas de Pausa</label>
            <input
              type="text"
              name="pauseHours"
              value={workday.pauseHours || ""}
              onChange={handleWorkdayChange}
              className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
            />
          </div>
        )}

        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            name="return"
            checked={workday.return || false}
            onChange={handleWorkdayChange}
            className="mr-2"
          />
          <label className="text-lg text-white">Retorno</label>
        </div>

        {/* Exibir horários de retorno somente se a checkbox estiver marcada */}
        {workday.return && (
          <>
            <div className="mb-4">
              <label className="text-lg text-white">Horário de Retorno</label>
              <input
                type="time"
                name="returnArrivalTime"
                value={workday.returnArrivalTime || ""}
                onChange={handleWorkdayChange}
                className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
              />
            </div>
            <div className="mb-4">
              <label className="text-lg text-white">
                Horário de Retorno (Saída)
              </label>
              <input
                type="time"
                name="returnDepartureTime"
                value={workday.returnDepartureTime || ""}
                onChange={handleWorkdayChange}
                className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
              />
            </div>
          </>
        )}

        <button
          onClick={handleUpdateWorkday}
          className="mt-4 bg-blue-600 text-white py-2 px-4 rounded w-full hover:bg-blue-700 transition"
        >
          Atualizar Dia de Trabalho
        </button>
      </div>
    </div>
  );
};

export default EditWorkday;
