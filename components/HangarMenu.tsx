
import React from 'react';
import { TagColor } from '../types';
import { ICONS } from '../constants';

interface HangarMenuProps {
  onSelectTag: (tag: TagColor) => void;
  t: any;
}

const HangarMenu: React.FC<HangarMenuProps> = ({ onSelectTag, t }) => {
  const cards = [
    { 
      id: TagColor.YELLOW, 
      label: t.yellow_tag, 
      color: 'bg-yellow-500', 
      hover: 'hover:bg-yellow-400',
      text: 'text-yellow-950',
      icon: ICONS.Yellow 
    },
    { 
      id: TagColor.GREEN, 
      label: t.green_tag, 
      color: 'bg-emerald-500', 
      hover: 'hover:bg-emerald-400',
      text: 'text-emerald-950',
      icon: ICONS.Green 
    },
    { 
      id: TagColor.WHITE, 
      label: t.white_tag, 
      color: 'bg-slate-50', 
      hover: 'hover:bg-white',
      text: 'text-slate-900',
      icon: ICONS.White 
    },
    { 
      id: TagColor.RED, 
      label: t.red_tag, 
      color: 'bg-rose-500', 
      hover: 'hover:bg-rose-400',
      text: 'text-rose-950',
      icon: ICONS.Red 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full max-w-5xl mx-auto py-10">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            onClick={() => onSelectTag(card.id)}
            className={`${card.color} ${card.hover} ${card.text} group p-8 md:p-12 rounded-3xl transition-all duration-300 transform active:scale-95 flex flex-col items-center justify-center text-center shadow-xl hover:shadow-2xl shadow-black/20 gap-6`}
          >
            <div className={`p-4 rounded-2xl bg-black/10 group-hover:scale-110 transition-transform`}>
              <Icon size={64} />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase mb-2">
                {card.label.split('-')[0]}
              </h2>
              <p className="text-sm md:text-lg font-bold opacity-80 uppercase tracking-widest">
                {card.label.split('-').slice(1).join('-').trim() || card.id}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default HangarMenu;
