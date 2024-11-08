import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Importe sua configuração do Firebase
import { collection, addDoc } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom"; // Importa o hook para acessar a localização atual

const AddWorkday = () => {
  const location = useLocation();
  const { serviceId } = location.state || {}; // Obtém o serviceId passado na navegação
  const [workday, setWorkday] = useState({
    workDate: "",
    departureTime: "",
    arrivalTime: "",
    kmDeparture: "",
    kmReturn: "",
    startTime: "",
    endTime: "",
    pause: false,
    pauseHours: "",
    return: false,
    returnDepartureTime: "",
    returnArrivalTime: "",
  });

  const navigate = useNavigate();

  // Função para lidar com mudanças nos campos de entrada
  const handleWorkdayChange = (e) => {
    const { name, value, type, checked } = e.target;
    setWorkday((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Função para adicionar o dia de trabalho ao Firestore
  const handleAddWorkdayToDb = async (e) => {
    e.preventDefault();

    try {
      // Coleção de dias de trabalho no Firestore
      const workdaysCollection = collection(db, "workdays");

      // Adicionando o novo dia de trabalho à coleção
      await addDoc(workdaysCollection, {
        workDate: workday.workDate,
        departureTime: workday.departureTime,
        arrivalTime: workday.arrivalTime,
        kmDeparture: workday.kmDeparture,
        kmReturn: workday.kmReturn,
        startTime: workday.startTime,
        endTime: workday.endTime,
        pause: workday.pause,
        pauseHours: workday.pauseHours,
        return: workday.return,
        returnDepartureTime: workday.returnDepartureTime,
        returnArrivalTime: workday.returnArrivalTime,
        serviceId: serviceId, // Aqui, associamos o serviceId
      });

      console.log("Dia de Trabalho adicionado com sucesso!");

      // Resetar o formulário após a adição
      setWorkday({
        workDate: "",
        departureTime: "",
        arrivalTime: "",
        kmDeparture: "",
        kmReturn: "",
        startTime: "",
        endTime: "",
        pause: false,
        pauseHours: "",
        return: false,
        returnDepartureTime: "",
        returnArrivalTime: "",
      });
    } catch (error) {
      console.error("Erro ao adicionar dia de trabalho:", error);
    }
  };

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
        Adicionar Dia de Trabalho
      </h2>
      <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg mt-10">
        {/* Campos de Entrada */}
        <div className="mb-4">
          <label className="text-lg text-white">Data</label>
          <input
            type="date"
            name="workDate"
            value={workday.workDate}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>

        <div className="mb-4">
          <label className="text-lg text-white">Horário de Saída</label>
          <input
            type="time"
            name="departureTime"
            value={workday.departureTime}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>

        <div className="mb-4">
          <label className="text-lg text-white">Horário de Chegada</label>
          <input
            type="time"
            name="arrivalTime"
            value={workday.arrivalTime}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>

        <div className="mb-4">
          <label className="text-lg text-white">Km de Saída</label>
          <input
            type="number"
            name="kmDeparture"
            value={workday.kmDeparture}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>

        <div className="mb-4">
          <label className="text-lg text-white">Km de Retorno</label>
          <input
            type="number"
            name="kmReturn"
            value={workday.kmReturn}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>

        <div className="mb-4">
          <label className="text-lg text-white">Horário Inicial</label>
          <input
            type="time"
            name="startTime"
            value={workday.startTime}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>

        <div className="mb-4">
          <label className="text-lg text-white">Horário Final</label>
          <input
            type="time"
            name="endTime"
            value={workday.endTime}
            onChange={handleWorkdayChange}
            className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
          />
        </div>

        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            name="pause"
            checked={workday.pause}
            onChange={handleWorkdayChange}
            className="mr-2"
          />
          <label className="text-lg text-white">Pausa</label>
        </div>

        {workday.pause && (
          <div className="mb-4">
            <label className="text-lg text-white">Horas de Pausa</label>
            <input
              type="number"
              name="pauseHours"
              value={workday.pauseHours}
              onChange={handleWorkdayChange}
              className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
            />
          </div>
        )}

        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            name="return"
            checked={workday.return}
            onChange={handleWorkdayChange}
            className="mr-2"
          />
          <label className="text-lg text-white">Retorno</label>
        </div>

        {workday.return && (
          <div className="mb-4">
            <label className="text-lg text-white">
              Horário de Saída para Retorno
            </label>
            <input
              type="time"
              name="returnDepartureTime"
              value={workday.returnDepartureTime}
              onChange={handleWorkdayChange}
              className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
            />
          </div>
        )}

        {workday.return && (
          <div className="mb-4">
            <label className="text-lg text-white">
              Horário de Chegada do Retorno
            </label>
            <input
              type="time"
              name="returnArrivalTime"
              value={workday.returnArrivalTime}
              onChange={handleWorkdayChange}
              className="w-full p-2 mt-1 rounded bg-gray-700 text-white"
            />
          </div>
        )}

        <button
          onClick={handleAddWorkdayToDb}
          className="mt-4 bg-blue-600 text-white py-2 px-4 rounded w-full hover:bg-blue-700 transition"
        >
          Adicionar Dia de Trabalho
        </button>
      </div>
    </div>
  );
};

export default AddWorkday;
