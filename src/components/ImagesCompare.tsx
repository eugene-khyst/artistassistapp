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

import {PrinterOutlined, QuestionCircleOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Col, Flex, Row, Space, theme, Tooltip, Typography} from 'antd';
import type {ChangeEvent, RefObject} from 'react';
import {useEffect, useRef} from 'react';
import {useReactToPrint} from 'react-to-print';

import {AdCard} from '~/src/components/ad/AdCard';
import {FileSelect} from '~/src/components/image/FileSelect';
import {ImageCard} from '~/src/components/image/ImageCard';
import type {Score} from '~/src/services/rating/rating';
import {Player} from '~/src/services/rating/rating';
import {useAppStore} from '~/src/stores/app-store';

function restartTransitionAnimation(...refs: RefObject<HTMLDivElement>[]) {
  const className = 'transition-animation';
  refs.forEach((ref: RefObject<HTMLDivElement>) => {
    const classList: DOMTokenList | undefined = ref.current?.classList;
    if (!classList) {
      return;
    }
    classList.remove(className);
    setTimeout(() => {
      classList.add(className);
    }, 1);
  });
}

export const ImagesCompare: React.FC = () => {
  const nextGame = useAppStore(state => state.nextGame);
  const unfinishedGamesSize = useAppStore(state => state.unfinishedGamesSize);
  const playersByRating = useAppStore(state => state.playersByRating);
  const addPlayer = useAppStore(state => state.addPlayer);
  const setScore = useAppStore(state => state.setScore);
  const newTournament = useAppStore(state => state.newTournament);

  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const {t} = useLingui();

  const player1Ref = useRef<HTMLDivElement>(null);
  const player2Ref = useRef<HTMLDivElement>(null);
  const photoRankingRef = useRef<HTMLButtonElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (unfinishedGamesSize === 0) {
      photoRankingRef.current?.scrollIntoView();
    }
  }, [unfinishedGamesSize]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    for (const file of e.target.files ?? []) {
      addPlayer(new Player<File>(file));
    }
  };

  const handlePlayerClick = (score: Score) => {
    setScore(score);
    restartTransitionAnimation(player1Ref, player2Ref);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'ArtistAssistApp',
  });

  const isNew: boolean = playersByRating.length === 0;
  const player1RatingText: string | undefined = nextGame?.player1.rating.toFixed(1);
  const player2RatingText: string | undefined = nextGame?.player2.rating.toFixed(1);

  return (
    <Flex vertical gap="small" style={{padding: '0 16px 16px'}}>
      <Space align="center" size={4}>
        <Typography.Text strong>
          <Trans>Select photos to rank using pairwise comparison</Trans>
        </Typography.Text>
        <Tooltip
          title={t`It can be difficult to choose between multiple photos. Comparing each photo with others in pairs simplifies the choice and helps to identify the most preferred one.`}
        >
          <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
        </Tooltip>
      </Space>

      <Space>
        <FileSelect type={isNew ? 'primary' : 'default'} multiple onChange={handleFileChange}>
          {isNew ? t`Select photos` : t`Add photos`}
        </FileSelect>
        {!isNew && (
          <Button
            onClick={() => {
              newTournament();
            }}
          >
            <Trans>New comparison</Trans>
          </Button>
        )}
      </Space>

      {nextGame && (
        <>
          <Typography.Text strong>
            <Trans>Determine the best photo by pairwise comparison</Trans>
          </Typography.Text>
          <Row gutter={16} align="middle" justify="space-evenly">
            <Col xs={12} lg={8} xl={6}>
              <ImageCard
                ref={player1Ref}
                file={nextGame.player1.data}
                description={t`Rating: ${player1RatingText}`}
                onClick={() => {
                  handlePlayerClick([1, 0]);
                }}
                hoverable
              />
            </Col>
            <Col xs={12} lg={8} xl={6}>
              <ImageCard
                ref={player2Ref}
                file={nextGame.player2.data}
                description={t`Rating: ${player2RatingText}`}
                onClick={() => {
                  handlePlayerClick([0, 1]);
                }}
                hoverable
              />
            </Col>
          </Row>
          <Typography.Text>
            <Trans>Left to compare: {unfinishedGamesSize}</Trans>
          </Typography.Text>
        </>
      )}

      {playersByRating.length > 0 && (
        <>
          <Space>
            <Typography.Text ref={photoRankingRef} strong>
              <Trans>Photo ranking</Trans>
            </Typography.Text>
            <Button
              icon={<PrinterOutlined />}
              onClick={() => {
                handlePrint();
              }}
            >
              <Trans>Print</Trans>
            </Button>
          </Space>
          <Row ref={printRef} gutter={[16, 16]} align="middle" justify="start">
            {playersByRating.map(({id, data, rating}: Player<File>, index: number) => {
              const position: number = index + 1;
              const ratingText: string = rating.toFixed(1);
              return (
                <Col key={`${id}`} xs={12} md={8} lg={6}>
                  <ImageCard
                    file={data}
                    description={
                      <Trans>
                        Position: {position}
                        <br />
                        Rating: {ratingText}
                      </Trans>
                    }
                  />
                </Col>
              );
            })}
          </Row>
        </>
      )}

      <Row justify="start">
        <Col xs={24} md={12}>
          <AdCard />
        </Col>
      </Row>
    </Flex>
  );
};
