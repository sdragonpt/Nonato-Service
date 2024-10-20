import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt'; // Import the Portuguese locale
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import 'react-big-calendar/lib/css/react-big-calendar.css'; // Ensure the CSS is imported

// Set moment to use Portuguese
const localizer = momentLocalizer(moment);
moment.locale('pt');

const Agenda = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const querySnapshot = await getDocs(collection(db, 'agendas'));
      const eventData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().eventTitle,
        start: new Date(doc.data().eventDate.seconds * 1000),
        end: new Date(doc.data().eventDate.seconds * 1000),
      }));
      setEvents(eventData);
    };

    fetchEvents();
  }, []);

  return (
    <div className="w-full p-4 md:p-6 bg-gray-800 text-white rounded-lg">
      <h2 className="text-2xl mb-4 text-white">Agenda</h2>
      <div className="overflow-x-auto whitespace-nowrap mb-5">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 500 }}
          className="bg-gray-100 text-black rounded-lg md:p-2 md:overflow-x-auto"
          toolbar={{
            className: "overflow-x-auto",
          }}
          messages={{
            month: "Mês",
            week: "Semana",
            day: "Dia",
            agenda: "Agenda",
            previous: "Anterior",
            next: "Próximo",
            today: "Hoje",
            showMore: (total) => `+ Ver mais (${total})`
          }}
          formats={{
            timeGutterFormat: 'HH:mm',  // 24-hour format for time
            eventTimeRangeFormat: ({ start, end }) =>
              `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
            agendaTimeRangeFormat: ({ start, end }) =>
              `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
          }}
        />
      </div>
    </div>
  );
};

export default Agenda;
