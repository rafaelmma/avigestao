import React, { useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';

interface ConsanguinityCalculatorProps {
  onBack: () => void;
}

const ConsanguinityCalculator: React.FC<ConsanguinityCalculatorProps> = ({ onBack }) => {
  const [relationship, setRelationship] = useState<string>('');
  const [commonAncestors, setCommonAncestors] = useState<number>(1);

  const calculateConsanguinity = (rel: string, ancestors: number): number => {
    const relationships: { [key: string]: number } = {
      'parent-child': 0.25,
      'sibling': 0.25,
      'half-sibling': 0.125,
      'aunt-uncle': 0.125,
      'cousin': 0.0625,
      'half-cousin': 0.03125,
      'grandparent': 0.25,
      'great-uncle': 0.0625,
    };

    return (relationships[rel] || 0) * ancestors;
  };

  const consanguinity = calculateConsanguinity(relationship, commonAncestors);
  const percentage = (consanguinity * 100).toFixed(2);

  const getRisk = (value: number): { level: string; color: string; message: string } => {
    if (value === 0) return { level: 'Sem Consanguinidade', color: 'green', message: '✅ Cruzamento excelente' };
    if (value <= 0.03125) return { level: 'Muito Baixo', color: 'blue', message: '✅ Consanguinidade negligenciável' };
    if (value <= 0.0625) return { level: 'Baixo', color: 'blue', message: '✅ Consanguinidade aceitável' };
    if (value <= 0.125) return { level: 'Moderado', color: 'yellow', message: '⚠️ Monitorar a linhagem' };
    if (value <= 0.25) return { level: 'Alto', color: 'orange', message: '⚠️ Risco aumentado' };
    return { level: 'Muito Alto', color: 'red', message: '❌ Evitar este cruzamento' };
  };

  const risk = getRisk(consanguinity);

  const relationshipOptions = [
    { value: 'parent-child', label: 'Pai/Mãe × Filho/Filha' },
    { value: 'sibling', label: 'Irmão × Irmã' },
    { value: 'half-sibling', label: 'Meio-Irmão × Meia-Irmã' },
    { value: 'grandparent', label: 'Avô/Avó × Neto/Neta' },
    { value: 'aunt-uncle', label: 'Tio/Tia × Sobrinho/Sobrinha' },
    { value: 'cousin', label: 'Primo × Prima' },
    { value: 'half-cousin', label: 'Primo de 2º Grau' },
    { value: 'great-uncle', label: 'Tio-Avô × Sobrinho-Neto' },
  ];

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

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-[40px] p-8 border border-purple-100">
        <h1 className="text-4xl font-black text-slate-900 mb-2">🧬 Calculadora de Consanguinidade</h1>
        <p className="text-slate-600">Calcule o risco de consanguinidade em cruzamentos genéticos</p>
      </div>

      {/* Explicação */}
      <div className="bg-blue-50 rounded-[30px] p-8 border-2 border-blue-300 space-y-4">
        <div className="flex items-start gap-3">
          <Info size={24} className="text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-black text-blue-900 mb-2">O que é Consanguinidade?</h3>
            <p className="text-sm text-blue-800 mb-3">
              Consanguinidade é o grau de relação genética entre dois indivíduos. Quanto maior a consanguinidade, maior o risco de problemas genéticos nos filhotes.
            </p>
            <div className="space-y-2 text-xs text-blue-700">
              <p><strong>🔹 MUito Baixo:</strong> Consanguinidade negligenciável, cruzamento seguro</p>
              <p><strong>🔸 Moderado:</strong> Monitorar, mas possível se feito com cuidado</p>
              <p><strong>🔴 Alto:</strong> Risco significativo, evitar se possível</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculadora */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entrada */}
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 space-y-6">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 border border-purple-200">
            <h2 className="text-lg font-black text-purple-900">⚙️ Configure o Cruzamento</h2>
          </div>

          <div>
            <label className="block font-black text-slate-900 mb-3">🔗 Relação entre os Pais:</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:outline-none bg-white"
            >
              <option value="">Selecione a relação...</option>
              {relationshipOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-black text-slate-900 mb-3">👥 Ancestrais Comuns:</label>
            <p className="text-sm text-slate-600 mb-2">Quantas gerações antes os pais têm ancestral comum?</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setCommonAncestors(num)}
                  className={`py-3 rounded-xl font-black transition-all ${
                    commonAncestors === num
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              ℹ️ Ex: Irmãos têm 1 ancestral comum (os pais), Primos têm 2 (os avós)
            </p>
          </div>
        </div>

        {/* Resultado */}
        <div className="space-y-4">
          {relationship ? (
            <div className={`bg-${risk.color}-50 rounded-[40px] p-8 border-3 border-${risk.color}-${risk.color === 'red' ? '500' : '300'}`}>
              <div className="text-center space-y-4">
                <p className="text-xs font-bold uppercase text-slate-700">Resultado do Cruzamento</p>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3">
                  <p className="text-5xl font-black text-slate-900">{percentage}%</p>
                  <p className="text-sm text-slate-600">Coeficiente de Consanguinidade</p>
                </div>

                <div className={`bg-white rounded-2xl p-4 border-2 border-${risk.color}-300`}>
                  <p className={`text-sm font-black text-${risk.color}-900`}>{risk.level}</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <p className="text-base font-bold text-slate-900">{risk.message}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-[40px] p-8 border-2 border-slate-200 text-center">
              <p className="text-slate-600 font-semibold">Selecione uma relação para ver o resultado</p>
            </div>
          )}

          {/* Dicas */}
          <div className="bg-yellow-50 rounded-2xl p-6 border-2 border-yellow-300 space-y-3">
            <p className="font-black text-yellow-900">💡 Dicas para Bom Cruzamento:</p>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li>✅ Busque consanguinidade abaixo de 3%</li>
              <li>✅ Evite cruzamento de parentes próximos</li>
              <li>✅ Use pedigrees para rastrear linhagem</li>
              <li>✅ Diversifique origens genéticas</li>
              <li>✅ Sempre priorize saúde e genética forte</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabela de Referência */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100">
        <h3 className="text-2xl font-black text-slate-900 mb-6">📊 Tabela de Referência</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-4 py-3 text-left font-black text-slate-900">Relação</th>
                <th className="px-4 py-3 text-left font-black text-slate-900">Consanguinidade</th>
                <th className="px-4 py-3 text-left font-black text-slate-900">Risco</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-slate-700">Não relacionados</td>
                <td className="px-4 py-3 font-bold text-slate-900">0%</td>
                <td className="px-4 py-3"><span className="bg-green-100 text-green-900 px-3 py-1 rounded-full text-xs font-bold">✅ Excelente</span></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-slate-700">Primos de 2º Grau</td>
                <td className="px-4 py-3 font-bold text-slate-900">3.125%</td>
                <td className="px-4 py-3"><span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-bold">✅ Aceitável</span></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-slate-700">Primos 1º Grau</td>
                <td className="px-4 py-3 font-bold text-slate-900">6.25%</td>
                <td className="px-4 py-3"><span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-bold">✅ Aceitável</span></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-slate-700">Tio/Sobrinho</td>
                <td className="px-4 py-3 font-bold text-slate-900">12.5%</td>
                <td className="px-4 py-3"><span className="bg-yellow-100 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">⚠️ Moderado</span></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-slate-700">Meio-Irmão</td>
                <td className="px-4 py-3 font-bold text-slate-900">12.5%</td>
                <td className="px-4 py-3"><span className="bg-yellow-100 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">⚠️ Moderado</span></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-slate-700">Avô/Neto</td>
                <td className="px-4 py-3 font-bold text-slate-900">25%</td>
                <td className="px-4 py-3"><span className="bg-orange-100 text-orange-900 px-3 py-1 rounded-full text-xs font-bold">🔴 Alto</span></td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Irmão puro</td>
                <td className="px-4 py-3 font-bold text-slate-900">25%</td>
                <td className="px-4 py-3"><span className="bg-red-100 text-red-900 px-3 py-1 rounded-full text-xs font-bold">❌ Evitar</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConsanguinityCalculator;
