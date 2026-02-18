import React, { useMemo, useState } from 'react';
import { Bird, RingBatch, RingItem } from '../types';
import Card from '../components/ui/Card';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';

interface RingsManagerProps {
  rings: RingItem[];
  ringBatches: RingBatch[];
  birds: Bird[];
  addRingBatch: (batch: Omit<RingBatch, 'id'>, items: Omit<RingItem, 'id'>[]) => Promise<boolean>;
  addRingItem: (item: Omit<RingItem, 'id'>) => Promise<boolean>;
  updateRingItem: (ringId: string, updates: Partial<RingItem>) => Promise<boolean>;
  deleteRingItem: (ringId: string) => Promise<boolean>;
  updateBird: (bird: Bird) => Promise<boolean>;
}

const MAX_RANGE_ITEMS = 2000;

const RING_SIZE_SUGGESTIONS = [
  { label: 'Coleiro / Papa-capim', size: '2.2' },
  { label: 'Tiziu', size: '2.0' },
  { label: 'Curio / Bicudo / Pichochio', size: '2.6' },
  { label: 'Canario-da-terra', size: '2.8' },
  { label: 'Azulao', size: '2.8' },
  { label: 'Pintassilgo / Pintagol', size: '2.8' },
  { label: 'Cardeal / Melro', size: '3.5' },
  { label: 'Agapornis (todas as espécies)', size: '4.5' },
  { label: 'Kakariki / Catarina', size: '4.5' },
  { label: 'Forpus (tuim)', size: '3.5-4.0' },
  { label: 'Calopsita', size: '5.5' },
  { label: 'Rosela', size: '6.0' },
  { label: 'Loris', size: '6.0' },
  { label: 'Ring Neck', size: '7.0-7.5' },
  { label: 'Pombos domesticos', size: '6.0-10.0' },
  { label: 'Araras', size: '10-14' },
  { label: 'Papagaio-verdadeiro / Amazona spp.', size: '8-10' },
];

const getSuggestedSize = (species: string) => {
  const match = RING_SIZE_SUGGESTIONS.find(
    (item) => item.label.toLowerCase() === species.trim().toLowerCase(),
  );
  return match?.size || '';
};

const maskPersonalization = (value: string) => {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
};

