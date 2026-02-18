import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { BRAZILIAN_REGIONS, BrazilianRegion } from '../../lib/brazilianRegions';
import { getSeasonalTasks, saveSeasonalTask } from '../../lib/libraryService';
import { auth } from '../../lib/firebase';

interface SeasonalCalendarProps {
  onBack: () => void;
  userRegion?: BrazilianRegion;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const baseActivities: Record<string, string[]> = {
  'Janeiro': ['Manutenção do ambiente', 'Monitoramento de peso', 'Banhos frequentes', 'Observação comportamental'],
  'Fevereiro': ['Continuação da manutenção', 'Verificação de parasitas', 'Avaliação da saúde', 'Pesagem regular'],
  'Março': ['Reduzir fotoperíodo', 'Preparar repouso', 'Verificação de saúde', 'Ajuste de temperatura'],
  'Abril': ['Repouso consolidado', 'Redução de atividade', 'Monitoramento contínuo', 'Pesagens regulares'],
  'Maio': ['Repouso completo', 'Preparação psicológica', 'Limpeza profunda', 'Inspeção geral'],
  'Junho': ['Repouso profundo', 'Ambiente estável', 'Sem estímulos externos', 'Observação silenciosa'],
  'Julho': ['PRÉ-MUDA: Suplementação', 'Aumentar luz', 'Temperatura gradual', 'Preparação psicológica'],
  'Agosto': ['MUDA ATIVA: Nutrição MÁXIMA', 'Banhos diários', 'Monitoramento intenso', 'ZERO estresse'],
  'Setembro': ['PÓS-MUDA: Penas reformadas', 'Manter suplementação', 'Preparar reprodução', 'Avaliar muda'],
  'Outubro': ['PICO de atividade', 'Fotoperíodo 13-14h', 'Reprodução (se planejado)', 'Monitorar comportamento'],
  'Novembro': ['Manter estímulos', 'Reprodução em andamento', 'Monitoramento de ninhos', 'Nutrição otimizada'],
  'Dezembro': ['Encerrar ninhadas', 'Desmame de filhotes', 'Limpeza geral', 'Preparar novo ciclo']
};

const baseNutrition: Record<string, string[]> = {
  'Janeiro': ['Alimentação normal', 'Frutas e vegetais', 'Água fresca 2x/dia', 'Sal mineral'],
  'Fevereiro': ['Alimentação normal', 'Mais frutas em dias quentes', 'Água fresca', 'Sementes de girassol'],
  'Março': ['Manutenção normal', 'Reduzir proteína', 'Sementes olorosas', 'Preparar repouso'],
  'Abril': ['Alimentação simples', 'Sementes básicas', 'Sem frutas frequentes', 'Água disponível'],
  'Maio': ['Alimentação simplificada', 'Sementes qualidade', 'Minerais à vontade', 'Água fresca'],
  'Junho': ['Alimentação repouso', 'Sementes básicas', 'Sem suplementação extra', 'Água fresca'],
  'Julho': ['AUMENTAR: Proteína 22-25%', 'Ovos 3x/semana', 'Larvas 2x/semana', 'Vitaminas A,E,D3'],
  'Agosto': ['PROTEÍNA MÁXIMA 25-30%', 'Ovos 5x/semana', 'Larvas DIÁRIAS', 'Sementes oleosas'],
  'Setembro': ['Reduzir proteína gradualmente', 'Normalizar alimentação', 'Frutas regulares', 'Continuar minerais'],
  'Outubro': ['Aumentar proteína', 'Ovos e larvas regularmente', 'Cálcio abundância', 'Vitaminas essenciais'],
  'Novembro': ['Manter proteína', 'Suplementação cálcio', 'Vitaminas para filhotes', 'Sem redução'],
  'Dezembro': ['Redução gradual', 'Normalizar alimentação', 'Preparar novo ciclo', 'Manutenção saúde']
};

const SeasonalCalendar: React.FC<SeasonalCalendarProps> = ({ onBack, userRegion = 'Sudeste' }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const region = BRAZILIAN_REGIONS[userRegion];
  const currentMonthName = monthNames[selectedMonth];
  const monthData = region.seasonalPatterns[currentMonthName];

  useEffect(() => {
    loadSavedTasks();
  }, [selectedMonth, userRegion]);

  const loadSavedTasks = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const tasks = await getSeasonalTasks(user.uid, currentMonthName);
      const completedSet = new Set(
        tasks.filter(t => t.completed).map(t => `${t.month}-${t.taskIndex}`)
      );
      setCompletedTasks(completedSet);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskIndex: number) => {
    const user = auth.currentUser;
    if (!user) {
      alert('Faça login para salvar progresso');
      return;
    }

    setSaving(true);
    try {
      const taskId = `${currentMonthName}-${taskIndex}`;
      const isCompleted = completedTasks.has(taskId);

      await saveSeasonalTask(user.uid, currentMonthName, taskIndex, !isCompleted);

      const newCompleted = new Set(completedTasks);
      if (isCompleted) {
        newCompleted.delete(taskId);
      } else {
        newCompleted.add(taskId);
      }
      setCompletedTasks(newCompleted);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!monthData || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader size={40} className="inline animate-spin text-blue-600 mb-4" />
          <p className="text-slate-600 font-semibold">Carregando dados climáticos...</p>
        </div>
      </div>
    );
  }

