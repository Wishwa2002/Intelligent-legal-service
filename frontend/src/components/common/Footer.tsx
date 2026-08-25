import { Link } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-navy-950 text-navy-100/70">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/src/assets/logo.png"
                alt="LegalEase logo"
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="font-display text-lg font-semibold text-white">
                LegalEase
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              Connecting customers with verified lawyers through smart
              scheduling and AI-powered legal assistance.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-gold-light">
              Navigate
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="#home" className="transition-colors hover:text-white">Home</a></li>
              <li><a href="#services" className="transition-colors hover:text-white">Services</a></li>
              <li><a href="#about" className="transition-colors hover:text-white">About</a></li>
              <li><a href="#contact" className="transition-colors hover:text-white">Contact</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-gold-light">
              Contact
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>hello@legalease.com</li>
              <li>+94 11 234 5678</li>
              <li>Colombo, Sri Lanka</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs md:flex-row">
          <p>&copy; {year} LegalEase. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-white">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-white">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
