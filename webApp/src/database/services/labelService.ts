import DatabaseManager from '../database';
import { Label } from '../../types';

export class LabelService {
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  async addLabel(labelData: Omit<Label, 'id'>): Promise<Label> {
    const newLabel: Label = {
      ...labelData,
      id: crypto.randomUUID(),
    };

    this.db.insertLabel({
      id: newLabel.id,
      title: newLabel.title,
      color: newLabel.color,
      archived: newLabel.archived,
      orderIndex: newLabel.orderIndex
    });

    return newLabel;
  }

  async updateLabel(id: string, updates: Partial<Omit<Label, 'id'>>): Promise<void> {
    this.db.updateLabel(id, updates);
  }

  async deleteLabel(id: string): Promise<void> {
    this.db.deleteLabel(id);
  }

  async getAllLabels(): Promise<Label[]> {
    const dbLabels = this.db.getAllLabels();
    
    return dbLabels.map(label => ({
      id: label.id,
      title: label.title,
      color: label.color,
      archived: Boolean(label.archived),
      orderIndex: label.order_index
    }));
  }

  async clearLabels(): Promise<void> {
    // Get all label IDs except default
    const labels = await this.getAllLabels();
    
    // Delete each label except default
    for (const label of labels) {
      if (label.id !== 'default') {
        this.db.deleteLabel(label.id);
      }
    }
  }

  async reorderLabels(labelIds: string[]): Promise<void> {
    for (let i = 0; i < labelIds.length; i++) {
      this.db.updateLabel(labelIds[i], { orderIndex: i });
    }
  }
}

export const labelService = new LabelService();