  const taskActivities = baseActivities[currentMonthName] || [];
  const taskNutrition = baseNutrition[currentMonthName] || [];
  const progressPercent = taskActivities.length > 0 ? (completedTasks.size / taskActivities.length) * 100 : 0;

  const warnings = [
    monthData.temperature.min < 10 ? '❄️ Risco de hipotermia' : '',
    monthData.temperature.max > 32 ? '🌡️ Calor extremo: hidrate' : '',
    monthData.humidity.min < 40 ? '🏜️ Ar seco: nebulize' : '',
    monthData.humidity.max > 85 ? '💧 Umidade alta: ventile' : '',
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl"
      >
        <ArrowLeft size={20} />
        Voltar
      </button>

      {/* Month Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[40px] p-8 border border-blue-100">
        <h2 className="text-4xl font-black text-slate-900 mb-2">{currentMonthName}</h2>
        <p className="text-blue-700 font-black mb-6">📍 {userRegion}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-slate-600 font-bold uppercase">Estação</p>
            <p className="text-lg font-black">{monthData.season}</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-slate-600 font-bold uppercase">Temperatura</p>
            <p className="text-lg font-black">{monthData.temperature.min}°C - {monthData.temperature.max}°C</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-slate-600 font-bold uppercase">Luz</p>
            <p className="text-lg font-black">{monthData.photoperiod}</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-slate-600 font-bold uppercase">Chuva</p>
            <p className="text-lg font-black">{monthData.rainfall}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Atividades */}
        <div className="bg-white rounded-[40px] p-8 border border-slate-100">
          <h3 className="text-2xl font-black mb-6">📋 Atividades</h3>
          <div className="space-y-3">
            {taskActivities.map((activity, i) => (
              <button
                key={i}
                onClick={() => handleToggleTask(i)}
                disabled={saving}
                className={`w-full p-4 rounded-xl text-left flex items-start gap-3 transition-all ${
                  completedTasks.has(`${currentMonthName}-${i}`)
                    ? 'bg-emerald-100 border-2 border-emerald-600'
                    : 'bg-slate-50 border-2 border-slate-200 hover:border-blue-400'
                }`}
              >
                <div className="mt-1">
                  {completedTasks.has(`${currentMonthName}-${i}`) ? (
                    <CheckCircle size={20} className="text-emerald-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-slate-300 rounded-full" />
                  )}
                </div>
                <span className={`font-semibold ${
                  completedTasks.has(`${currentMonthName}-${i}`)
                    ? 'text-emerald-900 line-through'
                    : 'text-slate-700'
                }`}>
                  {activity}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Nutrição */}
        <div className="bg-white rounded-[40px] p-8 border border-slate-100">
          <h3 className="text-2xl font-black mb-6">🍗 Nutrição</h3>
          <div className="space-y-2">
            {taskNutrition.map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-semibold text-slate-700">✓ {item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 rounded-[40px] p-8 border-2 border-amber-300">
          <h3 className="text-xl font-black mb-4 flex items-center gap-2">
            <AlertCircle className="text-amber-600" size={24} />
            Avisos
          </h3>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <p key={i} className="text-slate-700 font-semibold">{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-[40px] p-8 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Progresso</h3>
          <span className="text-2xl font-black">{completedTasks.size} / {taskActivities.length}</span>
        </div>
        <div className="w-full bg-slate-300 rounded-full h-4">
          <div
            className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100">
        <h3 className="font-black mb-6">📅 Selecione um Mês</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {monthNames.map((month, i) => (
            <button
              key={i}
              onClick={() => setSelectedMonth(i)}
              className={`p-3 rounded-xl font-bold text-xs transition-all ${
                selectedMonth === i
                  ? 'border-2 border-blue-600 bg-blue-50'
                  : 'bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {month.substring(0, 3)}
              {i === 7 && <div>🔥</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeasonalCalendar;
