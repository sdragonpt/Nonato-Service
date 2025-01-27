import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Search,
  CheckCircle2,
  Calendar,
  Filter,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const OrderCard = ({ order, client, equipment, isToday, onClick }) => (
  <Card
    onClick={onClick}
    className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
  >
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={client?.profilePic || "/nonato.png"}
              alt={client?.name}
            />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg text-white">
              {client?.name || "Cliente não encontrado"}
            </h3>
            <p className="text-zinc-400 text-sm">{order.orderName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isToday && (
            <Badge
              variant="secondary"
              className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            >
              <Calendar className="w-3 h-3 mr-1" />
              Hoje
            </Badge>
          )}
          <Badge
            variant="secondary"
            className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Fechado
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-zinc-400">
            <span className="font-medium">Marca:</span>{" "}
            {equipment?.brand || "N/A"}
          </p>
          <p className="text-zinc-400">
            <span className="font-medium">Tipo:</span>{" "}
            {order?.serviceType || "N/A"}
          </p>
        </div>
        <div>
          <p className="text-zinc-400">
            <span className="font-medium">Data:</span>{" "}
            {new Date(order.date).toLocaleDateString()}
          </p>
          <p className="text-zinc-400">
            <span className="font-medium">Status:</span> {order.status}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ClosedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState({});
  const [equipments, setEquipments] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOption, setFilterOption] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [ordersSnapshot, clientsSnapshot, equipmentsSnapshot] =
          await Promise.all([
            getDocs(collection(db, "ordens")),
            getDocs(collection(db, "clientes")),
            getDocs(collection(db, "equipamentos")),
          ]);

        const ordersData = ordersSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((order) => order.status === "Fechado")
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        const clientsData = clientsSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = { id: doc.id, ...doc.data() };
          return acc;
        }, {});

        const equipmentsData = equipmentsSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = { id: doc.id, ...doc.data() };
          return acc;
        }, {});

        setOrders(ordersData);
        setClients(clientsData);
        setEquipments(equipmentsData);
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(
          "Erro ao carregar ordens de serviço. Por favor, tente novamente."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getFilteredOrders = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = orders;

    if (filterOption === "today") {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.date);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
    } else if (filterOption === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.date);
        return orderDate >= weekAgo;
      });
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((order) => {
        const client = clients[order.clientId];
        const equipment = equipments[order.equipmentId];
        return (
          client?.name?.toLowerCase().includes(searchLower) ||
          equipment?.brand?.toLowerCase().includes(searchLower) ||
          equipment?.model?.toLowerCase().includes(searchLower) ||
          order.orderName?.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <Button
        variant="secondary"
        size="icon"
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <Card className="mb-8 bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white">
            Ordens de Serviço Fechadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por cliente, equipamento ou serviço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => setFilterOption("all")}
              className={
                filterOption === "all"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "text-zinc-400 hover:text-white"
              }
            >
              <Filter className="w-4 h-4 mr-2" />
              Todas
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFilterOption("today")}
              className={
                filterOption === "today"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "text-zinc-400 hover:text-white"
              }
            >
              <Calendar className="w-4 h-4 mr-2" />
              Hoje
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFilterOption("week")}
              className={
                filterOption === "week"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "text-zinc-400 hover:text-white"
              }
            >
              <Calendar className="w-4 h-4 mr-2" />
              Última Semana
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const client = clients[order.clientId];
            const equipment = equipments[order.equipmentId];
            const isToday =
              new Date(order.date).toDateString() === new Date().toDateString();

            return (
              <OrderCard
                key={order.id}
                order={order}
                client={client}
                equipment={equipment}
                isToday={isToday}
                onClick={() => navigate(`/app/order-detail/${order.id}`)}
              />
            );
          })
        ) : (
          <Card className="py-12 bg-zinc-800 border-zinc-700">
            <CardContent className="text-center">
              <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhuma ordem de serviço encontrada
              </p>
              {searchTerm && (
                <p className="text-zinc-400">
                  Tente ajustar sua busca ou filtros
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClosedOrders;
