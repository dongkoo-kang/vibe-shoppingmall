function PostcodeLayer({ show, onClose }) {
  if (!show) return null;

  return (
    <div className="postcode-layer-wrap" onClick={onClose}>
      <div className="postcode-layer-content" onClick={(e) => e.stopPropagation()}>
        <span className="postcode-layer-close" onClick={onClose}>×</span>
        <div id="postcode-layer"></div>
      </div>
    </div>
  );
}

export default PostcodeLayer;

