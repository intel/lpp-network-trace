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

let predictionsOld = [];

/**
 *  Assert
 *
 * @param {Object} condition - condition
 * @param {Object} message - message
 * @return {undefined}
 */
function assert(condition, message) {
  if (!condition) {
    message = message || 'Assertion failed';
    if (typeof Error !== 'undefined') {
      throw new Error(message);
    }
    throw message; // Fallback
  }
}

/**
 * Dispatch lpp event if prediction has changed
 *
 * @param {Object[]} time - Array of predicted timestamps
 * @param {Object[]} band - Array of predicted bandwidth
 * @return {undefined}
 */
function LPPDispatchEvent(time, band) { // eslint-disable-line no-unused-vars
  assert(typeof time !== 'undefined' && time !== null, 'time is invalid');
  assert(typeof band !== 'undefined' && band !== null, 'band is invalid');

  const predictions = [];
  
  for (let i = 0; i < time.length; i += 1) {
    const prediction = {
      Prediction_type: 'PREDICTION_TYPE_BANDWIDTH',
      Time: time[i],
      Bandwidth: band[i],
      Variation: '0',
      Probability: '0',
    };

    predictions.push(prediction);
  }

  if ((predictionsOld === 'undefined') || (predictionsOld.length === 0)) {
    predictionsOld = predictions;
    predictions[0].Time  = Math.floor(new Date().getTime() / 1000);
    document.body.dispatchEvent(new CustomEvent('lpp', {
      detail: {predictions},
    }));
    predictionsOld[0].Time  = 0;
  }	
	
  if (JSON.stringify(predictionsOld) !== JSON.stringify(predictions)) {
    predictionsOld = predictions;
    predictions[0].Time  = Math.floor(new Date().getTime() / 1000);
    document.body.dispatchEvent(new CustomEvent('lpp', {
      detail: {predictions},
    }));
    predictionsOld[0].Time  = 0;
  } else if (predictionsOld.length !== predictions.length) {
    predictionsOld = predictions;
    predictions[0].Time  = Math.floor(new Date().getTime() / 1000);
    document.body.dispatchEvent(new CustomEvent('lpp', {
      detail: {predictions},
    }));
    predictionsOld[0].Time  = 0;
  }
}
