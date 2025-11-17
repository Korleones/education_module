import Raw from '../../../../assets/data/STEM Careers.json';
import type { CareersCatalog, Career } from '../types/models';

const catalog = Raw as unknown as CareersCatalog;
const careers: Career[] = catalog.careers ?? [];

// 若职业文件里 node 前缀和知识库不同，可在这里做别名兼容
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
