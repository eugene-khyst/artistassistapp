/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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
import {Select} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {useAuth} from '~/src/hooks/useAuth';
import type {User} from '~/src/services/auth/types';
import {
  compareOnnxModelsByFreeTierAndPriority,
  compareOnnxModelsByPriority,
} from '~/src/services/ml/models';
import type {OnnxModel} from '~/src/services/ml/types';

function getOnnxModelOptions(
  user: User | null,
  models?: Map<string, OnnxModel>
): SelectOptionType[] {
  if (!models?.size) {
    return [];
  }
  return [...models.values()]
    .sort(!user ? compareOnnxModelsByFreeTierAndPriority : compareOnnxModelsByPriority)
    .map(({id, name, freeTier = false}) => ({
      value: id,
      label: name,
      disabled: !freeTier && !user,
    }));
}

type Props = SelectProps & {
  models?: Map<string, OnnxModel>;
};

export const OnnxModelSelect: React.FC<Props> = ({models, ...rest}: Props) => {
  const {user} = useAuth();
  const options = getOnnxModelOptions(user, models);
  return <Select options={options} {...rest} />;
};
