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

import {MergeCellsOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Checkbox, Drawer, Flex, Space, Typography} from 'antd';
import {useState} from 'react';

import {ColorSetName} from '~/src/components/color-set/ColorSetName';
import {colorSetDefinitionToBrandColorCounts} from '~/src/services/color/colors';
import type {ColorBrandDefinition, ColorSetDefinition} from '~/src/services/color/types';
import {byDate, reverseOrder} from '~/src/utils/comparator';

interface Props {
  open: boolean;
  onClose: () => void;
  colorSets: ColorSetDefinition[];
  brands?: Map<number, ColorBrandDefinition>;
  onMerge: (selected: ColorSetDefinition[]) => void;
}

export const MergeColorSetsDrawer: React.FC<Props> = ({
  open,
  onClose,
  colorSets,
  brands,
  onMerge,
}: Props) => {
  const {t} = useLingui();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const sortedColorSets = colorSets
    .slice()
    .sort(reverseOrder(byDate(({date}) => date)))
    .filter((colorSet): colorSet is ColorSetDefinition & {id: number} => !!colorSet.id);

  const handleClose = () => {
    setSelectedIds([]);
    onClose();
  };

  const handleMergeClick = () => {
    const selected = sortedColorSets.filter(({id}) => selectedIds.includes(id));
    setSelectedIds([]);
    onMerge(selected);
  };

  return (
    <Drawer
      title={t`Merge color sets`}
      placement="right"
      size="default"
      open={open}
      onClose={handleClose}
    >
      <Flex vertical gap="middle">
        <Typography.Text>
          <Trans>
            Select the color sets you want to merge. A new color set will be created that includes
            all the colors from the selected sets.
          </Trans>
        </Typography.Text>

        <Checkbox.Group
          value={selectedIds}
          onChange={values => {
            setSelectedIds(values);
          }}
          style={{width: '100%'}}
        >
          <Space orientation="vertical" size="small" style={{width: '100%'}}>
            {sortedColorSets.map(colorSet => {
              const brandColorCounts = colorSetDefinitionToBrandColorCounts(colorSet, brands);
              return (
                <Checkbox key={colorSet.id} value={colorSet.id}>
                  {colorSet.name || <ColorSetName brandColorCounts={brandColorCounts} />}
                </Checkbox>
              );
            })}
          </Space>
        </Checkbox.Group>

        <Space wrap>
          <Button
            type="primary"
            icon={<MergeCellsOutlined />}
            disabled={selectedIds.length < 2}
            onClick={handleMergeClick}
          >
            <Trans>Merge</Trans>
          </Button>
          <Button onClick={handleClose}>
            <Trans>Cancel</Trans>
          </Button>
        </Space>
      </Flex>
    </Drawer>
  );
};
