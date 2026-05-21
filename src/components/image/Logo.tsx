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

import {Space} from 'antd';
import {clsx} from 'clsx';

import styles from './Logo.module.css';

interface Props {
  name?: boolean;
  tagline?: boolean;
  size?: number;
}

export function Logo({name = false, tagline = false, size}: Readonly<Props>) {
  return (
    <Space orientation="vertical" align="center" className={styles['root']}>
      <img
        src="/assets/favicon/favicon.svg"
        alt="ArtistAssistApp logo"
        className={clsx(styles['image'], styles['dropShadowLarge'])}
        width={size ?? 150}
      />

      {name && (
        <div className={clsx(styles['name'], styles['dropShadow'])}>
          <span className={clsx(styles['textOutline'], styles['artist'])}>Artist</span>
          <span className={clsx(styles['textOutline'], styles['assist'])}>Assist</span>
          <span className={clsx(styles['textOutline'], styles['app'])}>App</span>
          <span className={clsx(styles['textOutline'], styles['dotCom'])}>.com</span>
        </div>
      )}
      {tagline && (
        <div
          className={clsx(
            styles['tagline'],
            styles['textOutline'],
            styles['textOutlineBlack'],
            styles['dropShadow']
          )}
        >
          Paint better with ease
        </div>
      )}
    </Space>
  );
}
