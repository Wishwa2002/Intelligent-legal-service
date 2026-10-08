import type { LegalServiceCatalogItem } from "../../api/lawyersApi";

export function filterLegalServices(items: LegalServiceCatalogItem[], practiceArea: string, search: string) {
  const term = search.trim().toLocaleLowerCase();
  return items.filter(item =>
    (practiceArea === "" || item.category.toLocaleLowerCase() === practiceArea.toLocaleLowerCase()) &&
    (!term || [item.serviceName, item.description, item.category].some(value => value.toLocaleLowerCase().includes(term)))
  ).sort((a, b) => a.category.localeCompare(b.category) || a.serviceName.localeCompare(b.serviceName));
}
