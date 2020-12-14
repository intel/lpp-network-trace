/*
 * Copyright (C) 2020-2021 Intel Corporation.
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
import { log } from './logger.js';

import { html, css, LitElement, customElement, property } from "lit-element";
import { directive } from "lit-html";
import { styleMap } from "lit-html/directives/style-map";
import { query } from "lit-element/lib/decorators";

import "@material/mwc-button";
import "@material/mwc-icon-button";
import "@material/mwc-textfield";
import "@material/mwc-formfield";
import "@material/mwc-switch";
import "@material/mwc-linear-progress";

const isEmpty = str => str.length === 0 || !str.trim();
const parsePositiveNumber = str => {
  const num = Number(str); // empty converts to 0.
  return Number.isInteger(num) && num > 0 ? num : null;
}

const animateChange = directive(value => (part) => {
  if (part.value !== value) {
    part.setValue(value);
    part.commit();

    const parentElement = part.startNode.parentElement;

    if ('animate' in parentElement) {
      parentElement.animate({
        backgroundColor: ['lightgray', 'white']
      }, 1000);
    } else {
      parentElement.style.backgroundColor = 'lightgray';
      setTimeout(_ => {
        parentElement.style.backgroundColor = 'white';
      }, 1000);
    }
  }
});

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

    mwc-linear-progress {
      padding: 16px 0 0 0;
    }

    .inline-label {
      margin: 1em 0;
    }
  `;

  sampler = null;
  wakeLock = null;

  @property() isTracing = false;
  @property() isPaused = false;
  @property({type: Number}) progress = 0;

  @property() status = 'Stopped';
  @property() networkType = 'Unknown';
  @property() networkEffectiveType = 'Unknown';
  @property() bandwidth = 0;

  @property() longitude = 0;
  @property() latitude = 0;
  @property() accuracy = 0;

  @query('#description') descriptionRef;
  @query('#clientModel') clientModelRef;
  @query('#clientName') clientNameRef;
  @query('#note') noteRef;
  @query('#dlBwTestInterval') dlBwTestIntervalRef;
  @query('#dlBwTestDuration') dlBwTestDurationRef;
  @query('#dlLimitKbytes') dlLimitKbytesRef;
  @query('#fileUrl') fileUrlRef;
  @query('#tracePosition') tracePositionRef;
  @query('#keepScreenOn') keepScreenOnRef;
  @query('#jsonConsole') jsonConsoleRef;

  connectedCallback() {
    super.connectedCallback();
    if ('connection' in navigator) {
      navigator.connection.onchange = this._onConnectionChange.bind(this);
    }
  }

  disconnectedCallback() {
    if ('connection' in navigator) {
      navigator.connection.onchange = null;
    }
    super.disconnectedCallback();
  }

  _onConnectionChange() {
    const { type, effectiveType } = navigator.connection;
    this.networkType = type || "Unknown";
    this.networkEffectiveType = effectiveType || "Unknown";
  }

  firstUpdated() {
    if ('wakeLock' in navigator) {
      // Reacquire wake lock
      document.addEventListener('visibilitychange', async () => {
        if (this.wakeLock !== null && document.visibilityState === 'visible') {
          this.wakeLock = await this._requestWakeLock();
          this.keepScreenOnRef.checked = !!this.wakeLock;
        }
      });

      this.keepScreenOnRef.checked = localStorage.getItem('keepScreenOn') === String(true);
      this._onKeepScreenOn();
    } else {
      this.keepScreenOnRef.disabled = true;
    }

    this.fileUrlRef.value = localStorage.getItem('lastUrl') || "";
    this.tracePositionRef.checked = localStorage.getItem('inclPosition') === String(true);

    if ('connection' in navigator) {
      this._onConnectionChange();
    }
  }

  _onTracePositionClick(ev) {
    const checked = !!this.tracePositionRef.checked;
    localStorage.setItem('inclPosition', String(checked));

    if (checked && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(_ => {});
    }
  }

  async _requestWakeLock() {
    const hasLock = !!this.wakeLock;
    const wakeLock = await navigator.wakeLock.request('screen');
    if (!wakeLock) {
      return null;
    }

    console.log("Screen wakelock was", hasLock ? "re-acquired" : "acquired");

    wakeLock.onrelease = () => {
      console.log("Screen wakelock was released")
    };
    return wakeLock;
  }

  async _onKeepScreenOn() {
    const checked = !!this.keepScreenOnRef.checked;
    localStorage.setItem('keepScreenOn', String(checked));

    if (!('wakeLock' in navigator)) {
      this.keepScreenOnRef.checked = false;
    }
  }

  async _onStartClick() {
    const description = this.descriptionRef.value;
    if (isEmpty(description)) {
      return alert('Description must not be empty!');
    }

    const interval = parsePositiveNumber(this.dlBwTestIntervalRef.value);
    if (!interval) {
      return alert('interval must be positive integer!');
    }

    const duration = parsePositiveNumber(this.dlBwTestDurationRef.value);
    if (!duration) {
      return alert('duration must be positive integer!');
    }

    if (duration > interval) {
      return alert('duration must be <= interval!');
    }

    const dlLimitKbytes = parsePositiveNumber(this.dlLimitKbytesRef.value);
    if (!dlLimitKbytes) {
      return alert('limit must be positive integer!');
    }

    const fileUrl = this.fileUrlRef.value.trim();
    if (isEmpty(fileUrl) || !isValidHttpUrl(fileUrl)) {
      return alert('url is invalid!');
    }

    const clientModel = this.clientModelRef.value;
    const clientName = this.clientNameRef.value;
    const note = this.noteRef.value;

    const params = {
      traceDlBw: true,
      tracePosition: !!this.tracePositionRef.checked,
      dlBwTestInterval: interval,
      dlBwTestDuration: duration,
      dlLimitKbytes,
      url: fileUrl,
      clientModel: !isEmpty(clientModel) ? clientModel : undefined,
      clientName: !isEmpty(clientName) ? clientName : undefined,
      note: !isEmpty(note) ? note : undefined,
    };

    this.jsonConsoleRef.value = '';
    this.isTracing = true;

    this.bandwidth = 0;
    this.status = 'running...';

    this.progress = 0;

    this.lppStart(description, params);
    if (this.keepScreenOnRef.checked) {
      this.wakeLock = await this._requestWakeLock();
    }
  }

  async _onStopClick() {
    this.isTracing = false;
    this.isPaused = false;
    this.sampler?.stop();
    this.status = 'Stopped';
    this.jsonConsoleRef.value = this.sampler?.toJSON();

    await this.wakeLock?.release();
    this.wakeLock = null;
  }

  _onPauseClick() {
    if (this.sampler !== null) {
      if (this.sampler.getStatus() === LppStatus.STARTED) {
        this.sampler.stop();
        this.isPaused = true;
        this.status = "Paused";
      } else if (this.sampler.getStatus() === LppStatus.STOPPED) {
        this.status = "Running...";
        this.sampler.start();
        this.isPaused = false;
      }
    }
  }

  lppStart(description, params) {
    params.onDlBwProgress = percentage => this.progress = percentage;
    this.sampler = new LppNetworkTracer(1, description, params);

    this.sampler.setDlBwResultHdlr(() => {
      this.status = 'Running...';

      const bw = this.sampler.getDlBw();
      if (bw) {
        this.progress = 100;
        this.bandwidth = bw;
      }

      const pos = this.sampler.getPosition();
      const err = this.sampler.getPositionError();
      if (err) {
        this.status = `Error: ${err}`;
      }

      if (pos) {
        this.longitude = pos.getLongitude();
        this.latitude = pos.getLongitude();
        this.accuracy = pos.getAccuracy();
      }
    });

    this.sampler.setErrorHdlr(() => {
      let err = this.sampler.getError();
      if (err) {
        this.status = `Error: ${err}`;
      }
      const bw = this.sampler.getDlBw();
      if (bw !== null) {
        this.progress = bw === 0 ? 0 : 100;
        this.bandwidth = bw;
      }

      const pos = this.sampler.getPosition();
      err = this.sampler.getPositionError();
      if (err) {
        this.status = `Error: ${err}`;
      }

      if (pos) {
        this.longitude = pos.getLongitude();
        this.latitude = pos.getLongitude();
        this.accuracy = pos.getAccuracy();
      }
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

        <mwc-formfield label="Keep screen on while tracing">
          <mwc-switch id="keepScreenOn" ?disabled=${this.isTracing}
            @change=${this._onKeepScreenOn}>
          </mwc-switch>
        </mwc-formfield>

        <div class="buttons">
          <mwc-button dense unelevated id='startButton' ?disabled=${this.isTracing} @click=${this._onStartClick}>Start</mwc-button>
          <mwc-button dense unelevated id='pauseButton' ?disabled=${!this.isTracing} @click=${this._onPauseClick}>${this.isPaused ? "Resume" : "Pause"}</mwc-button>
          <mwc-button dense unelevated id='stopButton' ?disabled=${!this.isTracing} @click=${this._onStopClick}>Stop</mwc-button>
          <div>
            <span>${this.status}</span>
          </div>
        </div>
      </div>
      <div class="inline-label">
        <label for='progress'>Test progress:</label>
        <mwc-linear-progress id=progress progress=${this.progress/100} buffer="0"></mwc-linear-progress>
      </div>
      <div class="inline-label">
        <label for='bandwidth'>Measured download bandwidth:</label> <span>${animateChange(this.bandwidth)}</span> kbps
      </div>
      <div class="inline-label">
        <label for="network">Network:</label> <span>${animateChange(this.networkType)}</span>
      </div>
      <div class="inline-label">
        <label for="effective">Effective type:</label> <span>${animateChange(this.networkEffectiveType)}</span>
      </div>
      <div class="inline-label">
        <div>Longitude: <span>${animateChange(this.longitude)}</span></div>
        <div>Latitude:  <span>${animateChange(this.latitude)}</span></div>
        <div>Accuracy:  <span>${animateChange(this.accuracy)}</span></div>
      </div>
      <div class="inline-label">
        <label for="jsonConsole">Recorded data as JSON:</label><br><br>
        <json-view id="jsonConsole" ?disabled=${this.isTracing}></json-view>
      </div>
      <br>
    `;
  }
}

function supportDownload() {
  return "download" in document.createElement("a")
}

@customElement('json-view')
export class JsonView extends LitElement {

  static styles = css`
    pre {
      max-height: 200px;
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

    div {
      display: block;
      position: relative;
    }

    mwc-icon-button {
      overflow: unset;
      padding: 0;
      color: white;
      margin: 8px;
      padding: 0px;
      position: absolute;
      right: 0;
      top: 0;
      --mdc-theme-text-disabled-on-light: lightslategray;
    }

    #save {
      right: 52px;
    }
  `;

  @property({ type: String }) value = "";

  copy() {
    window.getSelection().removeAllRanges();
    const range = document.createRange();
    range.selectNode(this.shadowRoot.querySelector('#json'));
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
  }

  save() {
    const blob = new Blob([this.value], {type: "application/json"});
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "tracedata.json";
    anchor.click();
    window.URL.revokeObjectURL(anchor.href);
  }

  render() {
    return html`
      <div>
        <pre id="json">${this.value}</pre>
        <mwc-icon-button id="save" icon="save_alt"
            style=${styleMap({display: !supportDownload() ? 'none' : 'block'})}
            @click=${this.save} ?disabled=${!this.value.length}>
        </mwc-icon-button>
        <mwc-icon-button id="copy" icon="content_copy"
            @click=${this.copy} ?disabled=${!this.value.length}>
        </mwc-icon-button>
      </div>
    `;
  }
}
