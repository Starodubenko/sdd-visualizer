import { useState, type FC } from 'react';
import { useCloseOnOutside } from './useCloseOnOutside';

type Item = {
  label: string;
  onClick: () => void;
};

type Props = {
  items: Item[];
};

export const ActionsMenu: FC<Props> = (props) => {
  const { items } = props;
  const [open, setOpen] = useState(false);
  const ref = useCloseOnOutside(open, () => setOpen(false));

  return (
    <div className="menu" ref={ref}>
      <button type="button" onClick={() => setOpen((current) => !current)}>
        Действия
      </button>
      {open && (
        <div className="menu-panel">
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
