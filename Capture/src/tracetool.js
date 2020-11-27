/*
 * Copyright (C) 2020 Intel Corporation.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms and conditions of the GNU General Public License,
 * version 2, as published by the Free Software Foundation.
 *
 * This program is distributed in the hope it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin St - Fifth Floor, Boston, MA 02110-1301 USA.
 *
 */
import { isValidHttpUrl } from './utils.js';
import { LppNetworkTracer, LppStatus } from './nettrace.js';
import { html, LitElement, customElement, property } from "lit-element";
import { query } from 'lit-element/lib/decorators';

const isEmpty = str => str.length === 0 || !str.trim();
const parsePositiveNumber = str => {
  const num = Number(str); // empty converts to 0.
  return Number.isInteger(num) && num > 0 ? num : null;
}

function animate(element) {
  element.style.backgroundColor = "#f2f2f2";
  setTimeout(_ => element.style.backgroundColor= "#ffffff", 1000);
}

@customElement('main-view')
export class MainView extends LitElement {

  sampler = null;

  @property() isTracing = false;
  @property() progress = 0;

  @query('#network') network;
  @query('#description') description;
  @query('#clientModel') clientModel;
  @query('#clientName') clientName;
  @query('#note') note;
  @query('#dlBwTestInterval') dlBwTestInterval;
  @query('#dlBwTestDuration') dlBwTestDuration;
  @query('#dlLimitKbytes') dlLimitKbytes;
  @query('#fileUrl') fileUrl;
  @query('#tracePosition') tracePosition;
  @query('#jsonConsole') jsonConsole;
  @query('#bandwidth') bandwidth;
  @query('#position') position;
  @query('#status') status;

  _onConnectionChange() {
    const { type, effectiveType } = navigator.connection;
    this.network.innerHTML = `
      Network: ${type ? type : "unknown"}
      ${effectiveType ? `(Effective connection type: ${effectiveType})` : ''}
    `;
    animate(this.network);
  }

  firstUpdated() {
    if ('connection' in navigator) {
      this._onConnectionChange();
      navigator.connection.onchange = () => this._onConnectionChange();
    }
  }

  _onTracePositionClick() {
    if (!!this.tracePosition.checked && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(_ => {});
    }
  }

  _onStartClick() {
    const description = this.description.value;
    if (isEmpty(description)) {
      return alert('Description must not be empty!');
    }

    const interval = parsePositiveNumber(this.dlBwTestInterval.value);
    if (!interval) {
      return alert( 'interval must be positive integer!' );
    }

    const duration = parsePositiveNumber(this.dlBwTestDuration.value);
    if (!duration) {
      return alert('duration must be positive integer!');
    }

    if (duration > interval) {
      return alert('duration must be <= interval!');
    }

    const dlLimitKbytes = parsePositiveNumber(this.dlLimitKbytes.value);
    if (!dlLimitKbytes) {
      return alert('limit must be positive integer!');
    }

    const fileUrl = this.fileUrl.value.trim();
    if (isEmpty(fileUrl) || !isValidHttpUrl(fileUrl)) {
      return alert('url is invalid!');
    }

    const clientModel = this.clientModel.value;
    const clientName = this.clientName.value;
    const note = this.note.value;

    const params = {
      traceDlBw: true,
      tracePosition: !!this.tracePosition.checked,
      dlBwTestInterval: interval,
      dlBwTestDuration: duration,
      dlLimitKbytes,
      url: fileUrl,
      clientModel: !isEmpty(clientModel) ? clientModel : undefined,
      clientName: !isEmpty(clientName) ? clientName : undefined,
      note: !isEmpty(note) ? note : undefined,
    };

    this.jsonConsole.value = '';
    this.isTracing = true;

    this.bandwidth.innerText = '';
    this.position.innerText = '';
    this.status.innerText = 'running...';

    this.lppStart(description, params);
    this.progress = 0;
  }

  _onStopClick() {
    this.isTracing = false;

    this.sampler?.stop();

    this.status.innerText = 'stopped';
    animate(this.status);

    this.jsonConsole.value = this.sampler?.toJSON();
  }

  _onPauseClick() {
    if (this.sampler !== null) {
      if (this.sampler.getStatus() === LppStatus.STARTED ) {
        this.sampler.stop();
        this.status.innerText = "paused";
        animate(this.status);
      } else if (this.sampler.getStatus() === LppStatus.STOPPED ) {
        this.status.innerText = "running...";
        this.sampler.start();
        this.animate(status);
      }
    }
  }

  _onCopyClick() {
    this.jsonConsole.select();
    this.jsonConsole.setSelectionRange(0, this.jsonConsole.value.length);
    document.execCommand("copy");
    this.jsonConsole.setSelectionRange( 0, 0 );
    this.jsonConsole.disabled = true;
    alert('JSON copied to clipboard' );
    this.jsonConsole.disabled = false;
  }

