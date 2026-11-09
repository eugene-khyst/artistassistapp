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

import {Trans} from '@lingui/react/macro';
import {Segmented, Select} from 'antd';
import type {ReactNode} from 'react';

enum ImageView {
  Original = 'original',
  Result = 'result',
}

interface ImageViewSelectorProps {
  isShowingOriginal: boolean;
  resultLabel: ReactNode;
  onChange: (isShowingOriginal: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ImageViewSelector({
  isShowingOriginal,
  resultLabel,
  onChange,
  disabled,
  compact,
}: Readonly<ImageViewSelectorProps>) {
  const options = [
    {value: ImageView.Original, label: <Trans>Original</Trans>},
    {value: ImageView.Result, label: resultLabel},
  ];
  const value = isShowingOriginal ? ImageView.Original : ImageView.Result;
  const handleChange = (view: ImageView) => {
    onChange(view === ImageView.Original);
  };

  return compact ? (
    <Select<ImageView>
      options={options}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      popupMatchSelectWidth={false}
    />
  ) : (
    <Segmented<ImageView>
      className="u-w-fit"
      options={options}
      value={value}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}
