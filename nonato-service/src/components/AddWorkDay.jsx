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
    pause: false,
    pauseHours: "",
    returnDepartureTime: "",
    returnArrivalTime: "",
    startHour: "", // Novo campo para hora de início
    endHour: "",
    description: "",
    concluido: "",
    retorno: "",
    funcionarios: "",
    documentacao: "",
    producao: "",
    pecas: "",
    resultDescription: "",
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
        serviceId, // Associando o dia de trabalho com o serviço
        workDate: workday.workDate,
        departureTime: workday.departureTime,
        arrivalTime: workday.arrivalTime,
        kmDeparture: workday.kmDeparture,
        kmReturn: workday.kmReturn,
        pause: workday.pause,
        pauseHours: workday.pauseHours,
        returnDepartureTime: workday.returnDepartureTime,
        returnArrivalTime: workday.returnArrivalTime,
        startHour: workday.startHour, // Novo campo para hora de início
        endHour: workday.endHour,
        description: workday.description,
      });

      console.log("Dia de trabalho adicionado com sucesso!");
      navigate(-1); // Redireciona para o serviço após adicionar o dia de trabalho
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
        <form onSubmit={handleAddWorkdayToDb}>
          <div className="mb-4">
            <h3 className="text-lg text-white">Data</h3>
            <input
              type="date"
              name="workDate"
              value={workday.workDate}
              onChange={handleWorkdayChange}
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
              required
            />
          </div>

          <div className="mb-4">
            <h3 className="text-lg text-white">Ida</h3>
            <input
              type="time"
              name="departureTime"
              value={workday.departureTime}
              onChange={handleWorkdayChange}
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            />
            <input
              type="time"
              name="arrivalTime"
              value={workday.arrivalTime}
              onChange={handleWorkdayChange}
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            />
          </div>

          <div className="mb-4">
            <h3 className="text-lg text-white">KM's</h3>
            <input
              type="number"
              name="kmDeparture"
              value={workday.kmDeparture}
              onChange={handleWorkdayChange}
              placeholder="Ida"
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            />
            <input
              type="number"
              name="kmReturn"
              value={workday.kmReturn}
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
              value={workday.returnDepartureTime}
              onChange={handleWorkdayChange}
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            />
            <input
              type="time"
              name="returnArrivalTime"
              value={workday.returnArrivalTime}
              onChange={handleWorkdayChange}
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            />
          </div>

          <div className="mb-4">
            <h3 className="text-lg text-white">Horas</h3>
            <input
              type="time"
              name="startHour"
              value={workday.startHour}
              onChange={handleWorkdayChange}
              placeholder="Hora de Início"
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            />
            <input
              type="time"
              name="endHour"
              value={workday.endHour}
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
                value={workday.pauseHours}
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
              value={workday.description}
              onChange={handleWorkdayChange}
              placeholder="Descrição do Trabalho"
              rows="4" // Define o número de linhas visíveis
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-green-600 rounded-lg text-white hover:bg-green-700 transition duration-300"
          >
            Adicionar Dia de Trabalho
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddWorkday;
