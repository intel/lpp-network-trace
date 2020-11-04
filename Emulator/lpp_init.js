/*
* Copyright (C) 2020 Intel Corporation.
*
* This program is free software; you can redistribute it and/or modify it
* under the terms and conditions of the GNU General Public License,
* version 2, as published by the Free Software Foundation.
*
* This program is distributed in the hope it will be useful, but WITHOUT
* ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
* FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
* more details.
*/

const script = document.createElement('script');
script.type = 'text/javascript';
const code = 'class LppPredictionOptions { downlinkBandwidth; uplinkBandwidth; latency; utilization; power; maxPredictions; linkHandle;}' +
 'class LppSession {options;constructor(options){self = this;};onpredictions(event){};start(){document.body.addEventListener(\'lpp\', function (evt) {self.onpredictions(evt.detail) }, false);};stop(){document.body.removeEventListener(\'lpp\', function (evt) {self.onpredictions(evt.detail) }, false);};}';

try { // doesn't work on ie...
  script.appendChild(document.createTextNode(code));
} catch (e) {
  script.text = code;
}
const s = document.getElementsByTagName('script')[0];
if(typeof(s) !== 'undefined') 
{
	if (typeof(s.parentNode) !== 'undefined') {
		s.parentNode.insertBefore(script, s);
	}
}
