import React, { useState, useEffect, useRef } from 'react';
import { TextInput } from '@carbon/react';

interface ColumnFilterProps {
  field: string;
  header: string;
  value: string;
  onChange: (field: string, value: string) => void;
}

const ColumnFilter: React.FC<ColumnFilterProps> = ({ field, header, value, onChange }) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onChange(field, newValue);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <TextInput
      id={`filter-${field}`}
      labelText=""
      hideLabel
      placeholder={`Filter ${header}...`}
      value={localValue}
      onChange={handleChange}
      size="sm"
      style={{ minWidth: '80px' }}
    />
  );
};

export default ColumnFilter;
