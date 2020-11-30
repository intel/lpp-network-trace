function _decorate(decorators, factory, superClass, mixins) { var api = _getDecoratorsApi(); if (mixins) { for (var i = 0; i < mixins.length; i++) { api = mixins[i](api); } } var r = factory(function initialize(O) { api.initializeInstanceElements(O, decorated.elements); }, superClass); var decorated = api.decorateClass(_coalesceClassElements(r.d.map(_createElementDescriptor)), decorators); api.initializeClassElements(r.F, decorated.elements); return api.runClassFinishers(r.F, decorated.finishers); }

function _getDecoratorsApi() { _getDecoratorsApi = function () { return api; }; var api = { elementsDefinitionOrder: [["method"], ["field"]], initializeInstanceElements: function (O, elements) { ["method", "field"].forEach(function (kind) { elements.forEach(function (element) { if (element.kind === kind && element.placement === "own") { this.defineClassElement(O, element); } }, this); }, this); }, initializeClassElements: function (F, elements) { var proto = F.prototype; ["method", "field"].forEach(function (kind) { elements.forEach(function (element) { var placement = element.placement; if (element.kind === kind && (placement === "static" || placement === "prototype")) { var receiver = placement === "static" ? F : proto; this.defineClassElement(receiver, element); } }, this); }, this); }, defineClassElement: function (receiver, element) { var descriptor = element.descriptor; if (element.kind === "field") { var initializer = element.initializer; descriptor = { enumerable: descriptor.enumerable, writable: descriptor.writable, configurable: descriptor.configurable, value: initializer === void 0 ? void 0 : initializer.call(receiver) }; } Object.defineProperty(receiver, element.key, descriptor); }, decorateClass: function (elements, decorators) { var newElements = []; var finishers = []; var placements = { static: [], prototype: [], own: [] }; elements.forEach(function (element) { this.addElementPlacement(element, placements); }, this); elements.forEach(function (element) { if (!_hasDecorators(element)) return newElements.push(element); var elementFinishersExtras = this.decorateElement(element, placements); newElements.push(elementFinishersExtras.element); newElements.push.apply(newElements, elementFinishersExtras.extras); finishers.push.apply(finishers, elementFinishersExtras.finishers); }, this); if (!decorators) { return { elements: newElements, finishers: finishers }; } var result = this.decorateConstructor(newElements, decorators); finishers.push.apply(finishers, result.finishers); result.finishers = finishers; return result; }, addElementPlacement: function (element, placements, silent) { var keys = placements[element.placement]; if (!silent && keys.indexOf(element.key) !== -1) { throw new TypeError("Duplicated element (" + element.key + ")"); } keys.push(element.key); }, decorateElement: function (element, placements) { var extras = []; var finishers = []; for (var decorators = element.decorators, i = decorators.length - 1; i >= 0; i--) { var keys = placements[element.placement]; keys.splice(keys.indexOf(element.key), 1); var elementObject = this.fromElementDescriptor(element); var elementFinisherExtras = this.toElementFinisherExtras((0, decorators[i])(elementObject) || elementObject); element = elementFinisherExtras.element; this.addElementPlacement(element, placements); if (elementFinisherExtras.finisher) { finishers.push(elementFinisherExtras.finisher); } var newExtras = elementFinisherExtras.extras; if (newExtras) { for (var j = 0; j < newExtras.length; j++) { this.addElementPlacement(newExtras[j], placements); } extras.push.apply(extras, newExtras); } } return { element: element, finishers: finishers, extras: extras }; }, decorateConstructor: function (elements, decorators) { var finishers = []; for (var i = decorators.length - 1; i >= 0; i--) { var obj = this.fromClassDescriptor(elements); var elementsAndFinisher = this.toClassDescriptor((0, decorators[i])(obj) || obj); if (elementsAndFinisher.finisher !== undefined) { finishers.push(elementsAndFinisher.finisher); } if (elementsAndFinisher.elements !== undefined) { elements = elementsAndFinisher.elements; for (var j = 0; j < elements.length - 1; j++) { for (var k = j + 1; k < elements.length; k++) { if (elements[j].key === elements[k].key && elements[j].placement === elements[k].placement) { throw new TypeError("Duplicated element (" + elements[j].key + ")"); } } } } } return { elements: elements, finishers: finishers }; }, fromElementDescriptor: function (element) { var obj = { kind: element.kind, key: element.key, placement: element.placement, descriptor: element.descriptor }; var desc = { value: "Descriptor", configurable: true }; Object.defineProperty(obj, Symbol.toStringTag, desc); if (element.kind === "field") obj.initializer = element.initializer; return obj; }, toElementDescriptors: function (elementObjects) { if (elementObjects === undefined) return; return _toArray(elementObjects).map(function (elementObject) { var element = this.toElementDescriptor(elementObject); this.disallowProperty(elementObject, "finisher", "An element descriptor"); this.disallowProperty(elementObject, "extras", "An element descriptor"); return element; }, this); }, toElementDescriptor: function (elementObject) { var kind = String(elementObject.kind); if (kind !== "method" && kind !== "field") { throw new TypeError('An element descriptor\'s .kind property must be either "method" or' + ' "field", but a decorator created an element descriptor with' + ' .kind "' + kind + '"'); } var key = _toPropertyKey(elementObject.key); var placement = String(elementObject.placement); if (placement !== "static" && placement !== "prototype" && placement !== "own") { throw new TypeError('An element descriptor\'s .placement property must be one of "static",' + ' "prototype" or "own", but a decorator created an element descriptor' + ' with .placement "' + placement + '"'); } var descriptor = elementObject.descriptor; this.disallowProperty(elementObject, "elements", "An element descriptor"); var element = { kind: kind, key: key, placement: placement, descriptor: Object.assign({}, descriptor) }; if (kind !== "field") { this.disallowProperty(elementObject, "initializer", "A method descriptor"); } else { this.disallowProperty(descriptor, "get", "The property descriptor of a field descriptor"); this.disallowProperty(descriptor, "set", "The property descriptor of a field descriptor"); this.disallowProperty(descriptor, "value", "The property descriptor of a field descriptor"); element.initializer = elementObject.initializer; } return element; }, toElementFinisherExtras: function (elementObject) { var element = this.toElementDescriptor(elementObject); var finisher = _optionalCallableProperty(elementObject, "finisher"); var extras = this.toElementDescriptors(elementObject.extras); return { element: element, finisher: finisher, extras: extras }; }, fromClassDescriptor: function (elements) { var obj = { kind: "class", elements: elements.map(this.fromElementDescriptor, this) }; var desc = { value: "Descriptor", configurable: true }; Object.defineProperty(obj, Symbol.toStringTag, desc); return obj; }, toClassDescriptor: function (obj) { var kind = String(obj.kind); if (kind !== "class") { throw new TypeError('A class descriptor\'s .kind property must be "class", but a decorator' + ' created a class descriptor with .kind "' + kind + '"'); } this.disallowProperty(obj, "key", "A class descriptor"); this.disallowProperty(obj, "placement", "A class descriptor"); this.disallowProperty(obj, "descriptor", "A class descriptor"); this.disallowProperty(obj, "initializer", "A class descriptor"); this.disallowProperty(obj, "extras", "A class descriptor"); var finisher = _optionalCallableProperty(obj, "finisher"); var elements = this.toElementDescriptors(obj.elements); return { elements: elements, finisher: finisher }; }, runClassFinishers: function (constructor, finishers) { for (var i = 0; i < finishers.length; i++) { var newConstructor = (0, finishers[i])(constructor); if (newConstructor !== undefined) { if (typeof newConstructor !== "function") { throw new TypeError("Finishers must return a constructor."); } constructor = newConstructor; } } return constructor; }, disallowProperty: function (obj, name, objectType) { if (obj[name] !== undefined) { throw new TypeError(objectType + " can't have a ." + name + " property."); } } }; return api; }

