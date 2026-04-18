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

import type {SelectProps} from 'antd';
import {Flex, Select, Typography} from 'antd';
import type {DefaultOptionType} from 'antd/es/select';
import type {ReactNode} from 'react';

import type {User} from '~/src/services/auth/types';
import {hasAccessTo} from '~/src/services/auth/utils';
import {compareOnnxModelsByPriority} from '~/src/services/ml/models';
import type {OnnxModel} from '~/src/services/ml/types';
import {useAppStore} from '~/src/stores/app-store';

interface SelectOptionType extends DefaultOptionType {
  description?: ReactNode;
}

function getOnnxModelOptions(
  user?: User | null,
  models?: Map<string, OnnxModel>
): SelectOptionType[] {
  if (!models?.size) {
    return [];
  }
  return [...models.values()]
    .sort(compareOnnxModelsByPriority({prioritizeFreeTier: !user}))
    .map(model => {
      const {id, name, description} = model;
      return {
        value: id,
        label: name,
        description,
        disabled: !hasAccessTo(user, model),
      };
    });
}

const SelectOption: React.FC<Pick<SelectOptionType, 'label' | 'description'>> = ({
  label,
  description,
}) => {
  return (
    <Flex vertical>
      {label}
      <Typography.Text type="secondary" style={{whiteSpace: 'pre-line'}}>
        {description}
      </Typography.Text>
    </Flex>
  );
};

type Props = SelectProps & {
  models?: Map<string, OnnxModel>;
};

export const OnnxModelSelect: React.FC<Props> = ({models, ...rest}: Props) => {
  const user = useAppStore(state => state.auth?.user);

  const options = getOnnxModelOptions(user, models);
  return (
    <Select<string, SelectOptionType>
      options={options}
      {...rest}
      optionRender={({data: {label, description}}) => (
        <SelectOption label={label} description={description} />
      )}
      popupMatchSelectWidth={false}
    />
  );
};
