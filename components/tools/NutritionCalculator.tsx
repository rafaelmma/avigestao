import React, { useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';

interface NutritionCalculatorProps {
  onBack: () => void;
}

const NutritionCalculator: React.FC<NutritionCalculatorProps> = ({ onBack }) => {
  const [weight, setWeight] = useState<number>(18); // grams
  const [phase, setPhase] = useState<'maintenance' | 'molt' | 'breeding'>('maintenance');

  // Calcular necessidades baseado no peso
  const calculateNeeds = () => {
    const proteinPercentages = {
      maintenance: 20,
      molt: 30,
      breeding: 28
    };

    const dailyFood = weight * 1.1; // gramas por dia

    return {
      dailyTotal: dailyFood.toFixed(1),
      protein: {
        grams: (dailyFood * (proteinPercentages[phase] / 100)).toFixed(1),
        percentage: proteinPercentages[phase]
      },
      fat: {
        grams: (dailyFood * 0.12).toFixed(1),
        percentage: 12
      },
      carbs: {
        grams: (dailyFood * 0.58).toFixed(1),
        percentage: 58
      },
      minerals: {
        calcium: (dailyFood * 0.08).toFixed(2),
        phosphorus: (dailyFood * 0.05).toFixed(2)
      }
    };
  };

  const needs = calculateNeeds();

  const recipes = {
    maintenance: [
      { name: 'Sementes (alpiste, milhete)', amount: '8g', frequency: '' },
      { name: 'Cereais (aveia, milho)', amount: '5g', frequency: '' },
      { name: 'Frutas/vegetais', amount: '2g', frequency: '' },
      { name: 'Sementes especiais (girassol)', amount: '2g', frequency: '' }
    ],
    molt: [
      { name: 'Ovos cozidos picados', amount: '4g', frequency: '4x semana' },
      { name: 'Sementes (alpiste, milhete)', amount: '10g', frequency: '' },
      { name: 'Cereais (aveia, milho)', amount: '6g', frequency: '' },
      { name: 'Larvas de inseto (seco)', amount: '1g', frequency: '2x semana' },
      { name: 'Frutas/vegetais', amount: '2g', frequency: '' },
      { name: 'Sementes de cânhamo', amount: '0.5g', frequency: '' }
    ],
    breeding: [
      { name: 'Ovos cozidos picados', amount: '5g', frequency: 'diário' },
      { name: 'Sementes (alpiste, cânhamo)', amount: '9g', frequency: '' },
      { name: 'Cereais (aveia, milho)', amount: '5g', frequency: '' },
      { name: 'Larvas de inseto (seco)', amount: '1g', frequency: '2x semana' },
      { name: 'Frutas/vegetais', amount: '2g', frequency: '' },
      { name: 'Calcário/ostra', amount: 'à vontade', frequency: '' }
    ]
  };

  const supplements = {
    maintenance: [
      '⭐ Calcário marinho: 1x semana',
      'Vitaminas: 1x mês',
      'Sal mineral: à vontade'
    ],
    molt: [
      '⭐ Vitamina A+E: diária',
      '⭐ Vitamina D3: diária',
      '⭐ Complexo B na água: 2x semana',
      'Calcário: 3x semana',
      'Sal mineral: à vontade'
    ],
    breeding: [
      '⭐ Cálcio (calcário): à vontade',
      '⭐ Vitamina A+D3+E: diária',
      '⭐ Complexo B: 2x semana',
      'Ômega-3 (linhaça): 1x semana',
      'Sal mineral: à vontade'
    ]
  };

  const descriptions = {
    maintenance: 'Manutenção normal do pássaro saudável',
    molt: 'Período de muda de penas (agosto-outubro)',
    breeding: 'Preparação para reprodução (3 meses antes)'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold mb-4"
      >
        <ArrowLeft size={20} />
        Voltar
      </button>

      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-[40px] p-8 border border-orange-100">
        <h1 className="text-4xl font-black text-slate-900 mb-2">🍗 Calculadora de Nutrição</h1>
        <p className="text-slate-600">Calcule a alimentação ideal baseado no peso e fase de vida do seu pássaro</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 space-y-6">
          <h2 className="text-2xl font-black text-slate-900">Configuração</h2>

          {/* Weight Input */}
          <div className="space-y-3">
            <label className="block">
              <span className="font-bold text-slate-900 mb-2 block">Peso da Ave (gramas)</span>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-3xl font-black text-orange-600 min-w-fit">{weight}g</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Aves pequenas: 5-15g | Médias: 15-40g | Grandes: 40g+</p>
            </label>
          </div>

          {/* Phase Selection */}
          <div className="space-y-3">
            <span className="font-bold text-slate-900 block">Fase de Vida</span>
            <div className="grid grid-cols-3 gap-2">
              {(['maintenance', 'molt', 'breeding'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className={`p-4 rounded-2xl font-bold transition-all ${
                    phase === p
                      ? 'bg-orange-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p === 'maintenance' && '🏠 Manutenção'}
                  {p === 'molt' && '🪶 Muda'}
                  {p === 'breeding' && '🥚 Reprodução'}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-600 bg-blue-50 p-4 rounded-2xl border border-blue-100">
              {descriptions[phase]}
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-[40px] p-8 border border-orange-100 space-y-6">
          <h2 className="text-2xl font-black text-slate-900">Necessidades Diárias</h2>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 border-2 border-orange-200">
              <div className="text-sm text-orange-600 font-bold uppercase">Total Diário</div>
              <div className="text-4xl font-black text-orange-600 mt-2">{needs.dailyTotal}g</div>
              <p className="text-xs text-slate-500 mt-2">Por dia</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4">
                <div className="text-xs text-slate-600 font-bold">PROTEÍNA</div>
                <div className="text-2xl font-black text-red-600 mt-1">{needs.protein.grams}g</div>
                <div className="text-xs text-slate-500">{needs.protein.percentage}%</div>
              </div>
              <div className="bg-white rounded-2xl p-4">
                <div className="text-xs text-slate-600 font-bold">GORDURA</div>
                <div className="text-2xl font-black text-yellow-600 mt-1">{needs.fat.grams}g</div>
                <div className="text-xs text-slate-500">{needs.fat.percentage}%</div>
              </div>
              <div className="bg-white rounded-2xl p-4">
                <div className="text-xs text-slate-600 font-bold">CARBOS</div>
                <div className="text-2xl font-black text-amber-600 mt-1">{needs.carbs.grams}g</div>
                <div className="text-xs text-slate-500">{needs.carbs.percentage}%</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 space-y-2">
              <div className="text-xs text-slate-600 font-bold">MINERAIS</div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Cálcio:</span>
                <span className="font-bold text-slate-900">{needs.minerals.calcium}mg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Fósforo:</span>
                <span className="font-bold text-slate-900">{needs.minerals.phosphorus}mg</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Section */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 space-y-6">
        <h2 className="text-2xl font-black text-slate-900">Receita Recomendada</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Food Items */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 mb-4">Alimentos base</h3>
            {recipes[phase].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-slate-700">{item.name}</span>
                <div className="text-right">
                  <div className="font-bold text-orange-600">{item.amount}</div>
                  {item.frequency && item.frequency.trim() && (
                    <div className="text-xs text-slate-500">{item.frequency}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Supplements */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 mb-4">Suplementação</h3>
            {supplements[phase].map((supp, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-emerald-900 font-medium">{supp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-[40px] p-8 border border-blue-100 space-y-4">
        <div className="flex items-start gap-3">
          <Info size={24} className="text-blue-600 mt-1 min-w-fit" />
          <div>
            <h3 className="font-black text-slate-900 mb-2">💡 Dicas Importantes</h3>
            <ul className="space-y-2 text-slate-700 text-sm">
              <li>✓ Ajustar quantidade conforme o pássaro come (alguns comem mais/menos)</li>
              <li>✓ Pesagem semanal para monitorar peso ideal (18-20g)</li>
              <li>✓ Água fresca sempre disponível (trocar 2x ao dia)</li>
              <li>✓ Remover alimentos frescos após 2 horas para evitar mofo</li>
              <li>✓ Observar comportamento e adaptar conforme necessário</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionCalculator;
