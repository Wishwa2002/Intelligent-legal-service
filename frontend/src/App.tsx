import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { StaffLoginPage } from "./pages/StaffLoginPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<StaffLoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;