import { useState, type FC, type ReactNode } from 'react';
import { useCloseOnOutside } from './useCloseOnOutside';

type Item = {
  label: string;
  onClick: () => void;
};

type Props = {
  items: Item[];
  icon?: 'burger';
  leading?: ReactNode;
};

const BurgerIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path d="M2 4h12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    <path d="M2 8h12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    <path d="M2 12h12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);

export const ActionsMenu: FC<Props> = (props) => {
  const { items, icon, leading } = props;
  const [open, setOpen] = useState(false);
  const ref = useCloseOnOutside(open, () => setOpen(false));

  return (
    <div className="menu" ref={ref}>
      {icon === 'burger' ? (
        <button
          type="button"
          className="toolbar-menu-button"
          aria-label="Действия"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <BurgerIcon />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen((current) => !current)}>
          Действия
        </button>
      )}
      {open && (
        <div className="menu-panel">
          {leading != null && (
            <div
              className="menu-panel-leading"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {leading}
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
