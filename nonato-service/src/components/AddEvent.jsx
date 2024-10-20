import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

const AddEvent = () => {
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '' });

  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'agendas'), {
        eventTitle: newEvent.title,
        eventDate: new Date(newEvent.date),
        eventDescription: newEvent.description,
      });
      setNewEvent({ title: '', date: '', description: '' });
    } catch (e) {
      console.error('Error adding event: ', e);
    }
  };

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Adicionar Evento</h2>
      <form onSubmit={handleAddEvent}>
        <input
          type="text"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          placeholder="Título do Evento"
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg"
          required
        />
        <input
          type="date"
          value={newEvent.date}
          onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg"
          required
        />
        <textarea
          value={newEvent.description}
          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
          placeholder="Descrição (opcional)"
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg"
        />
        <button
          type="submit"
          className="w-full p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-300"
        >
          Adicionar Evento
        </button>
      </form>
    </div>
  );
};

export default AddEvent;