function _createElementDescriptor(def) { var key = _toPropertyKey(def.key); var descriptor; if (def.kind === "method") { descriptor = { value: def.value, writable: true, configurable: true, enumerable: false }; } else if (def.kind === "get") { descriptor = { get: def.value, configurable: true, enumerable: false }; } else if (def.kind === "set") { descriptor = { set: def.value, configurable: true, enumerable: false }; } else if (def.kind === "field") { descriptor = { configurable: true, writable: true, enumerable: true }; } var element = { kind: def.kind === "field" ? "field" : "method", key: key, placement: def.static ? "static" : def.kind === "field" ? "own" : "prototype", descriptor: descriptor }; if (def.decorators) element.decorators = def.decorators; if (def.kind === "field") element.initializer = def.value; return element; }

function _coalesceGetterSetter(element, other) { if (element.descriptor.get !== undefined) { other.descriptor.get = element.descriptor.get; } else { other.descriptor.set = element.descriptor.set; } }

function _coalesceClassElements(elements) { var newElements = []; var isSameElement = function (other) { return other.kind === "method" && other.key === element.key && other.placement === element.placement; }; for (var i = 0; i < elements.length; i++) { var element = elements[i]; var other; if (element.kind === "method" && (other = newElements.find(isSameElement))) { if (_isDataDescriptor(element.descriptor) || _isDataDescriptor(other.descriptor)) { if (_hasDecorators(element) || _hasDecorators(other)) { throw new ReferenceError("Duplicated methods (" + element.key + ") can't be decorated."); } other.descriptor = element.descriptor; } else { if (_hasDecorators(element)) { if (_hasDecorators(other)) { throw new ReferenceError("Decorators can't be placed on different accessors with for " + "the same property (" + element.key + ")."); } other.decorators = element.decorators; } _coalesceGetterSetter(element, other); } } else { newElements.push(element); } } return newElements; }

function _hasDecorators(element) { return element.decorators && element.decorators.length; }

