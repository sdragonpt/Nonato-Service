import React, { useState } from "react";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate, useParams } from "react-router-dom";

const AddEquipment = () => {
  const navigate = useNavigate();
  const { clientId } = useParams(); // Obtém o clientId da URL
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [equipmentPic, setEquipmentPic] = useState(null); // Estado para a imagem do equipamento
  const [equipmentPicPreview, setEquipmentPicPreview] = useState(""); // Estado para a prévia da imagem

  const getNextEquipmentId = async () => {
    const counterRef = doc(db, "counters", "equipmentsCounter");
    const counterSnapshot = await getDoc(counterRef);

    if (counterSnapshot.exists()) {
      const currentCounter = counterSnapshot.data().count;
      await setDoc(counterRef, { count: increment(1) }, { merge: true });
      return currentCounter + 1;
    } else {
      await setDoc(counterRef, { count: 1 });
      return 1;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newEquipmentId = await getNextEquipmentId();
      await setDoc(doc(db, "equipamentos", newEquipmentId.toString()), {
        clientId: clientId, // Associando ao clientId da URL
        type,
        brand,
        model,
        serialNumber,
        createdAt: new Date(),
        equipmentPic: equipmentPicPreview, // Salvar a URL da imagem
      });

      // Limpa os campos após adicionar
      setType("");
      setBrand("");
      setModel("");
      setSerialNumber("");
      setEquipmentPic(null);
      setEquipmentPicPreview(""); // Limpa a prévia da imagem

      // Navega de volta para a página anterior após a adição bem-sucedida
      navigate(-1);
    } catch (e) {
      console.error("Erro ao adicionar equipamento: ", e);
    }
  };

  const handleEquipmentPicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEquipmentPicPreview(reader.result); // Definir a URL da imagem para a prévia
      };
      reader.readAsDataURL(file);
      setEquipmentPic(file); // Armazena o arquivo para futuras operações, se necessário
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

      <h2 className="text-2xl text-center text-white font-semibold mb-4">
        Novo Equipamento
      </h2>
      <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg mt-10">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Tipo"
            required
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Marca"
            required
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Modelo"
            required
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="Número de Série"
            required
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="w-full mb-4">
            <label className="flex flex-col items-center px-4 py-6 bg-gray-700 rounded-lg tracking-wide uppercase cursor-pointer hover:bg-blue-500 hover:text-white text-gray-300 transition duration-300">
              <img
                src="/image-regular.svg"
                alt="Foto do Equipamento"
                width="20"
                height="20"
              />
              <span className="text-sm">Selecionar Foto do Equipamento</span>
              <input
                type="file"
                className="hidden"
                onChange={handleEquipmentPicChange}
                accept="image/*"
              />
            </label>
            {equipmentPicPreview && ( // Exibe a imagem selecionada
              <img
                src={equipmentPicPreview}
                alt="Preview da Foto do Equipamento"
                className="mt-2 w-24 h-24 rounded-full"
              />
            )}
          </div>

          <button
            type="submit"
            className="w-full p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            Adicionar Equipamento
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddEquipment;
