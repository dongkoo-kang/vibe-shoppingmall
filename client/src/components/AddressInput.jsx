import FormField from './FormField';

function AddressInput({ formData, errors, onInputChange, onPostcodeSearch }) {
  return (
    <div className="form-group">
      <label>주소</label>
      <div className="address-row">
        <input
          type="text"
          id="postalCode"
          name="postalCode"
          value={formData.postalCode}
          onChange={onInputChange}
          placeholder="우편번호"
          readOnly
          className={`postal-code ${errors.postalCode ? 'error' : ''}`}
        />
        <button
          type="button"
          onClick={onPostcodeSearch}
          className="postcode-search-btn"
        >
          우편번호 찾기
        </button>
      </div>
      <input
        type="text"
        id="address1"
        name="address1"
        value={formData.address1}
        onChange={onInputChange}
        placeholder="도로명 주소를 입력해주세요"
        readOnly
        className={`address-input ${errors.address1 ? 'error' : ''}`}
      />
      <input
        type="text"
        id="address2"
        name="address2"
        value={formData.address2}
        onChange={onInputChange}
        placeholder="상세주소 (선택사항)"
        className={`address-input ${errors.address2 ? 'error' : ''}`}
      />
      {(errors.postalCode || errors.address1 || errors.address2) && (
        <span className="error-message">
          {errors.postalCode || errors.address1 || errors.address2}
        </span>
      )}
    </div>
  );
}

export default AddressInput;

