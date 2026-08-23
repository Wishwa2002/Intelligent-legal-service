const AboutSection = () => {
  return (
    <section id="about" className="bg-paper py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2 lg:px-10">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-gold-dark">
            About LegalEase
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-navy-900 sm:text-4xl">
            Legal support, made faster and easier
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-slate-soft">
            LegalEase connects customers with professional legal services
            through technology. Our platform combines verified lawyers,
            smart scheduling, and AI assistance to make legal support faster
            and easier.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-6">
            <div className="border-l-2 border-gold pl-4">
              <p className="font-display text-2xl font-semibold text-navy-900">Verified</p>
              <p className="text-sm text-slate-soft">Licensed legal professionals only</p>
            </div>
            <div className="border-l-2 border-gold pl-4">
              <p className="font-display text-2xl font-semibold text-navy-900">Guided</p>
              <p className="text-sm text-slate-soft">AI support at every step</p>
            </div>
          </div>
        </div>

        {/* Ledger-style visual card */}
        <div className="relative mx-auto w-full max-w-md rounded-2xl bg-navy-900 p-8 shadow-2xl">
          <div className="bg-ledger-lines absolute inset-0 rounded-2xl opacity-30" />
          <div className="relative flex items-center justify-between border-b border-white/10 pb-5">
            <span className="font-display text-lg font-semibold text-white">Case Summary</span>
            <span className="rounded-full bg-gold/15 px-3 py-1 font-mono text-[11px] text-gold-light">
              Active
            </span>
          </div>
          <div className="relative mt-6 space-y-5">
            {[
              ["Lawyer Matched", "Priya Fernando, Corporate Law"],
              ["Next Appointment", "Tue, 10:30 AM"],
              ["Documents Needed", "2 pending review"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-navy-100/60">{label}</span>
                <span className="text-sm font-medium text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