const RingsManager: React.FC<RingsManagerProps> = ({
  rings,
  ringBatches,
  birds,
  addRingBatch,
  addRingItem,
  updateRingItem,
  deleteRingItem,
  updateBird,
}) => {
  const [batchForm, setBatchForm] = useState({
    supplier: 'Capri (IBAMA)',
    species: '',
    quantity: '',
    sizeMm: '',
    year: '',
    state: '',
    color: '',
    startNumber: '',
    endNumber: '',
    engravingType: '',
    personalization: '',
  });
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  const [manualForm, setManualForm] = useState({
    code: '',
    species: '',
    year: '',
    state: '',
    color: '',
    sizeMm: '',
    batchId: '',
  });
  const [manualStatus, setManualStatus] = useState<string | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');

  const [linkingRing, setLinkingRing] = useState<RingItem | null>(null);
  const [selectedBirdId, setSelectedBirdId] = useState('');
  const [lossRing, setLossRing] = useState<RingItem | null>(null);
  const [lossReason, setLossReason] = useState('Fuga');
  const [editRing, setEditRing] = useState<RingItem | null>(null);
  const [editForm, setEditForm] = useState({ number: '', color: '', personalization: '' });
  const [deleteRing, setDeleteRing] = useState<RingItem | null>(null);

  const handleBatchSpeciesChange = (value: string) => {
    const size = getSuggestedSize(value);
    setBatchForm((prev) => ({
      ...prev,
      species: value,
      sizeMm: size || prev.sizeMm,
    }));
  };

  const handleManualSpeciesChange = (value: string) => {
    const size = getSuggestedSize(value);
    setManualForm((prev) => ({
      ...prev,
      species: value,
      sizeMm: size || prev.sizeMm,
    }));
  };

  const summary = useMemo(() => {
    const totals = { estoque: 0, usada: 0, perdida: 0 };
    rings.forEach((ring) => {
      if (ring.status === 'usada') totals.usada += 1;
      else if (ring.status === 'perdida') totals.perdida += 1;
      else totals.estoque += 1;
    });
    return totals;
  }, [rings]);

  const filteredRings = useMemo(() => {
    return rings.filter((ring) => {
      if (filterStatus && ring.status !== filterStatus) return false;
      if (filterYear && ring.year !== filterYear) return false;
      if (filterSpecies && ring.species !== filterSpecies) return false;
      return true;
    });
  }, [rings, filterStatus, filterYear, filterSpecies]);

  const generateRangeItems = () => {
    const start = batchForm.startNumber.trim();
    const end = batchForm.endNumber.trim();
    if (!start || !end) return [] as Omit<RingItem, 'id'>[];
    if (!/^\d+$/.test(start) || !/^\d+$/.test(end)) return [] as Omit<RingItem, 'id'>[];

    const startNum = Number(start);
    const endNum = Number(end);
    if (Number.isNaN(startNum) || Number.isNaN(endNum) || endNum < startNum) {
      return [] as Omit<RingItem, 'id'>[];
    }

    const count = endNum - startNum + 1;
    if (count > MAX_RANGE_ITEMS) {
      setBatchStatus(`Intervalo muito grande. Limite: ${MAX_RANGE_ITEMS} anilhas.`);
      return [] as Omit<RingItem, 'id'>[];
    }

    const width = Math.max(start.length, end.length);
    const items: Omit<RingItem, 'id'>[] = [];

    for (let i = startNum; i <= endNum; i += 1) {
      const padded = i.toString().padStart(width, '0');
      items.push({
        code: padded,
        number: padded,
        year: batchForm.year || undefined,
        state: batchForm.state || undefined,
        color: batchForm.color || undefined,
        species: batchForm.species || undefined,
        sizeMm: batchForm.sizeMm || undefined,
        status: 'estoque',
      });
    }

    return items;
  };

  const handleBatchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBatchStatus(null);

    if (!batchForm.species && !batchForm.startNumber && !batchForm.quantity) {
      setBatchStatus('Preencha pelo menos espécie ou numeração para cadastrar o lote.');
      return;
    }

    const hasRange = !!batchForm.startNumber && !!batchForm.endNumber;
    const hasQuantityOnly = !!batchForm.quantity && !hasRange;
    if (hasQuantityOnly) {
      const confirmed = window.confirm(
        'Sem numeração inicial/final o sistema vai gerar uma numeração interna. Deseja continuar?',
      );
      if (!confirmed) {
        setBatchStatus('Informe a numeração inicial e final para gerar a sequência real.');
        return;
      }
    }

    setIsSavingBatch(true);
    try {
      const items = generateRangeItems();
      const quantityFromRange = items.length || undefined;
      const quantityValue = batchForm.quantity ? Number(batchForm.quantity) : undefined;
      const batchPayload: Omit<RingBatch, 'id'> = {
        supplier: batchForm.supplier,
      };

      const resolvedQuantity = quantityFromRange || quantityValue;
      if (batchForm.species) batchPayload.species = batchForm.species;
      if (resolvedQuantity) batchPayload.quantity = resolvedQuantity;
      if (batchForm.sizeMm) batchPayload.sizeMm = batchForm.sizeMm;
      if (batchForm.year) batchPayload.year = batchForm.year;
      if (batchForm.state) batchPayload.state = batchForm.state;
      if (batchForm.color) batchPayload.color = batchForm.color;
      if (batchForm.startNumber) batchPayload.startNumber = batchForm.startNumber;
      if (batchForm.endNumber) batchPayload.endNumber = batchForm.endNumber;
      if (batchForm.engravingType) batchPayload.engravingType = batchForm.engravingType;
      if (batchForm.personalization) batchPayload.personalization = batchForm.personalization;

      const ok = await addRingBatch(batchPayload, items);
      if (ok) {
        setBatchForm({
          supplier: 'Capri (IBAMA)',
          species: '',
          quantity: '',
          sizeMm: '',
          year: '',
          state: '',
          color: '',
          startNumber: '',
          endNumber: '',
          engravingType: '',
          personalization: '',
        });
        setBatchStatus(items.length ? 'Lote e anilhas gerados.' : 'Lote salvo.');
      } else {
        setBatchStatus('Não foi possível salvar o lote.');
      }
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setManualStatus(null);

    if (!manualForm.code.trim()) {
      setManualStatus('Informe o código da anilha.');
      return;
    }

    setIsSavingManual(true);
    try {
      const payload: Omit<RingItem, 'id'> = {
        batchId: manualForm.batchId || undefined,
        code: manualForm.code.trim(),
        number: manualForm.code.trim(),
        year: manualForm.year || undefined,
        state: manualForm.state || undefined,
        color: manualForm.color || undefined,
        species: manualForm.species || undefined,
        sizeMm: manualForm.sizeMm || undefined,
        status: 'estoque',
      };
      const ok = await addRingItem(payload);
      if (ok) {
        setManualForm({
          code: '',
          species: '',
          year: '',
          state: '',
          color: '',
          sizeMm: '',
          batchId: '',
        });
        setManualStatus('Anilha adicionada ao estoque.');
      } else {
        setManualStatus('Não foi possível salvar a anilha.');
      }
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleLinkBird = async () => {
    if (!linkingRing || !selectedBirdId) return;
    const bird = birds.find((b) => b.id === selectedBirdId);
    if (!bird) return;

    const ringCode = linkingRing.code || linkingRing.number || '';
    const updatedBird = { ...bird, ringNumber: ringCode };
    const ok = await updateBird(updatedBird);
    if (!ok) return;

    await updateRingItem(linkingRing.id, {
      status: 'usada',
      assignedBirdId: bird.id,
      assignedBirdName: bird.name,
      assignedAt: new Date().toISOString(),
    });

    setLinkingRing(null);
    setSelectedBirdId('');
  };

  const handleMarkLost = async () => {
    if (!lossRing) return;
    await updateRingItem(lossRing.id, {
      status: 'perdida',
      lostReason: lossReason,
    });
    setLossRing(null);
  };

  const openEditRing = (ring: RingItem) => {
    setEditRing(ring);
    setEditForm({
      number: ring.number || ring.code || '',
      color: ring.color || '',
      personalization: ring.personalization || '',
    });
  };

  const handleEditSave = async () => {
    if (!editRing) return;
    const newNumber = editForm.number.trim();
    const updates: Partial<RingItem> = {
      code: newNumber || undefined,
      number: newNumber || undefined,
      color: editForm.color.trim() || undefined,
      personalization: editForm.personalization.trim() || undefined,
    };
    await updateRingItem(editRing.id, updates);
    setEditRing(null);
  };

  const handleDeleteRingConfirm = async () => {
    if (!deleteRing) return;
    await deleteRingItem(deleteRing.id);
    setDeleteRing(null);
  };

  const renderPreview = (personalization: string, number: string) => (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        Prévia
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-300 text-[10px] font-black text-slate-700">
          {personalization || '---'}
        </div>
        <div className="text-3xl font-black text-slate-700">
          {number || '---'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Anilhas</h2>
        <p className="text-sm text-slate-500">
          Controle de estoque com base no formulário da Capri.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Estoque</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{summary.estoque}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Usadas</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{summary.usada}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Perdidas</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{summary.perdida}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="p-6">
          <h3 className="text-lg font-black text-slate-900">Cadastro de lote (Capri)</h3>
          <form onSubmit={handleBatchSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Pássaro / Espécie
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={batchForm.species}
                  onChange={(e) => handleBatchSpeciesChange(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {RING_SIZE_SUGGESTIONS.map((item) => (
                    <option key={item.label} value={item.label}>
                      {item.label} - {item.size} mm
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Quantidade
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={batchForm.quantity}
                  onChange={(e) =>
                    setBatchForm((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                  placeholder="Ex: 50"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Altura / Diâmetro (mm)
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={batchForm.sizeMm}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, sizeMm: e.target.value }))}
                  placeholder="Ex: 5"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Bitola sugerida (ajustável)
                </p>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Ano
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={batchForm.year}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, year: e.target.value }))}
                  placeholder="Ex: 2026"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Estado (UF)
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={batchForm.state}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="Ex: SP"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Cor
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={batchForm.color}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, color: e.target.value }))}
                  placeholder="Ex: Verde"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Numeração inicial
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={batchForm.startNumber}
                  onChange={(e) =>
                    setBatchForm((prev) => ({ ...prev, startNumber: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Numeração final
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={batchForm.endNumber}
                  onChange={(e) =>
                    setBatchForm((prev) => ({ ...prev, endNumber: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </label>
              <p className="text-[11px] text-slate-400 sm:col-span-2">
                Se você não informar numeração inicial e final, o sistema vai gerar uma numeração
                interna editável para as anilhas desse lote.
              </p>
              <label className="text-xs font-semibold text-slate-600">
                Tipo de gravação
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={batchForm.engravingType}
                  onChange={(e) =>
                    setBatchForm((prev) => ({ ...prev, engravingType: e.target.value }))
                  }
                  placeholder="Ex: Baixo relevo"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Personalização
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={batchForm.personalization}
                  onChange={(e) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      personalization: maskPersonalization(e.target.value),
                    }))
                  }
                  placeholder="ABC-DEF"
                />
              </label>
              <div className="sm:col-span-2">
                {renderPreview(
                  batchForm.personalization,
                  batchForm.startNumber || (batchForm.quantity ? '001' : ''),
                )}
              </div>
            </div>

            {batchStatus && <p className="text-xs font-semibold text-slate-500">{batchStatus}</p>}

            <PrimaryButton type="submit" disabled={isSavingBatch}>
              {isSavingBatch ? 'Salvando...' : 'Salvar lote'}
            </PrimaryButton>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-black text-slate-900">Adicionar anilha avulsa</h3>
          <form onSubmit={handleManualSubmit} className="mt-4 space-y-4">
            <label className="text-xs font-semibold text-slate-600">
              Código
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={manualForm.code}
                onChange={(e) => setManualForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Digite o código"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Lote (opcional)
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={manualForm.batchId}
                onChange={(e) => setManualForm((prev) => ({ ...prev, batchId: e.target.value }))}
              >
                <option value="">Sem lote</option>
                {ringBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.species || 'Lote'} - {batch.year || 'Sem ano'}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Espécie
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={manualForm.species}
                  onChange={(e) => handleManualSpeciesChange(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {RING_SIZE_SUGGESTIONS.map((item) => (
                    <option key={item.label} value={item.label}>
                      {item.label} - {item.size} mm
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Ano
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={manualForm.year}
                  onChange={(e) => setManualForm((prev) => ({ ...prev, year: e.target.value }))}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Estado
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={manualForm.state}
                  onChange={(e) => setManualForm((prev) => ({ ...prev, state: e.target.value }))}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Cor
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={manualForm.color}
                  onChange={(e) => setManualForm((prev) => ({ ...prev, color: e.target.value }))}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Altura / Diâmetro
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={manualForm.sizeMm}
                  onChange={(e) => setManualForm((prev) => ({ ...prev, sizeMm: e.target.value }))}
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Bitola sugerida (ajustável)
                </p>
              </label>
            </div>

            {manualStatus && <p className="text-xs font-semibold text-slate-500">{manualStatus}</p>}

            <PrimaryButton type="submit" disabled={isSavingManual}>
              {isSavingManual ? 'Salvando...' : 'Adicionar'}
            </PrimaryButton>
          </form>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-black text-slate-900">Anilhas e identificação</h3>
        <div className="mt-3 space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            A identificação correta dos filhotes é uma etapa essencial da criação responsável. As
            anilhas oficiais numeradas ajudam a manter o controle do plantel, evitam erros de
            linhagem e apoiam o cumprimento das boas práticas de criação. Utilize sempre fornecedor
            autorizado.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Por que registrar
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Organização do plantel e das linhagens.</li>
                <li>Histórico completo de cada ave.</li>
                <li>Controle de estoque e uso das anilhas.</li>
                <li>Facilidade para auditorias e comprovações.</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                O que registrar
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Número, ano, cor e tamanho da anilha.</li>
                <li>Origem/fornecedor e lote de compra.</li>
                <li>Espécie e filhote associado.</li>
                <li>Observações e histórico de uso.</li>
              </ul>
            </div>
          </div>

          <p>
            No AviGestão, você pode cadastrar lotes, adicionar anilhas avulsas e vincular cada
            anilha ao filhote. Em casos de fuga ou óbito, a anilha pode ser marcada como perdida e
            fica inutilizável.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900">Estoque de anilhas</h3>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Status</option>
              <option value="estoque">Estoque</option>
              <option value="usada">Usada</option>
              <option value="perdida">Perdida</option>
            </select>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              placeholder="Ano"
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              placeholder="Espécie"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="py-2">Código</th>
                <th className="py-2">Espécie</th>
                <th className="py-2">Ano</th>
                <th className="py-2">Status</th>
                <th className="py-2">Ave</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRings.map((ring) => (
                <tr key={ring.id} className="border-t border-slate-100">
                  <td className="py-3 font-semibold text-slate-700">
                    <button
                      type="button"
                      onClick={() => openEditRing(ring)}
                      className="text-left font-semibold text-slate-700 hover:underline"
                    >
                      {ring.personalization
                        ? `${ring.personalization} ${ring.number || ring.code || ''}`.trim()
                        : ring.code || ring.number || '-'}
                    </button>
                  </td>
                  <td className="py-3 text-slate-500">{ring.species || '-'}</td>
                  <td className="py-3 text-slate-500">{ring.year || '-'}</td>
                  <td className="py-3 text-slate-500">{ring.status}</td>
                  <td className="py-3 text-slate-500">{ring.assignedBirdName || '-'}</td>
                  <td className="py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <SecondaryButton onClick={() => openEditRing(ring)}>
                        Editar
                      </SecondaryButton>
                      <SecondaryButton onClick={() => setDeleteRing(ring)}>
                        Excluir
                      </SecondaryButton>
                      {ring.status === 'estoque' && (
                        <SecondaryButton onClick={() => setLinkingRing(ring)}>
                          Vincular
                        </SecondaryButton>
                      )}
                      {ring.status !== 'perdida' && (
                        <SecondaryButton onClick={() => setLossRing(ring)}>
                          Marcar perdida
                        </SecondaryButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {linkingRing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-black text-slate-900">Vincular anilha</h4>
            <p className="text-xs text-slate-500">
              {linkingRing.code || linkingRing.number || 'Sem código'}
            </p>
            <select
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={selectedBirdId}
              onChange={(e) => setSelectedBirdId(e.target.value)}
            >
              <option value="">Selecione o pássaro</option>
              {birds.map((bird) => (
                <option key={bird.id} value={bird.id}>
                  {bird.name} - {bird.species}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <SecondaryButton onClick={() => setLinkingRing(null)}>Cancelar</SecondaryButton>
              <PrimaryButton onClick={handleLinkBird} disabled={!selectedBirdId}>
                Vincular
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {lossRing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-black text-slate-900">Baixa de anilha</h4>
            <p className="text-xs text-slate-500">
              Motivo de inutilização (fuga, óbito, entrega ao IBAMA).
            </p>
            <select
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
            >
              <option value="Fuga">Fuga</option>
              <option value="Obito">Óbito</option>
              <option value="Entregue ao IBAMA">Entregue ao IBAMA</option>
              <option value="Danificada">Danificada</option>
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <SecondaryButton onClick={() => setLossRing(null)}>Cancelar</SecondaryButton>
              <PrimaryButton onClick={handleMarkLost}>Confirmar</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {editRing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-black text-slate-900">Editar anilha</h4>
            <p className="text-xs text-slate-500">
              Atualize a numeração, cor e personalização da anilha.
            </p>
            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-slate-600">
                Numeração
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={editForm.number}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, number: e.target.value }))}
                  placeholder="Digite a numeração"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Cor
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={editForm.color}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, color: e.target.value }))}
                  placeholder="Ex: Verde"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Personalização
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={editForm.personalization}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      personalization: maskPersonalization(e.target.value),
                    }))
                  }
                  placeholder="ABC-DEF"
                />
              </label>
              {renderPreview(editForm.personalization, editForm.number)}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <SecondaryButton onClick={() => setEditRing(null)}>Cancelar</SecondaryButton>
              <PrimaryButton onClick={handleEditSave}>Salvar</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {deleteRing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-black text-slate-900">Excluir anilha</h4>
            <p className="text-xs text-slate-500">
              Deseja excluir a anilha{' '}
              <span className="font-semibold text-slate-700">
                {deleteRing.code || deleteRing.number || '-'}
              </span>
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <SecondaryButton onClick={() => setDeleteRing(null)}>Cancelar</SecondaryButton>
              <PrimaryButton onClick={handleDeleteRingConfirm}>Excluir</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RingsManager;
