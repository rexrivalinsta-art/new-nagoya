import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./components/Landing";
import AppPage from "./components/AppPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}
