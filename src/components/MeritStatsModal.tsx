import React from 'react';
import { MeritStats } from '../types/zen';
import { 
  Award, 
  Flame, 
  Sparkles, 
  Bell, 
  Heart, 
  Scroll, 
  Calendar, 
  X,
  CheckCircle2
} from 'lucide-react';

interface MeritStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: MeritStats;
}

export const MeritStatsModal: React.FC<MeritStatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  // Compute Zen Title based on total merits
  const totalMerits = stats.fishTaps + stats.incenseLit * 5 + stats.beadCount + stats.bellStrikes * 3;
  let title = 'Tâm Khởi Thiện Niệm';
  let badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';

  if (totalMerits > 5000) {
    title = 'Phúc Tuệ Viên Mãn';
    badgeColor = 'text-yellow-300 bg-yellow-500/20 border-yellow-400/50';
  } else if (totalMerits > 2000) {
    title = 'Tâm Như Chỉ Thủy';
    badgeColor = 'text-emerald-300 bg-emerald-500/15 border-emerald-400/40';
  } else if (totalMerits > 500) {
    title = 'Bồ Đề Định Tĩnh';
    badgeColor = 'text-amber-300 bg-amber-500/15 border-amber-400/40';
  } else if (totalMerits > 100) {
    title = 'Chánh Niệm Ban Sơ';
    badgeColor = 'text-stone-300 bg-stone-800 border-stone-700';
  }

  const statItems = [
    {
      label: 'Tiếng Mõ Tĩnh Tâm',
      value: stats.fishTaps.toLocaleString(),
      icon: Sparkles,
      color: 'text-amber-400',
    },
    {
      label: 'Nén Hương Đã Dâng',
      value: stats.incenseLit.toLocaleString(),
      icon: Flame,
      color: 'text-red-400',
    },
    {
      label: 'Hạt Chuỗi Đã Lần',
      value: `${stats.beadCount.toLocaleString()} (${stats.beadRounds} vòng)`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      label: 'Lần Thỉnh Chuông',
      value: stats.bellStrikes.toLocaleString(),
      icon: Bell,
      color: 'text-yellow-400',
    },
    {
      label: 'Hoa Đăng Cầu An',
      value: stats.wishesReleased.toLocaleString(),
      icon: Heart,
      color: 'text-pink-400',
    },
    {
      label: 'Quẻ Xăm Đã Chiêm',
      value: stats.oraclesDrawn.toLocaleString(),
      icon: Scroll,
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md zen-glass p-6 sm:p-7 rounded-3xl border border-amber-500/30 shadow-2xl flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-100">Sổ Ghi Công Đức</h3>
            <p className="text-xs text-stone-400">Hành trình nuôi dưỡng tâm an lạc</p>
          </div>
        </div>

        {/* Current Zen Honor Badge */}
        <div className="mb-5 p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">Danh Hiệu Hiện Tại</span>
            <h4 className="text-base font-serif font-bold text-amber-200 mt-0.5">{title}</h4>
          </div>
          <div className={`px-3 py-1 rounded-full border text-xs font-semibold ${badgeColor}`}>
            Chuỗi {stats.streakDays} ngày
          </div>
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {statItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-stone-900/50 border border-stone-800/80 flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 text-stone-400">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-[11px] truncate">{item.label}</span>
                </div>
                <div className="mt-2 font-mono text-base font-bold text-stone-100">
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-all"
        >
          Hoan Hỷ Tiếp Tục
        </button>
      </div>
    </div>
  );
};
