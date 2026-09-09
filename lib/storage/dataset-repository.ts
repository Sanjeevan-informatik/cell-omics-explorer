import type { DataCategory, DataTemplate } from '../data-catalog';

/**
 * Storage boundary for biological datasets.
 *
 * Today the implementation reads generated static browser URLs. A future
 * implementation can resolve the same catalog IDs from S3/MinIO, object
 * storage, a lakehouse table, or a database without changing omics views.
 */
export interface DatasetRepository {
  list(category?: DataCategory): DataTemplate[];
  readText(dataset: DataTemplate): Promise<string>;
}
