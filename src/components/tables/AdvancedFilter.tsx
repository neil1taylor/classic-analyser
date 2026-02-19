import React, { useState, useEffect, useRef } from 'react';
import {
  NumberInput,
  DatePicker,
  DatePickerInput,
  FilterableMultiSelect,
  Checkbox,
} from '@carbon/react';
import type { ColumnDataType } from '@/types/resources';

interface NumberRangeFilterProps {
  field: string;
  onFilter: (field: string, value: string) => void;
  currentFilter: string;
}

export const NumberRangeFilter: React.FC<NumberRangeFilterProps> = ({ field, onFilter, currentFilter }) => {
  const parts = currentFilter.split('-');
  const [min, setMin] = useState(parts[0] || '');
  const [max, setMax] = useState(parts[1] || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitFilter = (newMin: string, newMax: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!newMin && !newMax) {
        onFilter(field, '');
      } else {
        onFilter(field, `${newMin}-${newMax}`);
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'flex-end' }}>
      <NumberInput
        id={`${field}-min`}
        label="Min"
        size="sm"
        hideSteppers
        value={min}
        onChange={(_e: unknown, { value }: { value: string | number }) => {
          const v = String(value ?? '');
          setMin(v);
          emitFilter(v, max);
        }}
        style={{ width: '80px' }}
      />
      <NumberInput
        id={`${field}-max`}
        label="Max"
        size="sm"
        hideSteppers
        value={max}
        onChange={(_e: unknown, { value }: { value: string | number }) => {
          const v = String(value ?? '');
          setMax(v);
          emitFilter(min, v);
        }}
        style={{ width: '80px' }}
      />
    </div>
  );
};

interface DateRangeFilterProps {
  field: string;
  onFilter: (field: string, value: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ field, onFilter }) => {
  const handleChange = (dates: Date[]) => {
    if (dates.length === 2) {
      const [start, end] = dates;
      onFilter(field, `${start.toISOString()}|${end.toISOString()}`);
    } else if (dates.length === 0) {
      onFilter(field, '');
    }
  };

  return (
    <DatePicker datePickerType="range" onChange={handleChange}>
      <DatePickerInput
        id={`${field}-start`}
        placeholder="mm/dd/yyyy"
        labelText="Start"
        size="sm"
      />
      <DatePickerInput
        id={`${field}-end`}
        placeholder="mm/dd/yyyy"
        labelText="End"
        size="sm"
      />
    </DatePicker>
  );
};

interface EnumFilterProps {
  field: string;
  options: string[];
  onFilter: (field: string, value: string) => void;
  currentFilter: string;
}

export const EnumFilter: React.FC<EnumFilterProps> = ({ field, options, onFilter, currentFilter }) => {
  const selectedItems = currentFilter ? currentFilter.split(',') : [];

  const items = options.map((opt) => ({ id: opt, text: opt }));

  return (
    <FilterableMultiSelect
      id={`${field}-enum`}
      titleText=""
      items={items}
      itemToString={(item: { id: string; text: string } | null) => item?.text ?? ''}
      initialSelectedItems={items.filter((item) => selectedItems.includes(item.id))}
      onChange={({ selectedItems: selected }: { selectedItems: Array<{ id: string; text: string }> }) => {
        const value = selected.map((s) => s.id).join(',');
        onFilter(field, value);
      }}
      size="sm"
      placeholder="Select values..."
    />
  );
};

interface BooleanFilterProps {
  field: string;
  label: string;
  onFilter: (field: string, value: string) => void;
  currentFilter: string;
}

export const BooleanFilter: React.FC<BooleanFilterProps> = ({ field, label, onFilter, currentFilter }) => {
  const checked = currentFilter === 'true';

  return (
    <Checkbox
      id={`${field}-bool`}
      labelText={label}
      checked={checked}
      onChange={(_event: React.ChangeEvent<HTMLInputElement>, { checked: isChecked }: { checked: boolean }) => {
        onFilter(field, isChecked ? 'true' : '');
      }}
    />
  );
};

interface AdvancedFilterProps {
  field: string;
  dataType: ColumnDataType;
  header: string;
  currentFilter: string;
  enumOptions?: string[];
  onFilter: (field: string, value: string) => void;
}

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  field,
  dataType,
  header,
  currentFilter,
  enumOptions,
  onFilter,
}) => {
  switch (dataType) {
    case 'number':
    case 'currency':
    case 'bytes':
      return <NumberRangeFilter field={field} onFilter={onFilter} currentFilter={currentFilter} />;
    case 'date':
      return <DateRangeFilter field={field} onFilter={onFilter} />;
    case 'boolean':
      return <BooleanFilter field={field} label={header} onFilter={onFilter} currentFilter={currentFilter} />;
    default:
      if (enumOptions && enumOptions.length > 0) {
        return <EnumFilter field={field} options={enumOptions} onFilter={onFilter} currentFilter={currentFilter} />;
      }
      return null;
  }
};

export default AdvancedFilter;
