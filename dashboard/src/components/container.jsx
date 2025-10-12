// src/components/Container.jsx  (rename file to match casing)
import "./Container.css";

function Container({ title = "Telemetry", children, icon = null }) {
  return (
    <section className="object-card" aria-label={title}>
      <div className="card">
        <header className="card-header">
          {icon && <span className="card-icon" aria-hidden="true">{icon}</span>}
          <h3 className="card-title">{title}</h3>
        </header>
        <div className="card-body">
          {children ?? <p className="card-empty">No content yet.</p>}
        </div>
      </div>
    </section>
  );
}

export default Container;
