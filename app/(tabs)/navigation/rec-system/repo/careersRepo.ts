import Raw from '../../../../../assets/data/STEM Careers.json';
import type { CareersCatalog, Career } from '../types/models';

const catalog = Raw as unknown as CareersCatalog;
const careers: Career[] = catalog.careers ?? [];

// If the node prefix in the job file differs from that in the knowledge base, you can use aliases here for compatibility.
function normalizeNodeId(id: string) {
  return id
    .replace(/^BIOLOGICAL\./, 'BIO.')
    .replace(/^CHEMICAL\./, 'CHEM.')
    .replace(/^PHYSICAL\./, 'PHYS.');
}

export const CareersRepo = {
  list(): Career[] { return careers; },
  meta: catalog.meta,
  normalizeNodeId,
};
