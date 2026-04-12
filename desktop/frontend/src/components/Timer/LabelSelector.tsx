import { useAppStore } from "../../stores/appStore";
import { SetActiveLabel } from "../../wailsjs/go/main/App";
import { LABEL_COLORS } from "../../types";

interface Props {
  activeLabel: string;
}

export function LabelSelector({ activeLabel }: Props) {
  const labels = useAppStore((s) => s.labels);
  const setSettings = useAppStore((s) => s.setSettings);
  const settings = useAppStore((s) => s.settings);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const name = e.target.value;
    SetActiveLabel(name).catch(console.error);
    if (settings) {
      setSettings({ ...settings, activeLabelName: name });
    }
  }

  const activeLabelObj = labels.find((l) => l.name === activeLabel);
  const dotColor = activeLabelObj ? LABEL_COLORS[activeLabelObj.colorIndex] : "#9E9E9E";

  return (
    <div className="flex items-center gap-2">
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <select
        value={activeLabel}
        onChange={handleChange}
        className="bg-transparent text-gray-300 text-sm border-none outline-none cursor-pointer
                   hover:text-white transition-colors"
      >
        {labels.map((l) => (
          <option key={l.name} value={l.name} className="bg-surface-800 text-white">
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}
