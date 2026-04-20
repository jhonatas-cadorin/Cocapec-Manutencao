import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ticket } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket)));
    });
    return () => unsubscribe();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getTicketsForDay = (day: Date) => {
    return tickets.filter(ticket => isSameDay(new Date(ticket.createdAt), day));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Calendário</h1>
          <p className="text-gray-500 mt-1">Acompanhamento de prazos e manutenções preventivas.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold min-w-[120px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="py-4 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayTickets = getTicketsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div 
                key={idx} 
                className={`min-h-[120px] p-2 border-r border-b border-gray-100 flex flex-col gap-1 transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50/30' : ''
                }`}
              >
                <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  {format(day, 'd')}
                </div>
                
                <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                  {dayTickets.map(ticket => (
                    <div 
                      key={ticket.id}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold truncate ${
                        ticket.type === 'preventive' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-orange-50 text-orange-700 border border-orange-100'
                      }`}
                    >
                      {ticket.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 p-6 bg-white rounded-3xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-200"></div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Manutenção Corretiva</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Manutenção Preventiva</span>
        </div>
      </div>
    </div>
  );
}
