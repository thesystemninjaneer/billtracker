import React, { useEffect, useState } from "react";
import "./Footer.css";

function Footer() {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    async function getVersion() {
      try {
        const res = await fetch("/api/version");
        const data = await res.json();
        setVersion(data.version);
      } catch (err) {
        console.error("Version fetch failed:", err);
        setVersion("N/A");
      }
    }
    getVersion();
  }, []);

  const handleContributeClick = () => {
    // ✅ For now, redirect to a donation page or external service
    window.open("https://github.com/thesystemninjaneer/billtracker", "_blank");
  };

  return (
    <footer className="app-footer">
      <div className="footer-left">
        <small>
          {version ? `App Version: ${version}` : "Loading version..."}
        </small>
      </div>

      <div className="footer-right">
        <button onClick={handleContributeClick} className="contribute-btn">
          ❤️ Contribute
        </button>
      </div>
    </footer>
  );
}

export default Footer;
