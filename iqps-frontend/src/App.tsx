import { BrowserRouter, Route, Routes } from "react-router-dom";
import SearchPage from "./pages/SearchPage";
import UploadPage from "./pages/UploadPage";
import OAuthPage from "./pages/OAuthPage";
import AdminDashboard from "./pages/AdminDashboard";
import { Footer } from "./components/Common/Common";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<SearchPage />}
          />
          <Route
            path="/upload"
            element={<UploadPage />}
          />
          <Route
            path="/oauth"
            element={<OAuthPage />}
          />
          <Route
            path="/admin"
            element={<AdminDashboard />}
          />
        </Routes>
        <Footer />
      </BrowserRouter>
    </>
  )
}

export default App;
