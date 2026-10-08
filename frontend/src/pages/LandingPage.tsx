import Navbar from "../components/common/Navbar";
import HeroSection from "../components/common/HeroSection";
import AboutSection from "../components/common/AboutSection";
import OurValuesServicesSection from "../components/common/OurValuesServicesSection";
import ServicesSection from "../components/common/ServicesSection";
import HowItWorks from "../components/common/HowItWorks";
import AISection from "../components/common/AISection";
import Footer from "../components/common/Footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <OurValuesServicesSection />
        <ServicesSection />
        <HowItWorks />
        <AISection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
