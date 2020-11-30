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
import { DEBUG } from './logger.js';
/**
 * Checks condition and throws exception in case it is not fulfilled.
 *
 * @param {boolean} condition
 * @param {string} message
 */

function precondition(condition, message) {
  if (!condition) {
    message = message || 'Assertion failed';

    if (typeof Error !== 'undefined') {
      throw new Error(message);
    }

    throw message; // Fallback
  }
}

let assert = function (condition, message) {};

if (DEBUG === true) {
  assert = precondition;
}
/**
 * Checks if given parameter is a function.
 *
 * @param functionToCheck - function to check
 * @return {boolean} true - given parameter is a function.
 */


function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}
/**
 * @param {string} str
 * @return {number} number of characters in given str
 */


function ucs2length(str) {
  var length = 0;
  var len = str.length;
  var pos = 0;
  var value;

  while (pos < len) {
    length++;
    value = str.charCodeAt(pos++);

    if (value >= 0xD800 && value <= 0xDBFF && pos < len) {
      // high surrogate, and there is a next character
      value = str.charCodeAt(pos);
      if ((value & 0xFC00) === 0xDC00) pos++; // low surrogate
    }
  }

  return length;
}

;
/**
 * Checks whether given stringUrl is valid URL.
 *
 * @param {string} stringURL - URL
 * @return {boolean} true - given stringUrl is valid URL.
 */

function isValidHttpUrl(stringUrl) {
  let url;

  try {
    url = new URL(stringUrl);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

export { precondition, assert, isFunction, ucs2length, isValidHttpUrl };