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
import { html, css, LitElement, customElement, property } from "lit-element";
import { query } from 'lit-element/lib/decorators';
import "@material/mwc-button";
import "@material/mwc-textfield";
import "@material/mwc-formfield";
import "@material/mwc-switch";
import "@material/mwc-linear-progress";

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

  static styles = css`
    mwc-textfield {
      width: 100%;
      max-width: 600px;
    }

    .vertical {
      display: flex;
      flex-direction: column;
      gap: 1em;
    }

    .buttons {
      display: flex;
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    pre {
      padding: 1em;
      margin: .5em 0;
      border: 0;
      border-radius: 0.3em;
      min-height: 180px;
      max-width: auto;
      overflow: auto;
      line-height: inherit;
      word-wrap: normal;
      background-color: #2b354f;
      color: white;
    }

    mwc-linear-progress {
      padding: 16px 0 0 0;
    }

    .inline-label {
      margin: 1em 0;
    }
  `;

  sampler = null;

  @property() isTracing = false;
  @property() progress = 0;

  @query('#network') network;
  @query('#effective') effective;
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
    this.network.innerHTML = type ? type : "unknown";
    this.effective.innerHTML = effectiveType ? effectiveType : "unknown";
    animate(this.network);
  }

  firstUpdated() {
    this.fileUrl.value = localStorage.getItem('lastUrl');
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
    this.status.innerText = 'Stopped';
    this.jsonConsole.innerText = this.sampler?.toJSON();
  }

  _onPauseClick() {
    if (this.sampler !== null) {
      if (this.sampler.getStatus() === LppStatus.STARTED) {
        this.sampler.stop();
        this.status.innerText = "Paused";
      } else if (this.sampler.getStatus() === LppStatus.STOPPED) {
        this.status.innerText = "Running...";
        this.sampler.start();
      }
    }
  }

  _onCopyClick() {
    const range = document.createRange();
    range.selectNode(this.jsonConsole);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
    this.jsonConsole.disabled = false;
  }

  lppStart(description, params) {
    params.onDlBwProgress = percentage => this.progress = percentage;
    this.sampler = new LppNetworkTracer(1, description, params);

    this.sampler.setDlBwResultHdlr(() => {
      this.status.innerText = 'running...';

      const bw = this.sampler.getDlBw();
      if (bw) {
        this.progress = 100;
        this.bandwidth.innerText = bw;
        animate(this.bandwidth);
      }

      const pos = this.sampler.getPosition();
      const err = this.sampler.getPositionError();
      if (err) {
        this.status.innerText = `Error: ${err}`;
      }

      this.position.innerHTML = pos ? `
        - latitude: ${pos.getLatitude()}<br>
        - longitude: ${pos.getLongitude()}<br>
        - accuracy: ${pos.getAccuracy()}
      ` : 'unknown';

      animate(this.position);
    });

    this.sampler.setErrorHdlr(() => {
      let err = this.sampler.getError();
      if (err) {
        this.status.innerText = `Error: ${err}`;
      }
      const bw = this.sampler.getDlBw();
      if (bw !== null) {
        this.progress = bw === 0 ? 0 : 100;
        this.bandwidth.innerText = bw;
        animate(this.bandwidth);
      }

      const pos = this.sampler.getPosition();
      err = this.sampler.getPositionError();
      if (err) {
        this.status.innerText = `Error: ${err}`;
      }

      this.position.innerHTML = pos ? `
        - latitude: ${pos.getLatitude()}<br>
        - longitude: ${pos.getLongitude()}<br>
        - accuracy: ${pos.getAccuracy()}
      ` : 'unknown';

      animate(this.position);
    });

    this.sampler.start();
  }

  render() {
    return html`
      <h1>Network Capture Tool</h1>

      <div class="vertical">
        <mwc-textfield id="description" ?disabled=${this.isTracing} required
          label="Description" helper="Enter trace description" value="Trip from A to B">
        </mwc-textfield>

        <mwc-textfield id="clientModel" ?disabled=${this.isTracing} maxlength="128"
          label="Client model" helper="Enter client model, e.g. SM-G390">
        </mwc-textfield>

        <mwc-textfield id="clientName" ?disabled=${this.isTracing} maxlength="128"
          label="Client name" helper="Enter client name, e.g. Samsung Galaxy S10">
        </mwc-textfield>

        <mwc-textfield id="note" ?disabled=${this.isTracing} maxlength="512"
          label="Additional information" helper="Enter additional description">
        </mwc-textfield>

        <mwc-textfield id="dlBwTestInterval" ?disabled=${this.isTracing} required
          type=number value=10 min=1 max=60
          label="Download bandwidth test interval (sec)"
          helper="Enter measurement interval in seconds. Each measurement is run every interval">
        </mwc-textfield>

        <mwc-textfield id="dlBwTestDuration" ?disabled=${this.isTracing} required
          type=number value=10 min=1 max=60
          label="Download bandwidth test max duration (sec)"
          helper="Enter measurement duration. Each measurement is stopped if this time passes">
        </mwc-textfield>

        <mwc-textfield id="dlLimitKbytes" ?disabled=${this.isTracing} required
          type=number value=2048 min=1
          label="Download limit (Kbytes)"
          helper="Enter download limit in kilobytes. Each measurement is stopped after this amount is downloaded">
        </mwc-textfield>

        <mwc-textfield id="fileUrl" ?disabled=${this.isTracing} maxlength="256" required
          label="URL resource" helper="Enter file http(s) URL to download"
          @change=${ev => localStorage.setItem('lastUrl', ev.currentTarget.value)}>
        </mwc-textfield>

        <mwc-formfield label="Trace GPS position">
          <mwc-switch id="tracePosition" ?disabled=${this.isTracing}
            @change=${this._onTracePositionClick}>
          </mwc-switch>
        </mwc-formfield>

        <div class="buttons">
          <mwc-button dense unelevated id='startButton' ?disabled=${this.isTracing} @click=${this._onStartClick}>Start</mwc-button>
          <mwc-button dense unelevated id='pauseButton' ?disabled=${!this.isTracing} @click=${this._onPauseClick}>${this.isTracing ? "Pause" : "Resume"}</mwc-button>
          <mwc-button dense unelevated id='stopButton' ?disabled=${!this.isTracing} @click=${this._onStopClick}>Stop</mwc-button>
          <div>
            <span id='status'>Stopped</span>
          </div>
        </div>
      </div>
      <div class="inline-label">
        <label for='progress'>Test progress:</label>
        <mwc-linear-progress id=progress progress=${this.progress} buffer="0"></mwc-linear-progress>
      </div>
      <div class="inline-label">
        <label for='bandwidth'>Measured download bandwidth:</label> <span id='bandwidth'>0</span> kbps
      </div>
      <div class="inline-label">
        <label for="network">Network:</label> <span id='network'>Unknown</span>
      </div>
      <div class="inline-label">
        <label for="effective">Effective type:</label> <span id='effective'>Unknown</span>
      </div>
      <div class="inline-label">
        <label for='position'>Position:</label> <div id='position'></div>
      </div>
      <div class="inline-label">
        <label for="jsonConsole">Recorded data as JSON:</label><br><br>
        <pre id="jsonConsole"></pre>
        <mwc-button dense unelevated id='copyButton' type='button' ?disabled=${this.isTracing} @click=${this._onCopyClick}>Copy</mwc-button>
      </div>
    `;
  }
}