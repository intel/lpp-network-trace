/**
@license
Copyright 2021 Intel Corporation. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/* eslint max-len: ["error", { "code": 200 }] */

let chart = {};
let mainTimer;
let time = [];
let band = [];
let lat = [];
let lon = [];
let actualPred = 0;
let mymap;
let isDebuggerDetached = false;
let isPaused = false;
let delta = 0;
let id = 0;
let currentTab = null;
let pauseTime = 0;
let counter = 0;
// Taken from Lighthouse
const DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR = 0.9;
const conditions = {
  offline: false,
  latency: 0,
  downloadThroughput: 1.6 * 1024 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
  uploadThroughput: Math.floor((750 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR * 1024) / 8) * 1024,
};

/**
 *  Set network conditions
 *
 * @param {Object} tab - Tab
 * @param {Object} BW - Bandwidth
 * @return {undefined}
 */
async function sendConditions(tab, BW) {
  assert(typeof tab !== 'undefined' && tab !== null && typeof tab === 'object', 'tab is not an object');
  assert(typeof BW !== 'undefined' && BW !== null && !isNaN(BW), 'BW is not a number');
  conditions.downloadThroughput = Math.floor((BW * 1024) / 8);
  if(BW===0) {
    BW=0.1;
  }
  try {
    const target = {
      tabId: tab.id,
    };
    await chrome.debugger.sendCommand(
        target, 'Network.emulateNetworkConditions', conditions, () => {
          if (chrome.runtime.lastError) {
            displayErrorMsg(chrome.runtime.lastError.message);
          }
        },
    );
    document.querySelector('.js_lpp_bw').innerText = ((conditions.downloadThroughput * 8) / 1024);
  } catch (e) {
    displayErrorMsg(e.message);
  }
}

/**
 *  Handler for slinder move
 *
 * @return {undefined}
 */
function sliderMove() {
  document.getElementById('demo').innerHTML = this.value;
  const sliderDelta = this.value - chart.annotation.elements.testline.options.value;
  chart.annotation.elements.testline.options.value += sliderDelta;
  let newId;

  for (newId = 0; newId < time.length - 1; newId++) {
    if (time[0].getTime() + (chart.annotation.elements.testline.options.value * 1000) < time[newId].getTime()) break;
  }
  const today = new Date();
  delta = today.getTime();
  delta = delta + time[newId].getTime() - time[0].getTime() - (chart.annotation.elements.testline.options.value * 1000);
  id = newId - 1;
  actualPred = band[id];
  if (isDebuggerDetached) {
    clearInterval(mainTimer); return;
  }

  sendConditions(currentTab, band[id]);

  for (let j = 0; j <= id; j++) {
    if ((lat[j]) && (lon[j])) {
      L.circle([lat[j], lon[j]], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 5,
      }).bindTooltip(String(j)).addTo(mymap);
    }
  }

  for (let j = id + 1; j < lat.length; j++) {
    if ((lat[j]) && (lon[j])) {
      L.circle([lat[j], lon[j]], {
        color: 'blue',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 5,
      }).bindTooltip(String(j)).addTo(mymap);
    }
  }

  id += 1;
  if (isPaused) {
	pauseTime = new Date();
	counter = new Date();
  }
}
document.getElementById('myRange').addEventListener('input', sliderMove);

/**
 *  Clear all resources and back to the initial state
 *
 * @return {undefined}
 */
function clearAll() {
  isDebuggerDetached = true; clearInterval(mainTimer); document.querySelector('.js-enable-throttling').disabled = false;
  if (mymap != null) {
    mymap.off();
    mymap.remove();
    mymap = null;
  }

  time = [];
  band = [];
  lat = [];
  lon = [];
  if (typeof chart.destroy === 'function') {
    chart.destroy();
  }
  id = 0;
  delta = 0;
  document.getElementById('myRange').hidden = true;
  document.getElementById('demo').hidden = true;
  document.querySelector('.js-cancel').disabled = true;
  document.querySelector('.js-pause').disabled = true;
  isPaused = false;
  document.querySelector('.js-pause').innerText = 'Pause';
}

chrome.debugger.onDetach.addListener(() => {
  clearAll();
});


/**
 *  Dispaly error message
 *
 * @param {String} str - str
 * @return {undefined}
 */
