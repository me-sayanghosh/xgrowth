import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Send } from 'lucide-react';

interface CalendarSlot {
  time: string;
  item?: {
    id: string;
    text: string;
    status: string;
    format: string;
  };
}

export function EditorialCalendarView() {
  const [slots] = useState<CalendarSlot[]>([
    {
      time: '09:00 IST (Morning Slot)',
      item: {
        id: '1',
        text: '5 Node.js stream patterns every backend engineer should know 🧵',
        status: 'queued',
        format: 'thread_draft',
      },
    },
    {
      time: '13:00 IST (Afternoon Slot)',
      item: {
        id: '2',
        text: 'Quick tip: React 19 useActionState eliminates boilerplate for forms.',
        status: 'approved',
        format: 'educational_tip',
      },
    },
    {
      time: '19:00 IST (Evening Slot)',
      item: undefined, // empty slot
    },
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editorial Publishing Calendar</h1>
          <p className="text-sm text-slate-400">Scheduled queue windows and target publication slots</p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>Configured Windows: 09:00, 13:00, 19:00 (Asia/Kolkata)</span>
        </div>
      </div>

      <div className="space-y-4">
        {slots.map((slot, index) => (
          <div
            key={index}
            className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-bold text-white">{slot.time}</span>
              </div>

              {slot.item ? (
                <div className="pt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 font-semibold border border-slate-700 mr-2">
                    {slot.item.status.toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-200">{slot.item.text}</span>
                </div>
              ) : (
                <p className="pt-2 text-xs text-slate-500 italic">Slot currently open / unassigned.</p>
              )}
            </div>

            {slot.item && (
              <span className="text-xs font-semibold px-3 py-1 bg-sky-950 text-sky-400 border border-sky-800 rounded-lg flex items-center space-x-1">
                <Send className="w-3 h-3" />
                <span>Buffer Synced</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
