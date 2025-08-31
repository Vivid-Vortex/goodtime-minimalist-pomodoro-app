import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Label {
  id: string;
  name: string;
  colorIndex: number;
  orderIndex: number;
  useDefaultTimeProfile: boolean;
  timerProfile?: {
    name?: string;
    workDuration: number;
    breakDuration: number;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
    isBreakEnabled: boolean;
    isLongBreakEnabled: boolean;
  };
  isArchived: boolean;
}

export const LABEL_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#0ea5e9', // sky-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#d946ef', // fuchsia-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
  '#64748b', // slate-500
  '#6b7280', // gray-500
  '#78716c', // stone-500
  '#dc2626', // red-600
  '#ea580c', // orange-600
  '#d97706', // amber-600
  '#ca8a04', // yellow-600
  '#65a30d', // lime-600
];

export const DEFAULT_LABEL: Label = {
  id: 'default',
  name: 'Work',
  colorIndex: 0,
  orderIndex: 0,
  useDefaultTimeProfile: true,
  isArchived: false,
};

interface LabelStore {
  labels: Label[];
  selectedLabel: Label;
  addLabel: (label: Omit<Label, 'id' | 'orderIndex'>) => void;
  updateLabel: (id: string, updates: Partial<Label>) => void;
  deleteLabel: (id: string) => void;
  setSelectedLabel: (labelId: string) => void;
  archiveLabel: (id: string, archived: boolean) => void;
  reorderLabels: (startIndex: number, endIndex: number) => void;
  getActiveLabels: () => Label[];
  getLabelColor: (colorIndex: number) => string;
}

export const useLabelStore = create<LabelStore>()(
  persist(
    (set, get) => ({
      labels: [DEFAULT_LABEL],
      selectedLabel: DEFAULT_LABEL,

      addLabel: (labelData) => {
        const labels = get().labels;
        const newLabel: Label = {
          ...labelData,
          id: crypto.randomUUID(),
          orderIndex: Math.max(...labels.map(l => l.orderIndex), 0) + 1,
        };
        
        set({
          labels: [...labels, newLabel]
        });
      },

      updateLabel: (id, updates) => {
        set((state) => ({
          labels: state.labels.map(label => 
            label.id === id ? { ...label, ...updates } : label
          )
        }));
        
        // Update selected label if it was the one being updated
        const { selectedLabel } = get();
        if (selectedLabel.id === id) {
          set({
            selectedLabel: { ...selectedLabel, ...updates }
          });
        }
      },

      deleteLabel: (id) => {
        if (id === 'default') return; // Can't delete default label
        
        const { labels, selectedLabel } = get();
        const updatedLabels = labels.filter(label => label.id !== id);
        
        set({
          labels: updatedLabels,
          selectedLabel: selectedLabel.id === id ? DEFAULT_LABEL : selectedLabel
        });
      },

      setSelectedLabel: (labelId) => {
        const label = get().labels.find(l => l.id === labelId);
        if (label) {
          set({ selectedLabel: label });
        }
      },

      archiveLabel: (id, archived) => {
        get().updateLabel(id, { isArchived: archived });
      },

      reorderLabels: (startIndex, endIndex) => {
        const labels = get().getActiveLabels();
        const result = Array.from(labels);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        
        const reorderedLabels = result.map((label, index) => ({
          ...label,
          orderIndex: index
        }));
        
        set((state) => ({
          labels: [
            ...reorderedLabels,
            ...state.labels.filter(l => l.isArchived)
          ]
        }));
      },

      getActiveLabels: () => {
        return get().labels
          .filter(label => !label.isArchived)
          .sort((a, b) => a.orderIndex - b.orderIndex);
      },

      getLabelColor: (colorIndex) => {
        return LABEL_COLORS[colorIndex] || LABEL_COLORS[0];
      }
    }),
    {
      name: 'goodtime-labels-store'
    }
  )
);