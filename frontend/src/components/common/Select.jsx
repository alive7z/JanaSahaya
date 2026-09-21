import { clsx } from '../../utils/formatters';

export function Select({ label, options = [], placeholder = 'Select…', className, id, ...props }) {
  return (
    <label className={clsx('block', className)} htmlFor={id}>
      {label && <span className="label">{label}</span>}
      <select id={id} className="input" {...props}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={typeof o === 'object' ? o.value : o} value={typeof o === 'object' ? o.value : o}>
            {typeof o === 'object' ? o.label : o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default Select;