function _isDataDescriptor(desc) { return desc !== undefined && !(desc.value === undefined && desc.writable === undefined); }

function _optionalCallableProperty(obj, name) { var value = obj[name]; if (value !== undefined && typeof value !== "function") { throw new TypeError("Expected '" + name + "' to be a function"); } return value; }

function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }

function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

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
import { html, css, LitElement, customElement, property } from "../web_modules/lit-element.js";
import { query } from '../web_modules/lit-element/lib/decorators.js';
import "../web_modules/@material/mwc-button.js";
import "../web_modules/@material/mwc-textfield.js";
import "../web_modules/@material/mwc-formfield.js";
import "../web_modules/@material/mwc-switch.js";
import "../web_modules/@material/mwc-linear-progress.js";

const isEmpty = str => str.length === 0 || !str.trim();

const parsePositiveNumber = str => {
  const num = Number(str); // empty converts to 0.

  return Number.isInteger(num) && num > 0 ? num : null;
};

function animate(element) {
  element.style.backgroundColor = "#f2f2f2";
  setTimeout(_ => element.style.backgroundColor = "#ffffff", 1000);
}

export let MainView = _decorate([customElement('main-view')], function (_initialize, _LitElement) {
  class MainView extends _LitElement {
    constructor(...args) {
      super(...args);

      _initialize(this);
    }

  }

  return {
    F: MainView,
    d: [{
      kind: "field",
      static: true,
      key: "styles",

      value() {
        return css`
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
      }

    }, {
      kind: "field",
      key: "sampler",

      value() {
        return null;
      }

    }, {
      kind: "field",
      decorators: [property()],
      key: "isTracing",

      value() {
        return false;
      }

    }, {
      kind: "field",
      decorators: [property()],
      key: "progress",

      value() {
        return 0;
      }

    }, {
      kind: "field",
      decorators: [query('#network')],
      key: "network",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#effective')],
      key: "effective",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#description')],
      key: "description",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#clientModel')],
      key: "clientModel",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#clientName')],
      key: "clientName",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#note')],
      key: "note",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#dlBwTestInterval')],
      key: "dlBwTestInterval",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#dlBwTestDuration')],
      key: "dlBwTestDuration",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#dlLimitKbytes')],
      key: "dlLimitKbytes",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#fileUrl')],
      key: "fileUrl",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#tracePosition')],
      key: "tracePosition",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#jsonConsole')],
      key: "jsonConsole",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#bandwidth')],
      key: "bandwidth",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#position')],
      key: "position",
      value: void 0
    }, {
      kind: "field",
      decorators: [query('#status')],
      key: "status",
      value: void 0
    }, {
      kind: "method",
      key: "_onConnectionChange",
      value: function _onConnectionChange() {
        const {
          type,
          effectiveType
        } = navigator.connection;
        this.network.innerHTML = type ? type : "unknown";
        this.effective.innerHTML = effectiveType ? effectiveType : "unknown";
        animate(this.network);
      }
    }, {
      kind: "method",
      key: "firstUpdated",
      value: function firstUpdated() {
        this.fileUrl.value = localStorage.getItem('lastUrl');

        if ('connection' in navigator) {
          this._onConnectionChange();

          navigator.connection.onchange = () => this._onConnectionChange();
        }
      }
    }, {
      kind: "method",
      key: "_onTracePositionClick",
      value: function _onTracePositionClick() {
        if (!!this.tracePosition.checked && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(_ => {});
        }
      }
    }, {
      kind: "method",
      key: "_onStartClick",
      value: function _onStartClick() {
        const description = this.description.value;

        if (isEmpty(description)) {
          return alert('Description must not be empty!');
        }

        const interval = parsePositiveNumber(this.dlBwTestInterval.value);

        if (!interval) {
          return alert('interval must be positive integer!');
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
          note: !isEmpty(note) ? note : undefined
        };
        this.jsonConsole.value = '';
        this.isTracing = true;
        this.bandwidth.innerText = '';
        this.position.innerText = '';
        this.status.innerText = 'running...';
        this.lppStart(description, params);
        this.progress = 0;
      }
    }, {
      kind: "method",
      key: "_onStopClick",
      value: function _onStopClick() {
        this.isTracing = false;
        this.sampler?.stop();
        this.status.innerText = 'Stopped';
        this.jsonConsole.innerText = this.sampler?.toJSON();
      }
    }, {
      kind: "method",
      key: "_onPauseClick",
      value: function _onPauseClick() {
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
    }, {
      kind: "method",
      key: "_onCopyClick",
      value: function _onCopyClick() {
        const range = document.createRange();
        range.selectNode(this.jsonConsole);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand("copy");
        window.getSelection().removeAllRanges();
        this.jsonConsole.disabled = false;
      }
    }, {
      kind: "method",
      key: "lppStart",
      value: function lppStart(description, params) {
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
    }, {
      kind: "method",
      key: "render",
      value: function render() {
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
    }]
  };
}, LitElement);