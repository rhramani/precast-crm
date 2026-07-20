import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

const ActionsDropdown = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      
      // Calculate estimated height of the dropdown menu
      let estimatedHeight = 8; // top & bottom padding
      activeActions.forEach((act) => {
        if (act.divider) estimatedHeight += 8;
        else estimatedHeight += 38;
      });
      
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let top = rect.bottom + window.scrollY + 6;
      // If it doesn't fit below and fits better above, open upwards
      if (spaceBelow < estimatedHeight + 10 && spaceAbove > estimatedHeight + 10) {
        top = rect.top + window.scrollY - estimatedHeight - 6;
      }

      setCoords({
        top,
        left: rect.right + window.scrollX - 150, // 150px width alignment to the right of the button
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleScrollOrResize = () => {
      setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const activeActions = actions.filter(Boolean);

  if (activeActions.length === 0) return null;

  return (
    <div className="table-actions-cell" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <button 
        ref={buttonRef}
        onClick={toggleDropdown} 
        className={`btn-dots ${isOpen ? 'btn-dots--active' : ''}`}
        aria-label="Actions"
        title="Actions"
      >
        <MoreVertical size={18} />
      </button>
      
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="actions-dropdown-menu"
          style={{ 
            position: 'absolute', 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            margin: 0,
            zIndex: 99999
          }}
        >
          {activeActions.map((action, index) => {
            if (action.divider) {
              return <div key={`div-${index}`} className="actions-dropdown-divider" />;
            }
            
            // Map types to classes
            let typeClass = 'actions-dropdown-item--primary';
            if (action.type === 'success') typeClass = 'actions-dropdown-item--success';
            if (action.type === 'danger') typeClass = 'actions-dropdown-item--danger';
            if (action.type === 'info') typeClass = 'actions-dropdown-item--info';
            
            return (
              <button
                key={`act-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  action.onClick();
                }}
                className={`actions-dropdown-item ${typeClass}`}
              >
                {action.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ActionsDropdown;
