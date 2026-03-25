import React, { useState, useMemo } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  FileText,
  Lock,
  ArrowRight
} from 'lucide-react';
import { MedicalRecord } from '../services/api';

interface SharedTimelineViewProps {
  records: MedicalRecord[];
  onRecordClick: (record: MedicalRecord) => void;
}

interface GroupedRecords {
  [year: number]: {
    [month: string]: MedicalRecord[];
  };
}

const SharedTimelineView: React.FC<SharedTimelineViewProps> = ({ records, onRecordClick }) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [view, setView] = useState<'YEARS' | 'MONTHS' | 'REPORTS'>('YEARS');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Group records by year and month
  const groupedRecords = useMemo(() => {
    const grouped: GroupedRecords = {};
    
    records.forEach(record => {
      const dateStr = record.visitDate || record.uploadDate || record.createdAt;
      if (!dateStr) return;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const year = date.getFullYear();
      const month = months[date.getMonth()];

      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][month]) {
        grouped[year][month] = [];
      }
      grouped[year][month].push(record);
    });

    return grouped;
  }, [records]);

  const years = Object.keys(groupedRecords).map(Number).sort((a, b) => b - a);

  const handleYearClick = (year: number) => {
    setSelectedYear(year);
    setView('MONTHS');
  };

  const handleMonthClick = (month: string) => {
    setSelectedMonth(month);
    setView('REPORTS');
  };

  const goBack = () => {
    if (view === 'REPORTS') {
      setView('MONTHS');
      setSelectedMonth(null);
    } else if (view === 'MONTHS') {
      setView('YEARS');
      setSelectedYear(null);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Navigation Header */}
      {view !== 'YEARS' && (
        <div className="flex items-center space-x-4 mb-8 animate-in fade-in slide-in-from-left-4 duration-300">
          <button 
            onClick={goBack}
            className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-indigo-600 bg-gray-50 shadow-sm border border-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2 text-sm font-black text-gray-400 uppercase tracking-widest">
            <span className={view === 'MONTHS' ? 'text-indigo-600' : ''}>{selectedYear}</span>
            {selectedMonth && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-indigo-600">{selectedMonth}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tier 1: Years View */}
      {view === 'YEARS' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 py-12 animate-in fade-in zoom-in-95 duration-500">
          {years.map(year => (
            <button
              key={year}
              onClick={() => handleYearClick(year)}
              className="group relative flex flex-col items-center"
            >
              <div className="w-32 h-32 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center text-3xl font-black text-gray-900 shadow-sm transition-all duration-300 group-hover:border-indigo-500 group-hover:text-indigo-600 group-hover:scale-105 group-hover:shadow-xl">
                {year}
              </div>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">View Timeline</span>
              </div>
            </button>
          ))}
          {years.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-400 font-bold uppercase tracking-widest">
              No records available to display in timeline.
            </div>
          )}
        </div>
      )}

      {/* Tier 2: Months View */}
      {view === 'MONTHS' && selectedYear && (
        <div className="relative py-24 animate-in fade-in slide-in-from-right-4 duration-500 overflow-x-auto no-scrollbar">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-100 to-transparent -translate-y-1/2" />
          <div className="relative flex justify-between items-center px-8 gap-12 min-h-[160px] w-max mx-auto">
            {months.map((month) => {
              const hasRecords = groupedRecords[selectedYear][month]?.length > 0;
              const count = groupedRecords[selectedYear][month]?.length || 0;
              
              if (!hasRecords) return null;

              return (
                <div key={month} className="relative flex flex-col items-center">
                  <div className="absolute -top-12 whitespace-nowrap">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-900">
                      {month}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMonthClick(month)}
                    className="relative z-10 w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-lg font-black text-indigo-600 transition-all duration-300 hover:scale-110 hover:shadow-2xl ring-2 ring-indigo-50"
                  >
                    {count}
                  </button>
                  <div className="absolute -bottom-12 whitespace-nowrap text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      {count === 1 ? 'Report' : 'Reports'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tier 3: Reports View */}
      {view === 'REPORTS' && selectedYear && selectedMonth && (
        <div className="relative mt-16 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Central Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-200 via-indigo-100 to-transparent md:-translate-x-1/2" />
          
          <div className="space-y-12">
            {groupedRecords[selectedYear][selectedMonth].sort((a, b) => {
              const dateA = new Date(a.visitDate || a.createdAt);
              const dateB = new Date(b.visitDate || b.createdAt);
              return dateB.getTime() - dateA.getTime();
            }).map((record, idx) => {
              const recordDate = new Date(record.visitDate || record.createdAt);
              return (
                <div key={record._id || record.id} className="relative flex items-center justify-center md:justify-between w-full">
                  {/* Date marker for desktop */}
                  <div className={`hidden md:flex w-[45%] items-center ${idx % 2 === 0 ? 'justify-end pr-8' : 'justify-start pl-8 order-last'}`}>
                    <div className={idx % 2 === 0 ? 'text-right' : 'text-left'}>
                      <p className="text-4xl font-black text-gray-100 uppercase leading-none">
                        {recordDate.toLocaleDateString('en-GB', { day: '2-digit' })}
                      </p>
                      <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mt-1">
                        {recordDate.toLocaleDateString('en-GB', { month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* Dot */}
                  <div className={`absolute left-4 md:left-1/2 z-10 w-6 h-6 rounded-full border-4 border-white shadow-lg -translate-x-1/2 transition-colors ${record.isRestricted ? 'bg-gray-300' : 'bg-indigo-600'}`} />

                  {/* Card Container */}
                  <div className={`w-full md:w-[45%] ml-12 md:ml-0 ${idx % 2 === 0 ? 'md:order-last' : 'md:order-first'}`}>
                    <div 
                      className={`group p-6 rounded-3xl shadow-sm border transition-all duration-300 transform active:scale-95 bg-white ${record.isRestricted ? 'opacity-70 border-gray-100' : 'cursor-pointer border-gray-100 hover:border-indigo-500 hover:shadow-2xl'}`}
                      onClick={() => !record.isRestricted && onRecordClick(record)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge color={record.isRestricted ? 'gray' : 'blue'} className="px-3 py-1 font-black italic text-[10px]">
                          {recordDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Badge>
                        {!record.isRestricted ? (
                          <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                          </div>
                        ) : (
                          <Lock className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                      <h4 className="text-base font-black text-gray-900 uppercase tracking-tight line-clamp-1 flex items-center gap-2">
                        {record.isRestricted && <span className="text-[8px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Private</span>}
                        {(record.category || 'custom').replace(/_/g, ' ')}
                      </h4>
                      <div className="flex items-center mt-3 text-xs text-gray-400 font-medium space-x-4">
                        <div className="flex items-center space-x-1 min-w-0">
                          <FileText className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate text-[10px] font-bold uppercase tracking-widest">Dr. {record.doctorName || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedTimelineView;
