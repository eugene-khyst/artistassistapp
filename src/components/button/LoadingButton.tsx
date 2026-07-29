/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {Button} from 'antd';
import type {ButtonProps} from 'antd/lib';
import {type PropsWithChildren, useState} from 'react';

type Props = PropsWithChildren<
  {
    run: () => void | Promise<void>;
  } & Omit<ButtonProps, 'onClick' | 'loading'>
>;

export function LoadingButton({children, run, ...rest}: Readonly<Props>) {
  const [clicked, setClicked] = useState<boolean>(false);

  const handleClick = async () => {
    setClicked(true);
    try {
      await run();
    } finally {
      setClicked(false);
    }
  };

  return (
    <Button onClick={() => void handleClick()} loading={clicked} {...rest}>
      {children}
    </Button>
  );
}
