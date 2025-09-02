import { useEffect } from "react";
import { OAUTH_LOGIN_URL, useAuthContext } from "../utils/auth";
import { Header } from "../components/Common/Common";
import { MdLogout } from "react-icons/md";
import { Outlet } from "react-router-dom";

function AdminLayout() {
  const auth = useAuthContext();

  useEffect(() => {
    if (!auth.isAuthenticated) {
      window.location.assign(OAUTH_LOGIN_URL);
    }
  }, []);

  return auth.isAuthenticated ? (
    <div id="admin-dashboard">
      <Header
        title="Admin Dashboard"
        subtitle="Top secret documents - to be approved inside n-sided polygon shaped buildings only."
        link={{
          onClick: (e) => {
            e.preventDefault();
            auth.logout();
          },
          text: "Want to destroy the paper trail?",
          button_text: "Logout",
          icon: MdLogout,
        }}
      />

      <Outlet />
    </div>
  ) : (
    <p>You are unauthenticated. This incident will be reported.</p>
  );
}

export default AdminLayout;