function TermsLayer({ show, title, content, onClose }) {
  if (!show) return null;

  return (
    <div className="terms-layer-wrap" onClick={onClose}>
      <div className="terms-layer-content" onClick={(e) => e.stopPropagation()}>
        <div className="terms-layer-header">
          <h2>{title}</h2>
          <span className="terms-layer-close" onClick={onClose}>×</span>
        </div>
        <div className="terms-layer-body">
          <p>{content}</p>
        </div>
      </div>
    </div>
  );
}

export default TermsLayer;

