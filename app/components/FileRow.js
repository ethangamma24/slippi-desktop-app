import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Table, Button, Modal, Form } from 'semantic-ui-react';
import { stages as stageUtils } from 'slp-parser-js';

import styles from './FileLoader.scss';
import SpacedGroup from './common/SpacedGroup';
import PlayerChiclet from './common/PlayerChiclet';
import * as timeUtils from '../utils/time';

const path = require('path');
const fs = require('fs');
const electronSettings = require('electron-settings');

export default class FileRow extends Component {
  
  static propTypes = {
    file: PropTypes.object.isRequired,
    playFile: PropTypes.func.isRequired,
    gameProfileLoad: PropTypes.func.isRequired,
    redrawFilename: PropTypes.func.isRequired,
    // store: PropTypes.any.isRequired,
  };
  
  state = { open: false, platform: process.platform };

  playFile = () => {
    const file = this.props.file || {};

    // Play the file
    this.props.playFile(file);
  };

  renameFile = (inputText) => {
    const file = this.props.file || {};
    const fileName = file.fileName || "";
    const rootFolder = electronSettings.get('settings.rootSlpPath');

    console.log(this.props.file.fileName);

    if (this.state.platform === "win32" && inputText !== '') { 
      fs.rename(`${rootFolder}\\${fileName}`, `${rootFolder}\\${inputText}.slp`, function(err) {
        if (err) console.log(`ERROR: ${err}`);
        if (inputText.includes('\\') || 
            inputText.includes('/') || 
            inputText.includes('?') || 
            inputText.includes('%') || 
            inputText.includes('*') || 
            inputText.includes(':') || 
            inputText.includes('|') || 
            inputText.includes('<') || 
            inputText.includes('>') || 
            inputText.includes('.')) 
        {
          this.generateFileRenameError();
        }
      });
    } else if (inputText !== '') {
      fs.rename(`${rootFolder}/${fileName}`, `${rootFolder}/${inputText}.slp`, function(err) {
        if (err) console.log(`ERROR: ${err}`);
        if (inputText.includes('\\') || 
            inputText.includes('/') || 
            inputText.includes('?') || 
            inputText.includes('%') || 
            inputText.includes('*') || 
            inputText.includes(':') || 
            inputText.includes('|') || 
            inputText.includes('<') || 
            inputText.includes('>') || 
            inputText.includes('.')) 
        {
          this.generateFileRenameError();
        }
      });
    }

    this.props.redrawFilename(inputText, fileName);
    // this.close;
    // this.props.closeModal();
    // this.handleClose();
  }

  viewStats = () => {
    const file = this.props.file || {};
    const fileGame = file.game;

    this.props.gameProfileLoad(fileGame);
  };

  generatePlayCell() {
    return (
      <Table.Cell className={styles['play-cell']} textAlign="center">
        <Button
          circular={true}
          inverted={true}
          size="tiny"
          basic={true}
          icon="play"
          onClick={this.playFile}
        />
      </Table.Cell>
    );
  }

  generateDetailsCell() {
    const metadata = [
      {
        label: 'Stage',
        content: this.getStageName(),
      },
      {
        separator: true,
      },
      {
        label: 'File',
        content: this.getFileName(),
      },
      {
        content: this.editFileName(),
      },
    ];

    const metadataDisplay = _.map(metadata, (entry, key) => {
      if (entry.separator) {
        return (
          <div key={`separator-${key}`} className={styles['separator']}>
            |
          </div>
        );
      }

      return (
        <div key={`metadata-${entry.label}`}>
          <span className={styles['label']}>{entry.label}</span>
          <span className={styles['value']}>{entry.content}</span>
        </div>
      );
    });

    return (
      <Table.Cell singleLine={true}>
        <SpacedGroup direction="vertical" size="xs">
          <SpacedGroup>{this.generateTeamElements()}</SpacedGroup>
          <SpacedGroup className={styles['metadata-display']} size="md">
            {metadataDisplay}
          </SpacedGroup>
        </SpacedGroup>
      </Table.Cell>
    );
  }

  getFileName() {
    const file = this.props.file || {};

    const fileName = file.fileName || '';
    const extension = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, extension);

    return nameWithoutExt;
  }

  getStageName() {
    const file = this.props.file || {};

    const settings = file.game.getSettings() || {};
    const stageId = settings.stageId;
    const stageName = stageUtils.getStageName(stageId) || 'Unknown';

    return stageName;
  }

  close = () => this.setState({ open: false });

  editFileName() {
    let inputText = '';
    const open = this.state.open;

    return (
      <Modal 
        open={ open }
        trigger={
          <Button
            circular={true}
            inverted={true}
            size="tiny"
            basic={true}
            icon="pencil"
            onClick={ () => { this.setState({ open: true }) } }
          /> 
      	} 
        onClose = { this.close }
      >
        <Modal.Header>Rename Playback File</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <div className="ui secondary segment">Note: You cannot use &apos;/ \ ? % * : | &quot; &gt; .&apos; in the file name, these are reserved characters. Additionally, the file name cannot be empty.</div>
            <br />
            <Form onSubmit={ (e) => { e.preventDefault(); this.renameFile(inputText); this.setState({ open: false }); }}>
              <Form.Input onChange={(e) => { inputText = e.target.value }} name="fileName" label="File Name" />
              <Form.Button content="Submit" />
            </Form>
          </Modal.Description>
        </Modal.Content>
      </Modal>
    );
  }

  generateTeamElements() {
    const file = this.props.file || {};
    const game = file.game || {};
    const settings = game.getSettings() || {};

    // If this is a teams game, group by teamId, otherwise group players individually
    const teams = _.chain(settings.players)
      .groupBy(player => (settings.isTeams ? player.teamId : player.port))
      .toArray()
      .value();

    // This is an ugly way to do this but the idea is to create spaced groups of
    // character icons when those characters are on a team and each team should
    // have an element indicating they are playing against each other in between
    const elements = [];
    teams.forEach((team, idx) => {
      // Add player chiclets for all the players on the team
      team.forEach(player => {
        elements.push(
          <PlayerChiclet
            key={`player-${player.playerIndex}`}
            game={game}
            playerIndex={player.playerIndex}
            showContainer={true}
          />
        );
      });

      // Add VS obj in between teams
      if (idx < teams.length - 1) {
        // If this is not the last team, add a "vs" element
        elements.push(
          <div className={styles['vs-element']} key={`vs-${idx}`}>
            {' '}
            vs{' '}
          </div>
        );
      }
    });

    return elements;
  }

  generateStartTimeCell() {
    const file = this.props.file || {};

    const metadata = file.game.getMetadata() || {};
    const startAt = metadata.startAt;
    const startAtDisplay = timeUtils.convertToDateAndTime(startAt) || 'Unknown';

    return <Table.Cell singleLine={true}>{startAtDisplay}</Table.Cell>;
  }

  generateOptionsCell() {
    return (
      <Table.Cell className={styles['play-cell']} textAlign="center">
        <Link to="/game" className={styles['bound-link']} replace={false}>
          <Button
            circular={true}
            inverted={true}
            size="tiny"
            basic={true}
            icon="bar chart"
            onClick={this.viewStats}
          />
        </Link>
      </Table.Cell>
    );
  }

  render() {
    return (
      <Table.Row>
        {this.generatePlayCell()}
        {this.generateDetailsCell()}
        {this.generateStartTimeCell()}
        {this.generateOptionsCell()}
      </Table.Row>
    );
  }
}
