import React, { useCallback, useRef } from 'react';

interface ColumnResizerProps {
  columnField: string;
  onResize: (field: string, delta: number) => void;
}

const ColumnResizer: React.FC<ColumnResizerProps> = ({ columnField, onResize }) => {
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startXRef.current = e.clientX;
      isDraggingRef.current = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const delta = moveEvent.clientX - startXRef.current;
        startXRef.current = moveEvent.clientX;
        onResize(columnField, delta);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [columnField, onResize]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      tabIndex={-1}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        cursor: 'col-resize',
        zIndex: 1,
        background: 'transparent',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--cds-border-strong)';
      }}
      onMouseLeave={(e) => {
        if (!isDraggingRef.current) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    />
  );
};

export default ColumnResizer;
