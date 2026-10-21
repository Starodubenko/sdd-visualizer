import type { FC } from 'react';

type Props = {
  kind: 'ok' | 'bad';
  message: string;
};

export const Toast: FC<Props> = (props) => {
  const { kind, message } = props;
  return (
    <div className={`toast toast-${kind}`} role="status">
      {message}
    </div>
  );
};
