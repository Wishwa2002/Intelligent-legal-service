import { useState } from "react";
import Navbar from "../../components/common/Navbar";
import {
  CaseCard,
  FilterBar,
  LegalSection,
  SearchField,
  SummaryNotice,
  UpdateCard,
  type SectionFilter,
} from "./components";
import { useDebouncedValue } from "./hooks";
import { IS_MOCK, legalIntelligenceSource } from "./source";
import { LAW_TYPES, type LegalCategory } from "./types";

const PAGE_SIZE = 6;

const LegalIntelligencePage = () => {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [filter, setFilter] = useState<SectionFilter>("all");
  const [category, setCategory] = useState<LegalCategory | "">("");

  const base = {
    search: search || undefined,
    category: category || undefined,
    pageSize: PAGE_SIZE,
  };
  const isFiltered = Boolean(search || category);
  const show = (key: Exclude<SectionFilter, "all">) =>
    filter === "all" || filter === key;

  return (
    <div>
      <Navbar />
       <main className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Navbar />
        <header className="max-w-3xl">
          <span className="font-mono text-xs uppercase tracking-widest text-gold-dark">
            Legal Intelligence
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold text-navy-900 sm:text-4xl">
            <span aria-hidden="true">⚖️ </span>Sri Lanka Legal Intelligence
          </h1>
          <p className="mt-4 text-slate-soft">
            Stay informed about new laws, court decisions, and important legal
            developments in Sri Lanka.
          </p>
        </header>

        {IS_MOCK && (
          <p className="mt-6 rounded-lg border border-gold bg-gold/10 px-4 py-2 text-sm text-navy-900">
            Development mode: showing placeholder data, not real legal information.
          </p>
        )}

        <div className="mt-10 flex flex-col gap-5">
          <SearchField value={searchInput} onChange={setSearchInput} />
          <FilterBar
            filter={filter}
            onFilter={setFilter}
            category={category}
            onCategory={setCategory}
          />
          <SummaryNotice />
        </div>

        {show("laws") && (
          <LegalSection
            icon="📜"
            title="New Laws & Legislation"
            fetchPage={legalIntelligenceSource.listUpdates}
            query={{ ...base, types: [...LAW_TYPES] }}
            isFiltered={isFiltered}
            emptyMessage="New Acts, Bills, amendments and regulations will appear here."
            renderItem={(item) => <UpdateCard item={item} />}
          />
        )}

        {show("cases") && (
          <LegalSection
            icon="⚖️"
            title="Court Cases"
            fetchPage={legalIntelligenceSource.listCases}
            query={base}
            isFiltered={isFiltered}
            emptyMessage="Recent judgments and court decisions will appear here."
            renderItem={(item) => <CaseCard item={item} />}
          />
        )}

        {show("updates") && (
          <LegalSection
            icon="📰"
            title="Legal Updates"
            fetchPage={legalIntelligenceSource.listUpdates}
            query={{ ...base, types: ["Development"] }}
            isFiltered={isFiltered}
            emptyMessage="Important legal developments will appear here."
            renderItem={(item) => <UpdateCard item={item} />}
          />
        )}
      </div>
    </main>

    </div>
   
  );
};

export default LegalIntelligencePage;
