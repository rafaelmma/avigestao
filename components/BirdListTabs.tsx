import React from 'react';
import { Bird as BirdIcon, Archive, Dna, Trash2, Zap } from 'lucide-react';
import Tabs, { TabItem } from './ui/Tabs';

type BirdListType = 'plantel' | 'histórico' | 'lixeira' | 'sexagem' | 'ibama-pendentes';

interface BirdListTabsProps {
  currentList: BirdListType;
  onChange: (list: BirdListType) => void;
  activeBirdsCount: number;
  historicCount: number;
  sexingWaitingCount: number;
  trashCount: number;
  ibamaPendingCount: number;
  includeSexingTab?: boolean;
}

const BirdListTabs: React.FC<BirdListTabsProps> = ({
  currentList,
  onChange,
  activeBirdsCount,
  historicCount,
  sexingWaitingCount,
  trashCount,
  ibamaPendingCount,
  includeSexingTab = true
}) => {
  const tabs: TabItem[] = [
    {
      id: 'plantel',
      label: 'Plantel',
      icon: <BirdIcon size={16} />,
      badge: activeBirdsCount > 0 ? activeBirdsCount : undefined,
      badgeVariant: 'info'
    },
    {
      id: 'histórico',
      label: 'Histórico',
      icon: <Archive size={16} />,
      badge: historicCount > 0 ? historicCount : undefined,
      badgeVariant: 'info'
    },
    ...(includeSexingTab ? [{
      id: 'sexagem' as const,
      label: 'Sexagem',
      icon: <Dna size={16} />,
      badge: sexingWaitingCount > 0 ? sexingWaitingCount : undefined,
      badgeVariant: sexingWaitingCount > 0 ? 'warning' as const : 'info' as const
    }] : []),
    {
      id: 'ibama-pendentes',
      label: 'IBAMA',
      icon: <Zap size={16} />,
      badge: ibamaPendingCount > 0 ? ibamaPendingCount : undefined,
      badgeVariant: ibamaPendingCount > 0 ? 'danger' : 'info'
    },
    {
      id: 'lixeira',
      label: 'Lixeira',
      icon: <Trash2 size={16} />,
      badge: trashCount > 0 ? trashCount : undefined,
      badgeVariant: 'info'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <Tabs 
        tabs={tabs}
        activeTab={currentList}
        onChange={(tabId) => onChange(tabId as BirdListType)}
        variant="pill"
      />
    </div>
  );
};

export default BirdListTabs;
