import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase.jsx";
import {
  Users,
  ClipboardList,
  Wrench,
  FileText,
  CheckSquare,
  Calendar,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DailyActivities = () => {
  const [openOrders, setOpenOrders] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDailyActivities = async () => {
      try {
        setIsLoading(true);
        const today = new Date().toISOString().split("T")[0];

        // Buscar ordens abertas
        const ordersQuery = query(
          collection(db, "ordens"),
          where("status", "!=", "Fechado")
        );
        const ordersSnap = await getDocs(ordersQuery);
        let ordersData = ordersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Buscar agendamentos de hoje
        const appointmentsQuery = query(
          collection(db, "agendamentos"),
          where("data", "==", today)
        );
        const appointmentsSnap = await getDocs(appointmentsQuery);
        let appointmentsData = appointmentsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Buscar os nomes dos clientes
        const clientIds = [
          ...new Set([
            ...appointmentsData.map((app) => app.clientId),
            ...ordersData.map((order) => order.clientId),
          ]),
        ];
        const clientData = {};

        for (const clientId of clientIds) {
          if (clientId) {
            const clientRef = doc(db, "clientes", clientId);
            const clientSnap = await getDoc(clientRef);
            if (clientSnap.exists()) {
              clientData[clientId] = clientSnap.data().name;
            }
          }
        }

        // Atualizar ordens de serviço com os nomes dos clientes
        ordersData = ordersData.map((order) => ({
          ...order,
          clientName: clientData[order.clientId] || "Cliente não encontrado",
        }));

        // Atualizar agendamentos com os nomes dos clientes
        appointmentsData = appointmentsData.map((app) => ({
          ...app,
          clientName: clientData[app.clientId] || "Cliente não encontrado",
        }));

        setOpenOrders(ordersData);
        setTodayAppointments(appointmentsData);
      } catch (error) {
        console.error("Error fetching daily activities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyActivities();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Ordens Abertas */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white text-lg font-semibold">
            Ordens Abertas
          </CardTitle>
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-400 border-blue-500/50"
          >
            {openOrders.length}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {openOrders.length === 0 ? (
            <p className="text-zinc-400 text-sm text-center py-4">
              Nenhuma ordem aberta
            </p>
          ) : (
            openOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/app/order-detail/${order.id}`)}
                className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors"
              >
                <div>
                  <h4 className="text-white font-medium">
                    {order.clientName || "Sem Cliente"}
                  </h4>
                  <p className="text-zinc-400 text-sm">
                    {"Data de abertura: "}
                    {order.date || "Sem data"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    order.priority === "high"
                      ? "bg-red-500/10 text-red-400 border-red-500/50"
                      : "bg-green-500/10 text-green-400 border-green-500/50"
                  }
                >
                  {order.priority === "high" ? "Urgente" : "Normal"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Agendamentos do Dia */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white text-lg font-semibold">
            Agendamentos de Hoje
          </CardTitle>
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-400 border-green-500/50"
          >
            {todayAppointments.length}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayAppointments.length === 0 ? (
            <p className="text-zinc-400 text-sm text-center py-4">
              Nenhum agendamento para hoje
            </p>
          ) : (
            todayAppointments
              .sort((a, b) => a.hora.localeCompare(b.hora))
              .map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() =>
                    navigate(`/app/edit-agendamento/${appointment.id}`)
                  }
                  className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors"
                >
                  <div>
                    <h4 className="text-white font-medium">
                      {appointment.clientName}
                    </h4>
                    <p className="text-zinc-400 text-sm">
                      {"Hora marcada: "}
                      {appointment.hora}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      appointment.status === "confirmado"
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/50"
                        : appointment.status === "cancelado"
                        ? "bg-red-500/10 text-red-400 border-red-500/50"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/50"
                    }
                  >
                    {appointment.status}
                  </Badge>
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyActivities;
