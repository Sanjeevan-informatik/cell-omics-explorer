import { TEMPLATES, type DataCategory, type DataTemplate } from '../data-catalog';
import type { DatasetRepository } from './dataset-repository';

export class BrowserStaticDatasetRepository implements DatasetRepository {
  list(category?: DataCategory): DataTemplate[] {
    return category ? TEMPLATES.filter((dataset) => dataset.category === category) : TEMPLATES;
  }

  async readText(dataset: DataTemplate): Promise<string> {
    const response = await fetch(dataset.publicPath || '/data/'+dataset.filename);
    if (!response.ok) {
      throw new Error(`Could not load ${dataset.title} (${response.status}). Try reloading the page.`);
    }
    return response.text();
  }
}

export const datasetRepository = new BrowserStaticDatasetRepository();
