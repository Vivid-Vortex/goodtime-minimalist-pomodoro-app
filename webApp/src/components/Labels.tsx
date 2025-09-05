import React, { useState } from 'react';
import { Plus, Edit3, Trash2, X, Check, Archive, ArchiveRestore } from 'lucide-react';
import { useLabelStore, Label, LABEL_COLORS } from '../stores/labelStore';

interface LabelsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Labels: React.FC<LabelsProps> = ({ isOpen, onClose }) => {
  const { 
    labels, 
    addLabel, 
    updateLabel, 
    deleteLabel, 
    archiveLabel, 
    getActiveLabels,
    getLabelColor 
  } = useLabelStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColorIndex, setEditColorIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColorIndex, setNewColorIndex] = useState(0);
  const [showArchived, setShowArchived] = useState(false);

  const activeLabels = getActiveLabels();
  const archivedLabels = labels.filter(l => l.archived);

  const handleStartEdit = (label: Label) => {
    setEditingId(label.id);
    setEditName(label.title);
    setEditColorIndex(label.color);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      updateLabel(editingId, {
        title: editName.trim(),
        color: editColorIndex
      });
      setEditingId(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleCreate = () => {
    if (newName.trim()) {
      addLabel({
        title: newName.trim(),
        color: newColorIndex,
        archived: false
      });
      setIsCreating(false);
      setNewName('');
      setNewColorIndex(0);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewName('');
    setNewColorIndex(0);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this label? This action cannot be undone.')) {
      deleteLabel(id);
    }
  };

  const ColorPicker: React.FC<{ 
    selectedIndex: number; 
    onSelect: (index: number) => void;
    size?: 'sm' | 'md';
  }> = ({ selectedIndex, onSelect, size = 'md' }) => (
    <div className="flex flex-wrap gap-2">
      {LABEL_COLORS.map((color, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`rounded-full border-2 transition-all ${
            selectedIndex === index 
              ? 'border-gray-800 scale-110' 
              : 'border-gray-300 hover:border-gray-500'
          } ${size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'}`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Manage Labels</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Create New Label */}
        <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Plus size={20} />
              Create New Label
            </button>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Label name"
                maxLength={32}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <ColorPicker
                  selectedIndex={newColorIndex}
                  onSelect={setNewColorIndex}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Check size={16} />
                  Create
                </button>
                <button
                  onClick={handleCancelCreate}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Active Labels */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Labels ({activeLabels.length})</h3>
            {archivedLabels.length > 0 && (
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                {showArchived ? 'Hide' : 'Show'} Archived ({archivedLabels.length})
              </button>
            )}
          </div>

          {activeLabels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: getLabelColor(label.color) }}
              />
              
              {editingId === label.id ? (
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={32}
                    className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-1">
                    <ColorPicker
                      selectedIndex={editColorIndex}
                      onSelect={setEditColorIndex}
                      size="sm"
                    />
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editName.trim()}
                    className="p-2 text-green-600 hover:bg-green-50 rounded disabled:text-gray-400 transition-colors"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 font-medium text-gray-800">
                    {label.title}
                    {label.id === 'default' && (
                      <span className="ml-2 text-xs text-gray-500">(Default)</span>
                    )}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartEdit(label)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => archiveLabel(label.id, true)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                    >
                      <Archive size={16} />
                    </button>
                    {label.id !== 'default' && (
                      <button
                        onClick={() => handleDelete(label.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Archived Labels */}
        {showArchived && archivedLabels.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-600 mb-3">
              Archived Labels ({archivedLabels.length})
            </h3>
            <div className="space-y-2">
              {archivedLabels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg opacity-60"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: getLabelColor(label.color) }}
                  />
                  <span className="flex-1 text-gray-600">{label.title}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => archiveLabel(label.id, false)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Restore"
                    >
                      <ArchiveRestore size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(label.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeLabels.length === 0 && !isCreating && (
          <div className="text-center py-8 text-gray-500">
            No labels yet. Create your first label to organize your sessions!
          </div>
        )}
      </div>
    </div>
  );
};