function displayErrorMsg(str) {
  document.querySelector('.js_lpp_prediction').style.color = 'red';
  document.querySelector('.js_lpp_prediction').innerText = str;
  console.log(str);

  if (mymap != null) {
    mymap.off();
    mymap.remove();
    mymap = null;
  }

  document.querySelector('.js-enable-throttling').disabled = false;
  clearAll();
}

/**
 * Get current tab
 *
 * @return {Object} tab
 */
function getCurrentTab() {
  const queryInfo = {
    active: true,
    currentWindow: true,
  };
  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message)); return;
      }
      resolve(tabs[0]);
    });
  });
}

/**
 *  Enables throttling
 *
 * @param {File} JsonFile - file
 * @return {undefined}
 */
async function onEnableThrottling(JsonFile) {
  isDebuggerDetached = false;
  document.querySelector('.js-enable-throttling').disabled = true;
  document.querySelector('.js-cancel').disabled = false;
  document.querySelector('.js-pause').disabled = false;
  mymap = L.map('mapid').setView([53.4624803, 14.4400124], 17);
  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(mymap);
  document.getElementById('mapid').style.border = 'thick solid #0000FF';
  const enabledAutoReloadTabs = document.querySelector('.js-reload-tabs').checked;

  try {
    currentTab = await getCurrentTab();
    const target = {
      tabId: currentTab.id,
    };

    if (currentTab.url === 'chrome://newtab/') {
      displayErrorMsg('Cannot attach to empty tab');
      return;
    }
    await chrome.debugger.attach(target, '1.1', () => {
      if (chrome.runtime.lastError) {
        displayErrorMsg(chrome.runtime.lastError.message);
        txt = "Chrome debugger couldn't attach to the tab " + currentTab.url + "\n";
        txt += "If " + currentTab.url + " is a chrome app at chrome://apps/, please, remove it from the list"
        alert(txt);
        document.querySelector('.js-enable-throttling').disabled = false;
      }
    });
    await chrome.debugger.sendCommand(
        target, 'Network.enable', () => {
          if (chrome.runtime.lastError) {
            displayErrorMsg(chrome.runtime.lastError.message);
          }
        },
    );
    const reader = new FileReader();
    // const regex = /^(?:[a-z]:)?[\/\\]{0,2}(?:[.\/\\ ](?![.\/\\\n])|[^<>:"|?*.\/\\ \n])+$/gmi;
    const regex = /^(?:[a-z]:)?[/\\]{0,2}(?:[./\\ ](?![./\\\n])|[^<>:"|?*./\\ \n])+$/gmi;
    if (regex.test(JsonFile)) {
      reader.readAsText(JsonFile);
    } else {
      return;
    }

    if (enabledAutoReloadTabs) {
      await chrome.tabs.reload(currentTab.id);
    }

    const result = await new Promise((resolve, reject) => {
      reader.onload = function(event) {
        resolve(reader.result);
      };
    });
    try {
      if (isDebuggerDetached) return;
      chart = {};
      time = [];
      lat = [];
      lon = [];
      band = [];
      const tJSON = JSON.parse(reader.result);
      if (validate(tJSON) === false) {
        displayErrorMsg(JSON.stringify(validate.errors));
        document.querySelector('.js-loopmode').checked = false;
        await chrome.debugger.detach(
            target, () => {
              if (chrome.runtime.lastError) {
                displayErrorMsg(chrome.runtime.lastError.message);
              }
            },
        );
        return;
      }
      let prevDateTime = 0;
      let prevEntryNo = 1;

      tJSON.entries.every((item, index) => {
        if (item.dateTime < prevDateTime) {
          displayErrorMsg('JSON dateTime not asc order');
          document.querySelector('.js-enable-throttling').disabled = false;
          time = [];
          band = [];
          lat = [];
          lon = [];
          return false;
        } prevDateTime = item.dateTime;
        if (item.entryNo !== prevEntryNo) {
          displayErrorMsg('JSON entryNo not asc order');
          document.querySelector('.js-enable-throttling').disabled = false;
          time = [];
          band = [];
          lat = [];
          lon = [];
          return false;
        } prevEntryNo += 1;

        time.push(new Date(item.dateTime));
        band.push(item.dlBw);
        if ((item.gpsCoordinates !== undefined) &&
                (item.gpsCoordinates.latitude !== undefined) &&
                (item.gpsCoordinates.longitude !== undefined)) {
          lat.push(item.gpsCoordinates.latitude);
          lon.push(item.gpsCoordinates.longitude);

          L.circle([item.gpsCoordinates.latitude, item.gpsCoordinates.longitude],
              {
                color: 'blue',
                fillColor: '#f03',
                fillOpacity: 0.5,
                radius: 5,
              }).bindTooltip(String(item.entryNo)).addTo(mymap);

          document.getElementById('mapid').hidden = false;
        } else if ((lat.length !== 0) && (lon.length !== 0)) {
          lon.push(lon[lon.length - 1]);
          lat.push(lat[lat.length - 1]);
        }
        return true;
      });

      if (lat.length === 0) {
        document.getElementById('mapid').hidden = true;
      }
      const ctx = document.getElementById('myChart').getContext('2d');

      const testTime = time[time.length - 1] - time[0];
      document.getElementById('myRange').max = testTime / 1000;
      document.getElementById('myRange').hidden = false;
      document.getElementById('demo').hidden = false;
      chart = new Chart(ctx, {

        type: 'line',

        data: {
          datasets: [{
            label: 'Bandwidth',
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
            lineTension: 0,
            data: [],
            fill: false,

          },
          ],
        },

        options: {
          animation: false,
          annotation: {
            annotations: [{
              id: 'testline',
              type: 'line',
              mode: 'vertical',
              scaleID: 'x-axis-0',
              value: 0,
              borderColor: 'rgb(75, 192, 192)',
              borderWidth: 4,
              label: {
                enabled: true,
              },
            },
            ],
          },
          tooltips: {
            enabled: false,
          },
          hover: {
            mode: null,
          },
          scales: {
            xAxes: [{
              type: 'linear',
              position: 'bottom',
              stacked: true,
              ticks: {
                max: testTime / 1000,
                min: 1,
                stepSize: 1,

              },
            },
            ],
          },

        },
      });
      chart.data.labels.push(0);
      chart.data.labels.push(((time[1] - time[0]) / 1000) - 1);
      for (let j = 1; j < time.length; j += 1) {
        chart.data.labels.push((time[j] - time[0]) / 1000);
        chart.data.labels.push(((time[j + 1] - time[0]) / 1000) - 1);
      }
      chart.data.datasets.forEach((dataset) => {
        dataset.data.push({
          x: 0,
          y: band[0],
        });
        dataset.data.push({
          x: ((time[1] - time[0]) / 1000) - 1,
          y: band[0],
        });
        for (let j = 1; j < band.length; j += 1) {
          dataset.data.push({
            x: ((time[j] - time[0]) / 1000),
            y: band[j],
          });
          dataset.data.push({
            x: ((time[j + 1] - time[0]) / 1000) - 1,
            y: band[j],
          });
        }
      });

      chart.update();
      clearInterval(mainTimer);
      chart.annotation.elements.testline.options.value = 0;
      if ((lat.length !== 0) && (lon.length !== 0)) mymap.setView([lat[0], lon[0]], 17);

      counter = new Date();

      pauseTime = 0;
      mainTimer = setInterval(() => {
        if (isPaused) {
          if (pauseTime === 0) pauseTime = new Date();
          return;
        }
        if (pauseTime !== 0) {
          const d = new Date();
          delta = delta + d.getTime() - pauseTime.getTime();
          counter.setTime(counter.getTime() + d.getTime() - pauseTime.getTime());
          pauseTime = 0;
        }


        let today = new Date();

        if ((delta === 0) || ((today.getTime()) > delta)) {
          if (delta === 0) {
            delta = today.getTime();
          }

          actualPred = band[id];
          if (isDebuggerDetached) {
            clearInterval(mainTimer); return;
          }
          sendConditions(currentTab, band[id]);
          if ((lat[id]) && (lon[id])) {
            L.circle([lat[id], lon[id]], {
              color: 'red',
              fillColor: '#f03',
              fillOpacity: 0.5,
              radius: 5,
            }).bindTooltip(String(id)).addTo(mymap);
          }
          delta = time[id + 1] - time[id] + delta;
          id += 1;
        }

        if ((today.getTime() - counter.getTime()) > 1000) {
          chart.annotation.elements.testline.options.value += 1;
          document.getElementById('myRange').value = chart.annotation.elements.testline.options.value;
		  if(!isNaN(document.getElementById('myRange').value))
			document.getElementById('demo').innerHTML = document.getElementById('myRange').value;
          let currentBand = band[id-1];
          let text = '';
          let predTime = [];
          let predBand = [];
          predBand.push(actualPred);
          predTime.push(0);
          text += `Time ${0} sec,  Bandwidth ${actualPred}kbps\n`;
          for (let j = id - 1; j < time.length; j += 1) {
            if ((Math.abs(band[j] - currentBand)) > (currentBand * (document.querySelector('.js_lpp_pro').value / 100))) {
              if (chart.annotation.elements.testline.options.value <= (time[j].getTime() - time[0].getTime()) / 1000) {
                const curT = ((time[j].getTime() - time[0].getTime()) / 1000) - chart.annotation.elements.testline.options.value;
                if (curT < document.querySelector('.js_lpp_time').value) {
                  if (curT < 1) {
                    text = `Time ${0} sec,  Bandwidth ${band[j]}kbps\n`;
                    predTime = [];
                    predBand = [];
                    predBand.push(band[j]);
                    predTime.push(0);
					actualPred = band[j];
                  } else {
                    today = new Date();
                    predTime.push(Math.floor((today.getTime() / 1000) + curT));
                    predBand.push(band[j]);
                    text += `Time ${curT.toFixed(2)} sec,  Bandwidth ${band[j]}kbps\n`;
                    currentBand = band[j];
                  }
                }
              }
            }
          }
          document.querySelector('.js_lpp_prediction').style.color = 'black';
          document.querySelector('.js_lpp_prediction').innerText = text;

          chrome.devtools.inspectedWindow.eval(`LPPDispatchEvent(${JSON.stringify(predTime)},${JSON.stringify(predBand)})`, {
            useContentScriptContext: true,
          });

          chart.update();
          counter.setSeconds(counter.getSeconds() + 1);
        }

        if (id > time.length - 1) {
          if (document.querySelector('.js-loopmode').checked === true) {
            chart.annotation.elements.testline.options.value = 0;
            document.getElementById('myRange').value = 0;
            document.getElementById('myRange').dispatchEvent(new Event('input'));
          } else {
            clearInterval(mainTimer);
            clearAll();
            chrome.debugger.detach(
                target, () => {
                  if (chrome.runtime.lastError) {
                    displayErrorMsg(chrome.runtime.lastError.message);
                  }
                },
            );
            return;
          }
        }
      }, 100);
    } catch (e) {
      await chrome.debugger.detach(
          target, () => {
            if (chrome.runtime.lastError) {
              displayErrorMsg(chrome.runtime.lastError.message);
            }
          },
      );
      displayErrorMsg(e.message);
    }
  } catch (e) {
    displayErrorMsg(e.message);

    if (currentTab !== null) {
      const target = {
        tabId: currentTab.id,
      };
      await chrome.debugger.detach(
          target, () => {
            if (chrome.runtime.lastError) {
              displayErrorMsg(chrome.runtime.lastError.message);
            }
          },
      );
    }
  }
}

document.querySelector('.js-enable-throttling').addEventListener('click', () => {
  onEnableThrottling(document.querySelector('.js_input_file').files[0]);
});

document.querySelector('.js-cancel').addEventListener('click', () => {
  if (currentTab !== null) {
    const target = {
      tabId: currentTab.id,
    };
    chrome.debugger.detach(
        target, () => {
          if (chrome.runtime.lastError) {
            displayErrorMsg(chrome.runtime.lastError.message);
          }
        },
    );
  }
  clearAll();
});

document.querySelector('.js-pause').addEventListener('click', () => {
  if (isPaused === true) {
    isPaused = false;
    document.querySelector('.js-pause').innerText = 'Pause';
  } else {
    isPaused = true;
    document.querySelector('.js-pause').innerText = 'Resume';
  }
});

window.onerror = function(msg, url, lineNo, columnNo, error) {
  const string = msg.toLowerCase();
  const substring = 'script error';
  if (string.indexOf(substring) > -1) {
    alert('Script Error: See Browser Console for Detail');
  } else {
    const message = [
      `Message: ${msg}`,
      `URL: ${url}`,
      `Line: ${lineNo}`,
      `Column: ${columnNo}`,
      `Error object: ${JSON.stringify(error)}`,
    ].join(' - ');

    alert(message);
  }

  return false;
};