  lppStart(description, params) {
    params.onDlBwProgress = percentage => this.progress = percentage;
    this.sampler = new LppNetworkTracer(1, description, params);

    this.sampler.setDlBwResultHdlr(() => {
      this.status.innerText = 'running...';
      animate(this.status);

      const bw = this.sampler.getDlBw();
      if (bw) {
        this.progress = 100;
        this.bandwidth.innerText = `${bw} kbps`;
        animate(this.bandwidth);
      }

      const pos = this.sampler.getPosition();

      this.position.innerHTML = pos ? `
        - latitude: ${pos.getLatitude()}<br>
        - longitude: ${pos.getLongitude()}<br>
        - accuracy: ${pos.getAccuracy()}
      ` : `Position: ${this.sampler.getPositionError()}`;

      animate(this.position);
    });

    this.sampler.setErrorHdlr(() => {
      const err = this.sampler.getError();
      if ( err !== null ) {
          while ( status.firstChild ) {
              status.removeChild( status.firstChild );
          }
          status.appendChild( document.createTextNode(
              'Error: ' + err ) );
          animate( status );
      }
      const bw = this.sampler.getDlBw();
      if (bw !== null) {
        this.progress = bw === 0 ? 0 : 100;
        this.bandwidth.innerText = `${bw} kbps`;
        animate(this.bandwidth);
      }

      const pos = this.sampler.getPosition();

      this.position.innerHTML = pos ? `
        - latitude: ${pos.getLatitude()}<br>
        - longitude: ${pos.getLongitude()}<br>
        - accuracy: ${pos.getAccuracy()}
      ` : `Position: ${this.sampler.getPositionError()}`;

      animate(this.position);
    });

    this.sampler.start();
  }

  render() {
    return html`
      <h1>Network Capture Tool</h1>

      <label for="description">Description:</label>
      <div class="tooltip">
        <input type="text" id="description" ?disabled=${this.isTracing}
          name="description" maxlength="256" size="30" value="Trip from A to B">
        <span class="tooltiptext">Enter trace description</span>
      </div>

      <br><br>

      <label for="clientModel">Client model:</label>
      <div class="tooltip">
        <input type="text" id="clientModel" ?disabled=${this.isTracing}
          name="clientModel" maxlength="128" size="10">
        <span class="tooltiptext">Enter client model, e.g. SM-G390</span>
      </div>

      <br><br>

      <label for="clientName">Client name:</label>
      <div class="tooltip">
        <input type="text" id="clientName" ?disabled=${this.isTracing}
          name="clientName" maxlength="128" size="10">
        <span class="tooltiptext">Enter client name, e.g. Samsung Galaxy S10</span>
      </div>

      <br><br>

      <label for="note">Note:</label>
      <div class="tooltip">
        <input type="text" id="note" ?disabled=${this.isTracing}
          name="note" maxlength="512" size="30">
        <span class="tooltiptext">Enter additional description</span>
      </div>

      <br><br>

      <label for="dlBwTestInterval">DL BW test interval (sec):</label>
      <div class="tooltip">
        <input type="text" id="dlBwTestInterval" ?disabled=${this.isTracing}
          name="dlBwTestInterval" maxlength="6" size="6"
          value=10>
        <span class="tooltiptext">Enter measurement interval in seconds. Each measurement is run every interval</span>
      </div>

      <br><br>

      <label for="dlBwTestDuration">DL BW test duration (sec):</label>
      <div class="tooltip">
        <input type="text" id="dlBwTestDuration" ?disabled=${this.isTracing}
          name="dlBwTestDuration"
          maxlength="6" size="6" value=10>
        <span class="tooltiptext">Enter measurement duration. Each measurement is stopped if this time passes</span>
      </div>

      <br><br>

      <label for="dlLimitKbytes">Download limit (kbytes):
      </label>
      <div class="tooltip">
        <input type="text" id="dlLimitKbytes" ?disabled=${this.isTracing}
          name="dlLimitKbytes" maxlength="6"
          size="6" value=2048>
        <span class="tooltiptext">Enter download limit in kilobytes. Each measurement is stopped after this amount is downloaded</span>
      </div>

      <br><br>

      <label for="fileUrl">File URL:</label>
      <div class="tooltip">
        <input type="text" id="fileUrl" ?disabled=${this.isTracing}
          name="File Url" maxlength="256" size="50">
        <span class="tooltiptext">Enter file http(s) URL to download</span>
      </div>

      <br><br>

      <label for="tracePosition">Trace GPS position:</label>
      <input type="checkbox" id="tracePosition" value="tracePosition"
        ?disabled=${this.isTracing} @click=${this._onTracePositionClick}>

      <br><br>

      <button id='startButton' ?disabled=${this.isTracing} @click=${this._onStartClick}>Start</button>
      <button id='pauseButton' ?disabled=${!this.isTracing} @click=${this._onPauseClick}>${this.isTracing ? "Pause" : "Resume"}</button>
      <button id='stopButton' ?disabled=${!this.isTracing} @click=${this._onStopClick}>Stop</button>

      <br><br>

      <label for='status'>Status:</label><div id='status'></div>

      <br><br>

      <label>DL BW test progress:</label><br>
      <progress value=${this.progress} max="100"></progress> <span>${this.progress}</span>%

      <br>

      <label for='bandwidth'>Measured DL BW:</label><div id='bandwidth'></div>

      <br><br>

      <label id='network'>Network:&nbsp;unknown</label>

      <br><br>

      <label for='position'>Position:</label><div id='position'></div>

      <br><br>

      <label for="jsonConsole">JSON:</label><br><br>
      <textarea id="jsonConsole" rows="10" cols="70"></textarea>

      <br>

      <button id='copyButton' type='button' ?disabled=${this.isTracing} @click=${this._onCopyClick}>Copy</button>
    `;
  }
}