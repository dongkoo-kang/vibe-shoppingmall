function FormField({ 
  id, 
  name, 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  error, 
  readOnly = false,
  ...props 
}) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={error ? 'error' : ''}
        {...props}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

export default FormField;

