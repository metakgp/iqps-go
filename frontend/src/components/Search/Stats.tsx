import { useEffect, useState } from "react";
import { makeRequest } from "../../utils/backend";
import "./stats.scss";

function StatsShowcase() {
  const [stats, setStats] = useState<{
    total_papers: number;
    total_courses: number;
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const response = await makeRequest("stats", "get");
      if (response.status === "success") {
        setStats(response.data);
      } else {
        console.error("Error loading stats:", response.message);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="stats-panel">
        Serving <span className="stat-value">{stats ? stats.total_papers : "..."}</span> question papers across <span className="stat-value">{stats ? stats.total_courses : "..."}</span> courses
    </div>
  );
}

export default StatsShowcase;
